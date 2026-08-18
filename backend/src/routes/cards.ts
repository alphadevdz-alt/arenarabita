import { FastifyInstance } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../infrastructure/db.js';
import { AuthenticatedRequest, hasRole, requireAuth } from '../http/auth-guard.js';

async function audit(actorUserId: string, action: string, entityType: string, entityId: string, metadata: object = {}) {
  await pool.query('INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, result_status, metadata) VALUES ($1,$2,$3,$4,$5,$6)', [actorUserId, action, entityType, entityId, 'SUCCESS', metadata]);
}

function cardNumber(kind: string) {
  const prefix = kind === 'STUDENT' ? 'STD' : kind === 'COACH' ? 'COA' : 'REP';
  return `NSSMS-${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function verifyEnrollmentCard(reference: string) {
  const hash = createHash('sha256').update(reference.trim().toUpperCase()).digest('hex');
  const result = await pool.query(
    `SELECT card_number,holder_kind,given_name,family_name,discipline,age_category,gender_category,sport_kind,
            season_name,competition_name,institution_name,wilaya_name,status,issued_at
     FROM enrollment_cards WHERE reference_hash=$1 AND status='ISSUED' LIMIT 1`,
    [hash]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    verified: true,
    cardNumber: row.card_number,
    licenseKind: row.holder_kind,
    givenName: row.given_name,
    familyName: row.family_name,
    discipline: row.discipline,
    ageCategory: row.age_category,
    genderCategory: row.gender_category,
    sportKind: row.sport_kind,
    seasonName: row.season_name,
    competitionName: row.competition_name,
    institutionName: row.institution_name,
    wilayaName: row.wilaya_name,
    status: row.status,
    issuedAt: row.issued_at
  };
}

export async function registerCardRoutes(app: FastifyInstance) {
  app.get('/api/v1/admin/participations', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR', 'MEMBER_INSTITUTION_USER'])) return reply.code(403).send({ error: 'forbidden' });
    const query = z.object({ competitionId: z.string().uuid().optional() }).parse(request.query);
    const values: unknown[] = [];
    const where = ['1=1'];
    if (query.competitionId) { values.push(query.competitionId); where.push(`c.id=$${values.length}`); }
    if (req.auth!.institutionId && req.auth!.roles.includes('MEMBER_INSTITUTION_USER')) {
      values.push(req.auth!.institutionId);
      where.push(`i.id=$${values.length}`);
    } else if (req.auth!.wilayaId && !hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR'])) {
      values.push(req.auth!.wilayaId);
      where.push(`o.wilaya_id=$${values.length}`);
    }
    const result = await pool.query(
      `SELECT i.id AS institution_id, i.name AS institution_name, c.id AS competition_id, c.name AS competition_name,
              c.age_category, c.gender_category, c.sport_kind, c.discipline, s.name AS season_name,
              w.ar_name AS wilaya_name, ic.status AS participation_status, ic.coach_name, ic.representative_name,
              count(e.id) FILTER (WHERE e.archived_at IS NULL)::int AS entries,
              count(e.id) FILTER (WHERE e.confirmation_status='CONFIRMED')::int AS confirmed_entries
       FROM educational_institutions i
       JOIN organizations o ON o.id=i.organization_id
       LEFT JOIN wilayas w ON w.id=o.wilaya_id
       JOIN competition_entries e ON e.participant_id IN (SELECT p.id FROM participants p WHERE p.institution_id=i.id) AND e.archived_at IS NULL
       JOIN competitions c ON c.id=e.competition_id
       JOIN seasons s ON s.id=c.season_id
       LEFT JOIN institution_competitions ic ON ic.institution_id=i.id AND ic.competition_id=c.id
       WHERE ${where.join(' AND ')}
       GROUP BY i.id, c.id, s.name, w.ar_name, ic.status, ic.coach_name, ic.representative_name
       ORDER BY c.name, i.name`,
      values
    );
    return { data: result.rows };
  });

  app.post('/api/v1/admin/participations/accept', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR'])) return reply.code(403).send({ error: 'forbidden' });
    const parsed = z.object({
      institutionId: z.string().uuid(),
      competitionId: z.string().uuid(),
      coachName: z.string().min(2).max(160),
      representativeName: z.string().min(2).max(160)
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'validation_error' });
    const result = await pool.query(
      `INSERT INTO institution_competitions(institution_id,competition_id,status,coach_name,representative_name,decided_by,decided_at)
       VALUES ($1,$2,'ACCEPTED',$3,$4,$5,now())
       ON CONFLICT (institution_id,competition_id) DO UPDATE
         SET status='ACCEPTED', coach_name=EXCLUDED.coach_name, representative_name=EXCLUDED.representative_name, decided_by=EXCLUDED.decided_by, decided_at=now()
       RETURNING *`,
      [parsed.data.institutionId, parsed.data.competitionId, parsed.data.coachName, parsed.data.representativeName, req.auth!.userId]
    );
    await audit(req.auth!.userId, 'ACCEPT_INSTITUTION_COMPETITION', 'INSTITUTION', parsed.data.institutionId, { competitionId: parsed.data.competitionId });
    return { data: result.rows[0] };
  });

  app.post('/api/v1/admin/entries/:id/confirm', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR'])) return reply.code(403).send({ error: 'forbidden' });
    const id = z.string().uuid().safeParse((request.params as { id: string }).id);
    const parsed = z.object({ decision: z.enum(['CONFIRMED', 'REJECTED']) }).safeParse(request.body);
    if (!id.success || !parsed.success) return reply.code(400).send({ error: 'validation_error' });
    const result = await pool.query('UPDATE competition_entries SET confirmation_status=$2, updated_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING *', [id.data, parsed.data.decision]);
    if (!result.rowCount) return reply.code(404).send({ error: 'not_found' });
    await audit(req.auth!.userId, 'CONFIRM_ENTRY', 'COMPETITION_ENTRY', id.data, { decision: parsed.data.decision });
    return { data: result.rows[0] };
  });

  app.get('/api/v1/admin/cards', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR', 'MEMBER_INSTITUTION_USER'])) return reply.code(403).send({ error: 'forbidden' });
    const query = z.object({ competitionId: z.string().uuid().optional(), institutionId: z.string().uuid().optional() }).parse(request.query);
    const values: unknown[] = ["ISSUED"];
    const where = ["status=$1"];
    if (query.competitionId) { values.push(query.competitionId); where.push(`competition_id=$${values.length}`); }
    if (query.institutionId) { values.push(query.institutionId); where.push(`institution_id=$${values.length}`); }
    if (req.auth!.institutionId && req.auth!.roles.includes('MEMBER_INSTITUTION_USER')) {
      values.push(req.auth!.institutionId);
      where.push(`institution_id=$${values.length}`);
    }
    const result = await pool.query(`SELECT id,card_number,holder_kind,given_name,family_name,discipline,age_category,gender_category,sport_kind,season_name,competition_name,institution_name,wilaya_name,status,issued_at,competition_id,institution_id FROM enrollment_cards WHERE ${where.join(' AND ')} ORDER BY holder_kind, family_name, given_name`, values);
    return { data: result.rows };
  });

  app.post('/api/v1/admin/cards/issue', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    if (!requireAuth(req, reply)) return;
    if (!hasRole(req, ['SYSTEM_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR'])) return reply.code(403).send({ error: 'forbidden' });
    const parsed = z.object({ institutionId: z.string().uuid(), competitionId: z.string().uuid() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'validation_error' });
    const participation = await pool.query("SELECT * FROM institution_competitions WHERE institution_id=$1 AND competition_id=$2 AND status='ACCEPTED'", [parsed.data.institutionId, parsed.data.competitionId]);
    if (!participation.rowCount) return reply.code(409).send({ error: 'institution_not_accepted' });
    const context = await pool.query(
      `SELECT c.name AS competition_name, c.discipline, c.age_category, c.gender_category, c.sport_kind, s.name AS season_name,
              i.name AS institution_name, w.ar_name AS wilaya_name
       FROM competitions c
       JOIN seasons s ON s.id=c.season_id
       JOIN educational_institutions i ON i.id=$2
       JOIN organizations o ON o.id=i.organization_id
       LEFT JOIN wilayas w ON w.id=o.wilaya_id
       WHERE c.id=$1`,
      [parsed.data.competitionId, parsed.data.institutionId]
    );
    if (!context.rowCount) return reply.code(404).send({ error: 'not_found' });
    const ctx = context.rows[0];
    const students = await pool.query(
      `SELECT p.id, p.given_name, p.family_name FROM competition_entries e
       JOIN participants p ON p.id=e.participant_id
       WHERE e.competition_id=$1 AND p.institution_id=$2 AND e.archived_at IS NULL AND e.confirmation_status='CONFIRMED'`,
      [parsed.data.competitionId, parsed.data.institutionId]
    );
    if (!students.rowCount) return reply.code(409).send({ error: 'no_confirmed_students' });

    const issued: Array<{ id: string; cardNumber: string; holderKind: string; givenName: string; familyName: string; reference: string }> = [];
    const insertCard = async (holderKind: string, givenName: string, familyName: string, participantId: string | null) => {
      const existing = participantId
        ? await pool.query("SELECT id FROM enrollment_cards WHERE competition_id=$1 AND participant_id=$2 AND holder_kind='STUDENT' AND status='ISSUED'", [parsed.data.competitionId, participantId])
        : await pool.query('SELECT id FROM enrollment_cards WHERE competition_id=$1 AND institution_id=$2 AND holder_kind=$3 AND status=$4 AND participant_id IS NULL', [parsed.data.competitionId, parsed.data.institutionId, holderKind, 'ISSUED']);
      if (existing.rowCount) return;
      const number = cardNumber(holderKind);
      const raw = `${number}-${randomBytes(4).toString('hex').toUpperCase()}`;
      const hash = createHash('sha256').update(raw).digest('hex');
      const row = await pool.query(
        `INSERT INTO enrollment_cards(card_number,reference_hash,holder_kind,institution_id,competition_id,participant_id,given_name,family_name,discipline,age_category,gender_category,sport_kind,season_name,competition_name,institution_name,wilaya_name,issued_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
        [number, hash, holderKind, parsed.data.institutionId, parsed.data.competitionId, participantId, givenName, familyName, ctx.discipline, ctx.age_category, ctx.gender_category, ctx.sport_kind, ctx.season_name, ctx.competition_name, ctx.institution_name, ctx.wilaya_name, req.auth!.userId]
      );
      issued.push({ id: row.rows[0].id, cardNumber: number, holderKind, givenName, familyName, reference: raw });
    };

    for (const student of students.rows) {
      await insertCard('STUDENT', student.given_name, student.family_name, student.id);
    }
    const [coachGiven, ...coachRest] = String(participation.rows[0].coach_name).trim().split(/\s+/);
    const [repGiven, ...repRest] = String(participation.rows[0].representative_name).trim().split(/\s+/);
    await insertCard('COACH', coachGiven, coachRest.join(' ') || coachGiven, null);
    await insertCard('INSTITUTION_REPRESENTATIVE', repGiven, repRest.join(' ') || repGiven, null);

    await audit(req.auth!.userId, 'ISSUE_ENROLLMENT_CARDS', 'INSTITUTION', parsed.data.institutionId, { competitionId: parsed.data.competitionId, count: issued.length });
    return reply.code(201).send({ data: issued, printSpec: { format: 'ISO-ID-1 / CR80', widthMm: 85.6, heightMm: 54, sheet: 'A4 8-up' } });
  });
}
