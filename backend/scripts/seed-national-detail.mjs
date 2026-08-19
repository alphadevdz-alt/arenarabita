import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encode = (password) => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
};

const focus = Array.from({ length: 58 }, (_, i) => i + 1);
const portraits = ['/media/players/p01.jpg', '/media/players/p02.jpg', '/media/players/p03.jpg', '/media/players/p04.jpg', '/media/players/p05.jpg', '/media/players/p06.jpg', '/media/players/p07.jpg', '/media/players/p08.jpg'];

try {
  const season = await pool.query("SELECT id FROM seasons WHERE status='ACTIVE' ORDER BY start_date DESC LIMIT 1");
  if (!season.rowCount) throw new Error('Run seed:simulation first to create the active season');
  const seasonId = season.rows[0].id;
  const football = await pool.query("SELECT id FROM competitions WHERE discipline='football' OR name LIKE '%كرة القدم المدرسية%' LIMIT 1");

  for (const wilayaId of focus) {
    const wilaya = await pool.query('SELECT id,name,ar_name FROM wilayas WHERE id=$1', [wilayaId]);
    if (!wilaya.rowCount) continue;
    const label = wilaya.rows[0].ar_name || wilaya.rows[0].name;
    const org = await pool.query(
      `INSERT INTO organizations(name,code,organization_type,wilaya_id)
       VALUES($1,$2,'ASSOCIATION',$3)
       ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,wilaya_id=EXCLUDED.wilaya_id
       RETURNING id`,
      [`الرابطة الولائية للرياضة المدرسية - ${label}`, `WILAYA-${String(wilayaId).padStart(2, '0')}`, wilayaId]
    );
    const daira = await pool.query('SELECT id FROM dairas WHERE wilaya_id=$1 ORDER BY id LIMIT 1', [wilayaId]);
    const dairaId = daira.rows[0]?.id ?? null;
    const schools = await pool.query(
      `SELECT id,name,name_ar,name_fr,commune_name FROM school_directory
       WHERE wilaya_id=$1 AND cycle='secondaire' AND name IS NOT NULL
       ORDER BY name LIMIT 1`,
      [wilayaId]
    );

    const adminUser = `demo.w${String(wilayaId).padStart(2, '0')}.admin`;
    const user = await pool.query(
      `INSERT INTO users(username,display_name,password_hash,status,organization_id,daira_id)
       VALUES($1,$2,$3,'ACTIVE',$4,$5)
       ON CONFLICT(username) DO UPDATE SET display_name=EXCLUDED.display_name,password_hash=EXCLUDED.password_hash,organization_id=EXCLUDED.organization_id,status='ACTIVE'
       RETURNING id`,
      [adminUser, `مدير رابطة ${label}`, encode('NssmsWilayaAdmin-2026!'), org.rows[0].id, dairaId]
    );
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='ASSOCIATION_ADMINISTRATOR' ON CONFLICT DO NOTHING", [user.rows[0].id]);

    const repUser = `demo.w${String(wilayaId).padStart(2, '0')}.rep`;
    const rep = await pool.query(
      `INSERT INTO users(username,display_name,password_hash,status,organization_id,daira_id)
       VALUES($1,$2,$3,'ACTIVE',$4,$5)
       ON CONFLICT(username) DO UPDATE SET display_name=EXCLUDED.display_name,password_hash=EXCLUDED.password_hash,organization_id=EXCLUDED.organization_id,status='ACTIVE'
       RETURNING id`,
      [repUser, `ممثل رابطة ${label}`, encode('NssmsWilayaRep-2026!'), org.rows[0].id, dairaId]
    );
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='ASSOCIATION_REPRESENTATIVE' ON CONFLICT DO NOTHING", [rep.rows[0].id]);

    const dairaUser = `demo.w${String(wilayaId).padStart(2, '0')}.daira`;
    const officer = await pool.query(
      `INSERT INTO users(username,display_name,password_hash,status,organization_id,daira_id)
       VALUES($1,$2,$3,'ACTIVE',$4,$5)
       ON CONFLICT(username) DO UPDATE SET display_name=EXCLUDED.display_name,password_hash=EXCLUDED.password_hash,organization_id=EXCLUDED.organization_id,daira_id=EXCLUDED.daira_id,status='ACTIVE'
       RETURNING id`,
      [dairaUser, `ممثل دائرة ${label}`, encode('NssmsWilayaDaira-2026!'), org.rows[0].id, dairaId]
    );
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='DAIRA_OFFICER' ON CONFLICT DO NOTHING", [officer.rows[0].id]);

    let schoolIndex = 0;
    for (const school of schools.rows) {
      const inst = await pool.query(
        `INSERT INTO educational_institutions(organization_id,name,code,daira_id)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(organization_id,code) DO UPDATE SET name=EXCLUDED.name,daira_id=EXCLUDED.daira_id
         RETURNING id`,
        [org.rows[0].id, school.name_ar || school.name || school.name_fr, school.id, dairaId]
      );
      const schoolUser = `demo.w${String(wilayaId).padStart(2, '0')}.school`;
      const instUser = await pool.query(
        `INSERT INTO users(username,display_name,password_hash,status,organization_id,institution_id,daira_id)
         VALUES($1,$2,$3,'ACTIVE',$4,$5,$6)
         ON CONFLICT(username) DO UPDATE SET display_name=EXCLUDED.display_name,password_hash=EXCLUDED.password_hash,organization_id=EXCLUDED.organization_id,institution_id=EXCLUDED.institution_id,daira_id=EXCLUDED.daira_id,status='ACTIVE'
         RETURNING id`,
        [schoolUser, `مسؤول ${school.name_ar || school.name || school.name_fr}`, encode('NssmsWilayaSchool-2026!'), org.rows[0].id, inst.rows[0].id, dairaId]
      );
      await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='MEMBER_INSTITUTION_USER' ON CONFLICT DO NOTHING", [instUser.rows[0].id]);
      const teamName = `فريق ${label} ${schoolIndex + 1}`;
      const team = await pool.query(
        `INSERT INTO teams(institution_id,name,alias,sport_kind,discipline,motto,crest_color,image_url)
         VALUES($1,$2,$3,'TEAM','football',$4,$5,'/media/football.jpg')
         ON CONFLICT(name) DO UPDATE SET motto=EXCLUDED.motto
         RETURNING id`,
        [inst.rows[0].id, teamName, `W${wilayaId}-T${schoolIndex + 1}`, `تمثيل ${label} بشرف`, schoolIndex % 2 ? '#b42318' : '#0f6b4a']
      );
      for (let n = 0; n < 2; n += 1) {
        const alias = `نجم-${wilayaId}-${schoolIndex}-${n + 1}`;
        const participant = await pool.query(
          `INSERT INTO participants(institution_id,given_name,family_name,status,public_alias,portrait_url,jersey_number,position_label)
           SELECT $1,$2,'مستعار','ACTIVE',$3,$4,$5,$6
           WHERE NOT EXISTS (SELECT 1 FROM participants WHERE public_alias=$3)
           RETURNING id`,
          [inst.rows[0].id, `تلميذ`, alias, portraits[(wilayaId + schoolIndex + n) % portraits.length], 7 + n, n ? 'دفاع' : 'هجوم']
        );
        const pid = participant.rows[0]?.id ?? (await pool.query('SELECT id FROM participants WHERE public_alias=$1', [alias])).rows[0].id;
        await pool.query('INSERT INTO team_members(team_id,participant_id,role_label) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [team.rows[0].id, pid, 'أساسي']);
        if (football.rowCount) {
          await pool.query(
            `INSERT INTO results(competition_id,participant_id,result_data,status)
             SELECT $1,$2,$3::jsonb,'ACTIVE'
             WHERE NOT EXISTS (SELECT 1 FROM results WHERE competition_id=$1 AND participant_id=$2)`,
            [football.rows[0].id, pid, JSON.stringify({ place: (n + 1), medal: n ? 'فضة' : 'ذهب', score: `${2 + schoolIndex}-${1 + n}`, note: `تجمع ${label}` })]
          );
        }
      }
      schoolIndex += 1;
    }
    console.log(`wilaya ${wilayaId} ${label} schools=${schools.rowCount}`);
  }

  await pool.query(
    `INSERT INTO announcements(title,body,status,published_at,image_url)
     SELECT $1,$2,'ACTIVE',now(),$3
     WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title=$1)`,
    [
      'محاكاة وطنية لعشر ولايات',
      'أُدرجت رابطات ومؤسسات ثانوية حقيقية من دليل GeoAlgeria في عشر ولايات، مع فرق بأسماء مستعارة ونتائج تجميعية للجمهور.',
      '/media/season-open.jpg'
    ]
  );
  console.log('national detail seed complete');
} finally {
  await pool.end();
}
