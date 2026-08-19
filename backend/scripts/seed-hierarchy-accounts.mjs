import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const hash = (() => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync('NssmsHierarchy-2026!', salt, 64).toString('hex')}`;
})();

const sports = [
  ['football', 'ذكور · ثانوي'],
  ['basketball', 'إناث · ثانوي'],
  ['volleyball', 'مختلط · ثانوي'],
  ['handball', 'ذكور · متوسط'],
  ['athletics', 'فردي · ثانوي'],
  ['swimming', 'مختلط · متوسط'],
  ['judo', 'إناث · متوسط'],
  ['futsal', 'ذكور · ثانوي'],
  ['table-tennis', 'فردي · مختلط'],
  ['chess', 'فردي · ثانوي']
];

try {
  const wilayas = (await pool.query('SELECT id, ar_name, name FROM wilayas ORDER BY id')).rows;
  const dairas = (await pool.query('SELECT id, wilaya_id, ar_name, name FROM dairas ORDER BY wilaya_id, id')).rows;
  let createdUsers = 0;
  let createdInstitutions = 0;

  for (const wilaya of wilayas) {
    const code = `WILAYA-${String(wilaya.id).padStart(2, '0')}`;
    const org = await pool.query(
      `INSERT INTO organizations(name,code,organization_type,wilaya_id)
       VALUES($1,$2,'ASSOCIATION',$3)
       ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,wilaya_id=EXCLUDED.wilaya_id
       RETURNING id`,
      [`الرابطة الولائية للرياضة المدرسية - ${wilaya.ar_name || wilaya.name}`, code, wilaya.id]
    );
    const adminName = `demo.w${String(wilaya.id).padStart(2, '0')}.admin`;
    const admin = await pool.query(
      `INSERT INTO users(username,display_name,password_hash,status,organization_id)
       VALUES($1,$2,$3,'ACTIVE',$4)
       ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash,organization_id=EXCLUDED.organization_id,status='ACTIVE'
       RETURNING id`,
      [adminName, `مدير رابطة ${wilaya.ar_name || wilaya.name}`, hash, org.rows[0].id]
    );
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='ASSOCIATION_ADMINISTRATOR' ON CONFLICT DO NOTHING", [admin.rows[0].id]);
    createdUsers += 1;
  }

  for (const daira of dairas) {
    const org = await pool.query("SELECT id FROM organizations WHERE code=$1", [`WILAYA-${String(daira.wilaya_id).padStart(2, '0')}`]);
    if (!org.rowCount) continue;
    const username = `demo.d${daira.id}`;
    const user = await pool.query(
      `INSERT INTO users(username,display_name,password_hash,status,organization_id,daira_id)
       VALUES($1,$2,$3,'ACTIVE',$4,$5)
       ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash,organization_id=EXCLUDED.organization_id,daira_id=EXCLUDED.daira_id,status='ACTIVE'
       RETURNING id`,
      [username, `ممثل دائرة ${daira.ar_name || daira.name}`, hash, org.rows[0].id, daira.id]
    );
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='DAIRA_OFFICER' ON CONFLICT DO NOTHING", [user.rows[0].id]);
    createdUsers += 1;
  }

  for (const wilaya of wilayas) {
    const org = await pool.query("SELECT id FROM organizations WHERE code=$1", [`WILAYA-${String(wilaya.id).padStart(2, '0')}`]);
    if (!org.rowCount) continue;
    const localDairas = dairas.filter((d) => d.wilaya_id === wilaya.id);
    const schools = (await pool.query(
      `SELECT id,name,name_ar,name_fr,commune_name FROM school_directory
       WHERE wilaya_id=$1 AND name IS NOT NULL
       ORDER BY CASE cycle WHEN 'secondaire' THEN 0 WHEN 'moyen' THEN 1 ELSE 2 END, name
       LIMIT 10`,
      [wilaya.id]
    )).rows;

    for (let i = 0; i < 10; i += 1) {
      const school = schools[i];
      const daira = localDairas[i % Math.max(localDairas.length, 1)] ?? null;
      const [discipline, category] = sports[i];
      const name = school ? (school.name_ar || school.name || school.name_fr) : `مؤسسة ${wilaya.ar_name || wilaya.name} ${i + 1}`;
      const code = school?.id ?? `W${wilaya.id}-I${i + 1}`;
      const inst = await pool.query(
        `INSERT INTO educational_institutions(organization_id,name,code,daira_id,sport_discipline,sport_category)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(organization_id,code) DO UPDATE SET name=EXCLUDED.name,daira_id=EXCLUDED.daira_id,sport_discipline=EXCLUDED.sport_discipline,sport_category=EXCLUDED.sport_category
         RETURNING id`,
        [org.rows[0].id, name, code, daira?.id ?? null, discipline, category]
      );
      const username = `demo.w${String(wilaya.id).padStart(2, '0')}.i${String(i + 1).padStart(2, '0')}`;
      const user = await pool.query(
        `INSERT INTO users(username,display_name,password_hash,status,organization_id,institution_id,daira_id)
         VALUES($1,$2,$3,'ACTIVE',$4,$5,$6)
         ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash,organization_id=EXCLUDED.organization_id,institution_id=EXCLUDED.institution_id,daira_id=EXCLUDED.daira_id,status='ACTIVE'
         RETURNING id`,
        [username, `مسؤول ${name}`, hash, org.rows[0].id, inst.rows[0].id, daira?.id ?? null]
      );
      await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='MEMBER_INSTITUTION_USER' ON CONFLICT DO NOTHING", [user.rows[0].id]);
      createdUsers += 1;
      createdInstitutions += 1;
    }
    console.log(`wilaya ${wilaya.id} institutions=10 dairas=${localDairas.length}`);
  }

  console.log(`hierarchy accounts ready users+=${createdUsers} institutions=${createdInstitutions} password=NssmsHierarchy-2026!`);
} finally {
  await pool.end();
}
