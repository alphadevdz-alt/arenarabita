import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const encode = (password) => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
};

const accounts = [
  ['demo.admin', 'إداري النظام التجريبي', 'NssmsDemoAdmin-2026!', 'SYSTEM_ADMINISTRATOR'],
  ['demo.national', 'إداري وطني تجريبي', 'NssmsDemoNational-2026!', 'NATIONAL_ADMINISTRATOR'],
  ['demo.association.admin', 'مدير رابطة سطيف', 'NssmsAssocAdmin-2026!', 'ASSOCIATION_ADMINISTRATOR'],
  ['demo.association.rep', 'ممثل رابطة سطيف', 'NssmsAssocRep-2026!', 'ASSOCIATION_REPRESENTATIVE'],
  ['demo.daira.officer', 'موظف دائرة سطيف', 'NssmsDairaOff-2026!', 'DAIRA_OFFICER'],
  ['demo.institution', 'مسؤول ثانوية الشهيد', 'NssmsInstitution-2026!', 'MEMBER_INSTITUTION_USER']
];

try {
  await pool.query("INSERT INTO wilayas(id,name,ar_name) VALUES (19,'Setif','سطيف') ON CONFLICT (id) DO UPDATE SET ar_name=EXCLUDED.ar_name");
  await pool.query("INSERT INTO dairas(id,wilaya_id,name,ar_name) VALUES (1901,19,'Setif','دائرة سطيف') ON CONFLICT (id) DO UPDATE SET ar_name=EXCLUDED.ar_name");

  const association = await pool.query(
    `INSERT INTO organizations(name,code,organization_type,wilaya_id)
     VALUES ('الرابطة الولائية للرياضة المدرسية - سطيف','WILAYA-19','ASSOCIATION',19)
     ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,organization_type='ASSOCIATION',wilaya_id=19
     RETURNING id`
  );
  const institution = await pool.query(
    `INSERT INTO educational_institutions(organization_id,name,code,daira_id)
     VALUES ($1,'ثانوية الشهيد فرحات عباس','SETIF-LYC-01',1901)
     ON CONFLICT(organization_id,code) DO UPDATE SET name=EXCLUDED.name,daira_id=1901
     RETURNING id`,
    [association.rows[0].id]
  );

  const userIds = {};
  for (const [username, displayName, password, role] of accounts) {
    const institutionId = role === 'MEMBER_INSTITUTION_USER' ? institution.rows[0].id : null;
    const dairaId = role === 'DAIRA_OFFICER' ? 1901 : role === 'MEMBER_INSTITUTION_USER' ? 1901 : null;
    const orgId = ['SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR'].includes(role) ? null : association.rows[0].id;
    const user = await pool.query(
      `INSERT INTO users(username,display_name,password_hash,status,organization_id,institution_id,daira_id)
       VALUES ($1,$2,$3,'ACTIVE',$4,$5,$6)
       ON CONFLICT(username) DO UPDATE SET display_name=EXCLUDED.display_name,password_hash=EXCLUDED.password_hash,status='ACTIVE',organization_id=EXCLUDED.organization_id,institution_id=EXCLUDED.institution_id,daira_id=EXCLUDED.daira_id
       RETURNING id`,
      [username, displayName, encode(password), orgId, institutionId, dairaId]
    );
    await pool.query('INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name=$2 ON CONFLICT DO NOTHING', [user.rows[0].id, role]);
    userIds[username] = user.rows[0].id;
    console.log(`account ${username}`);
  }

  const season = await pool.query(
    `INSERT INTO seasons(name,start_date,end_date,status)
     SELECT 'الموسم المدرسي 2025-2026','2025-09-01','2026-06-30','ACTIVE'
     WHERE NOT EXISTS (SELECT 1 FROM seasons WHERE name='الموسم المدرسي 2025-2026')
     RETURNING id`
  );
  const seasonId = season.rows[0]?.id ?? (await pool.query("SELECT id FROM seasons WHERE name='الموسم المدرسي 2025-2026'")).rows[0].id;

  const competitions = [
    ['ألعاب القوى المدرسية - سطيف', 'REGISTRATION', '/media/athletics.jpg', 'سباقات السرعة والتتابع لتلاميذ الثانويات.'],
    ['كرة القدم المدرسية الولائية', 'ACTIVE', '/media/football.jpg', 'دور مجموعات بين المؤسسات المنخرطة.'],
    ['كرة السلة الإناث', 'RESULTS', '/media/basketball.jpg', 'نهائيات البطولة الولائية للإناث.']
  ];
  const competitionIds = [];
  for (const [name, status, imageUrl, summary] of competitions) {
    const row = await pool.query(
      `INSERT INTO competitions(season_id,name,status,start_date,end_date,image_url,summary)
       SELECT $1,$2,$3::competition_status,'2026-02-01','2026-05-30',$4,$5
       WHERE NOT EXISTS (SELECT 1 FROM competitions WHERE name=$2)
       RETURNING id`,
      [seasonId, name, status, imageUrl, summary]
    );
    const id = row.rows[0]?.id ?? (await pool.query('SELECT id FROM competitions WHERE name=$1', [name])).rows[0].id;
    await pool.query('UPDATE competitions SET image_url=$2,summary=$3,status=$4::competition_status WHERE id=$1', [id, imageUrl, summary, status]);
    competitionIds.push(id);
    console.log(`competition ${name}`);
  }

  const names = [['أمين', 'بوخالفة'], ['ياسمين', 'مرابط'], ['رياض', 'بن عيسى'], ['هدى', 'قاسمي']];
  const participantIds = [];
  for (const [given, family] of names) {
    const row = await pool.query(
      `INSERT INTO participants(institution_id,given_name,family_name,status)
       SELECT $1,$2,$3,'ACTIVE'
       WHERE NOT EXISTS (SELECT 1 FROM participants WHERE institution_id=$1 AND given_name=$2 AND family_name=$3)
       RETURNING id`,
      [institution.rows[0].id, given, family]
    );
    participantIds.push(row.rows[0]?.id ?? (await pool.query('SELECT id FROM participants WHERE institution_id=$1 AND given_name=$2 AND family_name=$3', [institution.rows[0].id, given, family])).rows[0].id);
  }

  for (const participantId of participantIds) {
    await pool.query(
      `INSERT INTO competition_entries(competition_id,participant_id)
       VALUES ($1,$2) ON CONFLICT (competition_id,participant_id) DO NOTHING`,
      [competitionIds[0], participantId]
    );
  }

  const license = await pool.query(
    `INSERT INTO sports_licenses(participant_id,status,issued_at,expires_at)
     SELECT $1,'ACTIVE',now(),'2026-12-31'
     WHERE NOT EXISTS (SELECT 1 FROM sports_licenses WHERE participant_id=$1)
     RETURNING id`,
    [participantIds[0]]
  );
  if (license.rows[0]) {
    const { createVerificationReference, hashVerificationReference } = await import('../dist/services/verification.js').catch(async () => {
      const { createHash, randomBytes: rb } = await import('node:crypto');
      return {
        createVerificationReference: () => rb(24).toString('base64url'),
        hashVerificationReference: (value) => createHash('sha256').update(value).digest('hex')
      };
    });
    const reference = createVerificationReference();
    await pool.query('INSERT INTO qr_verifications(license_id,reference_hash) VALUES($1,$2) ON CONFLICT DO NOTHING', [license.rows[0].id, hashVerificationReference(reference)]);
    console.log(`license_reference ${reference}`);
  }

  await pool.query(
    `INSERT INTO results(competition_id,participant_id,result_data,status)
     SELECT $1,$2,'{"place":1,"note":"ذهبية سباق 100م"}'::jsonb,'ACTIVE'
     WHERE NOT EXISTS (SELECT 1 FROM results WHERE competition_id=$1 AND participant_id=$2)`,
    [competitionIds[2], participantIds[1]]
  );

  const announcements = [
    ['افتتاح الموسم الرياضي المدرسي', 'تعلن الرابطة الولائية بسطيف عن افتتاح الموسم 2025-2026 وفق الرزنامة الوطنية.', '/media/season-open.jpg'],
    ['إعلان منافسات ألعاب القوى', 'التسجيل مفتوح لمؤسسات الولاية في سباقات السرعة والتتابع حتى نهاية الشهر.', '/media/athletics.jpg'],
    ['نتائج كرة السلة الإناث', 'نُشرت النتائج المعتمدة لنهائيات كرة السلة المدرسية للإناث.', '/media/basketball.jpg']
  ];
  for (const [title, body, imageUrl] of announcements) {
    await pool.query(
      `INSERT INTO announcements(title,body,status,published_at,image_url)
       SELECT $1,$2,'ACTIVE',now(),$3
       WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title=$1)`,
      [title, body, imageUrl]
    );
  }

  await pool.query(
    'INSERT INTO audit_logs(actor_user_id,action,entity_type,result_status,metadata) VALUES($1,$2,$3,$4,$5)',
    [userIds['demo.national'], 'SIMULATION_SEED', 'SYSTEM', 'SUCCESS', JSON.stringify({ wilaya: 19 })]
  );
  console.log('simulation seed complete');
} finally {
  await pool.end();
}
