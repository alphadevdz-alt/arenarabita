import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../infrastructure/db.js';
import { AuthenticatedRequest, canAccessResource, hasRole, requireAuth } from '../http/auth-guard.js';
import { createVerificationReference, hashVerificationReference } from '../services/verification.js';
import { assertTransition } from '../domain/lifecycle.js';

async function audit(actorUserId: string, action: string, entityType: string, entityId: string, metadata: object = {}) {
  await pool.query('INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, result_status, metadata) VALUES ($1,$2,$3,$4,$5,$6)', [actorUserId, action, entityType, entityId, 'SUCCESS', metadata]);
}

export async function registerOperationRoutes(app: FastifyInstance) {
  app.get('/api/v1/public/enrollment/verify/:reference', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    return reply.code(401).send({ error: 'staff_only_verification' });
  });

  app.get('/api/v1/public/announcements', async () => {
    const result = await pool.query("SELECT id,title,body,image_url,published_at FROM announcements WHERE status='ACTIVE' AND archived_at IS NULL ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT 50");
    return { data: result.rows };
  });

  app.get('/api/v1/public/teams', async () => {
    const result = await pool.query("SELECT t.id,t.name,t.alias,t.discipline,t.motto,t.crest_color,t.image_url,count(tm.participant_id)::int AS roster FROM teams t LEFT JOIN team_members tm ON tm.team_id=t.id WHERE t.archived_at IS NULL AND t.status='ACTIVE' GROUP BY t.id ORDER BY t.name");
    return { data: result.rows };
  });

  app.get('/api/v1/public/teams/:id', async (request, reply) => {
    const id = z.string().uuid().safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'validation_error' });
    const team = await pool.query("SELECT id,name,alias,discipline,motto,crest_color,image_url FROM teams WHERE id=$1 AND archived_at IS NULL", [id.data]);
    if (!team.rowCount) return reply.code(404).send({ error: 'not_found' });
    const members = await pool.query("SELECT p.id,p.public_alias,p.portrait_url,p.jersey_number,p.position_label FROM team_members tm JOIN participants p ON p.id=tm.participant_id WHERE tm.team_id=$1 ORDER BY p.jersey_number NULLS LAST", [id.data]);
    return { data: { ...team.rows[0], members: members.rows } };
  });

  app.get('/api/v1/public/players/:id', async (request, reply) => {
    const id = z.string().uuid().safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'validation_error' });
    const player = await pool.query("SELECT p.id,p.public_alias,p.portrait_url,p.jersey_number,p.position_label,t.name AS team_name,t.alias AS team_alias,t.id AS team_id FROM participants p LEFT JOIN team_members tm ON tm.participant_id=p.id LEFT JOIN teams t ON t.id=tm.team_id WHERE p.id=$1 AND p.archived_at IS NULL", [id.data]);
    if (!player.rowCount) return reply.code(404).send({ error: 'not_found' });
    const honors = await pool.query('SELECT honor_type,title,detail,awarded_on FROM honors WHERE participant_id=$1 ORDER BY awarded_on DESC NULLS LAST', [id.data]);
    return { data: { ...player.rows[0], honors: honors.rows } };
  });

  app.get('/api/v1/public/honors', async () => {
    const result = await pool.query("SELECT h.id,h.honor_type,h.title,h.detail,h.awarded_on,p.public_alias,p.portrait_url,c.name AS competition_name FROM honors h LEFT JOIN participants p ON p.id=h.participant_id LEFT JOIN competitions c ON c.id=h.competition_id ORDER BY h.awarded_on DESC NULLS LAST LIMIT 40");
    return { data: result.rows };
  });

  app.get('/api/v1/public/records', async () => {
    const result = await pool.query('SELECT id,discipline,record_label,record_value,holder_alias,season_name FROM sport_records ORDER BY discipline,record_label');
    return { data: result.rows };
  });

  app.get('/api/v1/public/scoreboard', async () => {
    const result = await pool.query("SELECT r.id,c.name AS competition_name,c.image_url,p.public_alias,p.portrait_url,r.result_data,r.created_at FROM results r JOIN competitions c ON c.id=r.competition_id LEFT JOIN participants p ON p.id=r.participant_id WHERE r.status='ACTIVE' AND r.archived_at IS NULL AND c.status IN ('RESULTS','CLOSED','ACTIVE') ORDER BY r.created_at DESC LIMIT 30");
    return { data: result.rows };
  });

  app.get('/api/v1/public/seasons/:id', async (request, reply) => {
    const id = z.string().uuid().safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'validation_error' });
    const result = await pool.query("SELECT id,name,start_date,end_date,status FROM seasons WHERE id=$1 AND archived_at IS NULL AND status IN ('ACTIVE','CLOSED')", [id.data]);
    if (!result.rowCount) return reply.code(404).send({ error: 'not_found' });
    return { data: result.rows[0] };
  });

  app.get('/api/v1/public/competitions/:id', async (request, reply) => {
    const id = z.string().uuid().safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'validation_error' });
    const result = await pool.query("SELECT c.id,c.name,c.status,c.start_date,c.end_date,s.name AS season_name FROM competitions c JOIN seasons s ON s.id=c.season_id WHERE c.id=$1 AND c.archived_at IS NULL AND c.status IN ('REGISTRATION','ACTIVE','RESULTS','CLOSED')", [id.data]);
    if (!result.rowCount) return reply.code(404).send({ error: 'not_found' });
    return { data: result.rows[0] };
  });

  app.get('/api/v1/admin/announcements', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR'])) return reply.code(403).send({ error: 'forbidden' });
    const result = await pool.query('SELECT id,title,body,status,published_at,created_at FROM announcements WHERE archived_at IS NULL ORDER BY created_at DESC');
    return { data: result.rows };
  });

  app.post('/api/v1/admin/announcements', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR'])) return reply.code(403).send({ error: 'forbidden' });
    const parsed = z.object({ title: z.string().min(2).max(200), body: z.string().min(2).max(4000), publish: z.boolean().optional() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'validation_error' });
    const result = await pool.query("INSERT INTO announcements(title,body,status,published_at) VALUES($1,$2,'ACTIVE',$3) RETURNING *", [parsed.data.title, parsed.data.body, parsed.data.publish === false ? null : new Date()]);
    await audit(req.auth!.userId, 'CREATE', 'ANNOUNCEMENT', result.rows[0].id);
    return reply.code(201).send({ data: result.rows[0] });
  });

  app.post('/api/v1/admin/announcements/:id/archive', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR'])) return reply.code(403).send({ error: 'forbidden' });
    const id = z.string().uuid().safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'validation_error' });
    const result = await pool.query("UPDATE announcements SET status='ARCHIVED',archived_at=now(),updated_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING id", [id.data]);
    if (!result.rowCount) return reply.code(404).send({ error: 'not_found' });
    await audit(req.auth!.userId, 'ARCHIVE', 'ANNOUNCEMENT', id.data);
    return { success: true };
  });

  app.get('/api/v1/admin/entries', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    const query = z.object({ competitionId: z.string().uuid().optional() }).parse(request.query);
    const values: unknown[] = [];
    const where = ['e.archived_at IS NULL'];
    if (query.competitionId) { values.push(query.competitionId); where.push(`e.competition_id=$${values.length}`); }
    const result = await pool.query(`SELECT e.id,e.competition_id,e.participant_id,e.status,e.confirmation_status,c.name AS competition_name,p.given_name,p.family_name,p.institution_id,i.name AS institution_name FROM competition_entries e JOIN competitions c ON c.id=e.competition_id JOIN participants p ON p.id=e.participant_id JOIN educational_institutions i ON i.id=p.institution_id WHERE ${where.join(' AND ')} ORDER BY e.created_at DESC`, values);
    return { data: result.rows };
  });

  app.post('/api/v1/admin/entries', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR', 'MEMBER_INSTITUTION_USER'])) return reply.code(403).send({ error: 'forbidden' });
    const parsed = z.object({ competitionId: z.string().uuid(), participantId: z.string().uuid() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'validation_error' });
    if (!(await canAccessResource(req, 'participant', parsed.data.participantId))) return reply.code(403).send({ error: 'forbidden' });
    const competition = await pool.query("SELECT id,status FROM competitions WHERE id=$1 AND archived_at IS NULL", [parsed.data.competitionId]);
    if (!competition.rowCount) return reply.code(404).send({ error: 'competition_not_found' });
    if (!['REGISTRATION', 'ACTIVE'].includes(competition.rows[0].status)) return reply.code(409).send({ error: 'competition_not_open_for_entry' });
    try {
      const result = await pool.query('INSERT INTO competition_entries(competition_id,participant_id) VALUES($1,$2) RETURNING *', [parsed.data.competitionId, parsed.data.participantId]);
      await audit(req.auth!.userId, 'CREATE', 'COMPETITION_ENTRY', result.rows[0].id);
      return reply.code(201).send({ data: result.rows[0] });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') return reply.code(409).send({ error: 'already_entered' });
      throw error;
    }
  });

  app.post('/api/v1/admin/licenses/applications', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR', 'MEMBER_INSTITUTION_USER'])) return reply.code(403).send({ error: 'forbidden' });
    const parsed = z.object({ participantId: z.string().uuid() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'validation_error' });
    if (!(await canAccessResource(req, 'participant', parsed.data.participantId))) return reply.code(403).send({ error: 'forbidden' });
    const result = await pool.query("INSERT INTO sports_licenses(participant_id,status) VALUES($1,'APPLICATION') RETURNING *", [parsed.data.participantId]);
    await audit(req.auth!.userId, 'APPLY', 'LICENSE', result.rows[0].id);
    return reply.code(201).send({ data: result.rows[0] });
  });

  app.post('/api/v1/admin/licenses/:id/issue-reference', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR'])) return reply.code(403).send({ error: 'forbidden' });
    const id = z.string().uuid().safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'validation_error' });
    if (!(await canAccessResource(req, 'license', id.data))) return reply.code(403).send({ error: 'forbidden' });
    const current = await pool.query('SELECT status FROM sports_licenses WHERE id=$1 AND archived_at IS NULL', [id.data]);
    if (!current.rowCount) return reply.code(404).send({ error: 'not_found' });
    try { assertTransition('license', current.rows[0].status, 'ISSUED'); } catch { /* allow already issued */ }
    if (!['APPROVAL', 'ISSUED', 'ACTIVE'].includes(current.rows[0].status) && current.rows[0].status !== 'ISSUED') {
      if (current.rows[0].status !== 'APPROVAL') return reply.code(409).send({ error: 'license_not_ready_to_issue' });
    }
    if (current.rows[0].status === 'APPROVAL') {
      await pool.query("UPDATE sports_licenses SET status='ISSUED',issued_at=COALESCE(issued_at,now()),updated_at=now() WHERE id=$1", [id.data]);
    }
    const existing = await pool.query('SELECT id FROM qr_verifications WHERE license_id=$1 AND revoked_at IS NULL', [id.data]);
    if (existing.rowCount) return reply.code(409).send({ error: 'reference_already_issued' });
    const reference = createVerificationReference();
    await pool.query('INSERT INTO qr_verifications(license_id,reference_hash) VALUES($1,$2)', [id.data, hashVerificationReference(reference)]);
    await audit(req.auth!.userId, 'ISSUE_REFERENCE', 'LICENSE', id.data);
    return { verificationReference: reference };
  });
}
