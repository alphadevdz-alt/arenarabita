import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const given = ['ريان', 'أنس', 'لينة', 'هديل', 'مهدي', 'سندس', 'أيوب', 'مريم', 'فارس', 'ياسمين', 'أمين', 'هدى', 'وسيم', 'إيناس', 'بلال', 'سيرين', 'نسيم', 'ملاك'];
const family = ['الهضاب', 'الأطلس', 'العلمة', 'بوعنداس', 'قجال', 'بابور', 'عموشة', 'أرنات', 'ولمان', 'ورتيلان', 'قنزات', 'ماوكلان', 'صالح باي', 'القرقور', 'السخنة'];
const positions = ['صانع ألعاب', 'هجوم', 'دفاع', 'محور', 'جناح', 'حراسة', 'وثب', 'سرعة', 'وزن خفيف', 'سباحة حرة'];
const TARGET = 18;

function pick(list, n) {
  return list[n % list.length];
}

try {
  const institutions = (await pool.query(
    `SELECT i.id, i.name, i.code FROM educational_institutions i
     JOIN organizations o ON o.id=i.organization_id
     WHERE o.wilaya_id=19 AND i.archived_at IS NULL
     ORDER BY i.code`
  )).rows;

  let added = 0;
  for (const inst of institutions) {
    const current = await pool.query('SELECT count(*)::int AS n FROM participants WHERE institution_id=$1 AND archived_at IS NULL', [inst.id]);
    const need = Math.max(0, TARGET - current.rows[0].n);
    for (let i = 0; i < need; i += 1) {
      const idx = current.rows[0].n + i + 1;
      const alias = `${pick(given, idx * 3 + inst.code.length)} ${pick(family, idx * 7 + inst.name.length)} ${inst.code.slice(-2)}-${idx}`;
      const givenName = pick(given, idx * 5);
      const familyName = pick(family, idx * 11);
      const year = 2008 + (idx % 8);
      const month = String((idx % 12) + 1).padStart(2, '0');
      const day = String((idx % 27) + 1).padStart(2, '0');
      await pool.query(
        `INSERT INTO participants(institution_id,given_name,family_name,date_of_birth,status,public_alias,portrait_url,jersey_number,position_label)
         SELECT $1,$2,$3,$4,'ACTIVE',$5,$6,$7,$8
         WHERE NOT EXISTS (SELECT 1 FROM participants WHERE public_alias=$5)`,
        [inst.id, givenName, familyName, `${year}-${month}-${day}`, alias, `/media/players/p0${(idx % 8) + 1}.jpg`, (idx % 18) + 1, pick(positions, idx)]
      );
      added += 1;
    }
  }
  const total = await pool.query(
    `SELECT count(p.id)::int AS n FROM participants p
     JOIN educational_institutions i ON i.id=p.institution_id
     JOIN organizations o ON o.id=i.organization_id
     WHERE o.wilaya_id=19 AND p.archived_at IS NULL`
  );
  console.log(`rosters filled added=${added} setifParticipants=${total.rows[0].n} targetPerInstitution=${TARGET}`);
} finally {
  await pool.end();
}
