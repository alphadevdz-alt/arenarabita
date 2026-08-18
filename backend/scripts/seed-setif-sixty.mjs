import { createHash, randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const password = 'NssmsHierarchy-2026!';
const encode = () => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
};
const hashText = (value) => createHash('sha256').update(value).digest('hex');

const prefixes = ['ثانوية', 'متوسطة', 'متقن', 'ملحقة'];
const titles = [
  'أطلس الهضاب', 'نسور العالية', 'شعلة بوعنداس', 'قمر قجال', 'سوسن عين أرنات',
  'برق بابور', 'زمرد بني عزيز', 'صخر بني ورتيلان', 'وادي بوسلام', 'زيتون عموشة',
  'فرسان عين أزال', 'لؤلؤ عين الكبيرة', 'صقر عين ولمان', 'رايات العلمة', 'موج قصر الأبطال',
  'نجمة حمام السخنة', 'غصن جميلة', 'أسد قنزات', 'نسر ماوكلان', 'ياقوت صالح باي',
  'هلال تاشودة', 'سنديان بئر العرش', 'غزالة حمام قرقور', 'فارس أولاد صابر', 'قنديل قلال',
  'سناء الرصفة', 'طود بني فودة', 'إكليل عين لقراج', 'ندى بني شبانة', 'مجد عين الروى',
  'سنا التلة', 'وردة الدهامشة', 'عقاب بوطالب', 'سراج عين عباسة', 'مروج بني محلي',
  'قبة أولاد سي أحمد', 'نسيم تيزي نبشار', 'درة عين الحجر', 'شمس بني فودة', 'فجر سطيف',
  'إرث نوفمبر', 'راية الشهداء', 'جبل يسر', 'وادي الذهب', 'سهل التافنة',
  'هضبة الحضنة', 'عين الفجر', 'برج الأطلس', 'واحة الملعب', 'قصر الرياضة',
  'مدرسة الأمل', 'أكاديمية النور', 'معهد الفتوة', 'دار الهمّة', 'منارة الشباب',
  'كتيبة الملعب', 'جوقة الميدان', 'رابط العهد', 'صفّ الوفاء', 'جيل الاستقلال'
];

const aliases = [
  'نسر الهضاب', 'شعلة العالية', 'برق سطيف', 'نجمة بوعنداس', 'أسد قجال',
  'ياقوت الأطلس', 'قطرة الذهب', 'زهرة الملعب', 'صقر العلمة', 'غزال بابور',
  'هلال عموشة', 'سوسن أرنات', 'فارس ولمان', 'لؤلؤ أزال', 'صخر ورتيلان'
];

const sports = [
  { discipline: 'football', category: 'ذكور · ثانوي', competition: 'كرة القدم المدرسية', kind: 'TEAM' },
  { discipline: 'basketball', category: 'ذكور · ثانوي', competition: 'كرة السلة ذكور', kind: 'TEAM' },
  { discipline: 'basketball-women', category: 'إناث · ثانوي', competition: 'كرة السلة إناث', kind: 'TEAM' },
  { discipline: 'volleyball', category: 'مختلط · ثانوي', competition: 'الكرة الطائرة', kind: 'TEAM' },
  { discipline: 'handball', category: 'ذكور · متوسط', competition: 'كرة اليد', kind: 'TEAM' },
  { discipline: 'futsal', category: 'ذكور · ثانوي', competition: 'كرة القدم المصغرة', kind: 'TEAM' },
  { discipline: 'athletics', category: 'فردي · ثانوي', competition: 'ألعاب القوى المدرسية', kind: 'INDIVIDUAL' },
  { discipline: 'swimming', category: 'مختلط · متوسط', competition: 'السباحة المدرسية', kind: 'INDIVIDUAL' },
  { discipline: 'judo', category: 'إناث · متوسط', competition: 'الجودو المدرسي', kind: 'INDIVIDUAL' },
  { discipline: 'karate', category: 'مختلط · ثانوي', competition: 'الكاراتيه المدرسي', kind: 'INDIVIDUAL' },
  { discipline: 'table-tennis', category: 'فردي · مختلط', competition: 'تنس الطاولة', kind: 'INDIVIDUAL' },
  { discipline: 'badminton', category: 'فردي · ثانوي', competition: 'الريشة الطائرة', kind: 'INDIVIDUAL' },
  { discipline: 'gymnastics', category: 'إناث · ثانوي', competition: 'الجمباز الإيقاعي', kind: 'INDIVIDUAL' },
  { discipline: 'chess', category: 'فردي · ثانوي', competition: 'الشطرنج المدرسي', kind: 'INDIVIDUAL' },
  { discipline: 'cycling', category: 'مختلط · ثانوي', competition: 'الدراجات الهوائية', kind: 'INDIVIDUAL' }
];

try {
  const org = await pool.query("SELECT id FROM organizations WHERE code='WILAYA-19'");
  if (!org.rowCount) throw new Error('WILAYA-19 association missing — run seed:hierarchy first');
  const orgId = org.rows[0].id;
  const dairas = (await pool.query('SELECT id, name, ar_name FROM dairas WHERE wilaya_id=19 ORDER BY id')).rows;
  if (!dairas.length) throw new Error('no Setif dairas');
  const competitions = (await pool.query('SELECT id, name, discipline, sport_kind, age_category, gender_category FROM competitions')).rows;
  const byName = Object.fromEntries(competitions.map((c) => [c.name, c]));
  const assocAdmin = (await pool.query("SELECT id FROM users WHERE username='demo.association.admin'")).rows[0];

  let created = 0;
  let players = 0;
  let entries = 0;

  for (let i = 0; i < 60; i += 1) {
    const daira = dairas[i % dairas.length];
    const sport = sports[i % sports.length];
    const prefix = prefixes[i % prefixes.length];
    const title = titles[i];
    const name = `${prefix} ${title}`;
    const code = `SETIF-SIM-${String(i + 1).padStart(2, '0')}`;
    const inst = await pool.query(
      `INSERT INTO educational_institutions(organization_id,name,code,daira_id,sport_discipline,sport_category)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(organization_id,code) DO UPDATE SET name=EXCLUDED.name,daira_id=EXCLUDED.daira_id,sport_discipline=EXCLUDED.sport_discipline,sport_category=EXCLUDED.sport_category
       RETURNING id`,
      [orgId, name, code, daira.id, sport.discipline, sport.category]
    );
    const username = `demo.w19.s${String(i + 1).padStart(2, '0')}`;
    const user = await pool.query(
      `INSERT INTO users(username,display_name,password_hash,status,organization_id,institution_id,daira_id)
       VALUES($1,$2,$3,'ACTIVE',$4,$5,$6)
       ON CONFLICT(username) DO UPDATE SET display_name=EXCLUDED.display_name,password_hash=EXCLUDED.password_hash,institution_id=EXCLUDED.institution_id,daira_id=EXCLUDED.daira_id,status='ACTIVE'
       RETURNING id`,
      [username, `مسؤول ${name}`, encode(), orgId, inst.rows[0].id, daira.id]
    );
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='MEMBER_INSTITUTION_USER' ON CONFLICT DO NOTHING", [user.rows[0].id]);

    const teamName = `نادي ${title}`;
    const team = await pool.query(
      `INSERT INTO teams(institution_id,name,alias,sport_kind,discipline,motto,crest_color,image_url)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(name) DO UPDATE SET motto=EXCLUDED.motto,discipline=EXCLUDED.discipline,image_url=EXCLUDED.image_url
       RETURNING id`,
      [inst.rows[0].id, teamName, title, sport.kind === 'TEAM' ? 'TEAM' : 'INDIVIDUAL', sport.discipline, 'همة الهضاب قبل النتيجة', ['#0d6244', '#c1121f', '#c9a24a', '#1d4e89'][i % 4], `/media/${['football', 'basketball', 'volleyball', 'handball', 'athletics', 'swimming', 'judo'][i % 7]}.jpg`]
    );

    const roster = [];
    for (let p = 0; p < 5; p += 1) {
      const alias = `${aliases[(i + p) % aliases.length]} ${i + 1}${['أ', 'ب', 'ج', 'د', 'هـ'][p]}`;
      const portrait = `/media/players/p0${(p % 8) + 1}.jpg`;
      await pool.query(
        `INSERT INTO participants(institution_id,given_name,family_name,status,public_alias,portrait_url,jersey_number,position_label)
         SELECT $1,$2,$3,'ACTIVE',$4,$5,$6,$7
         WHERE NOT EXISTS (SELECT 1 FROM participants WHERE public_alias=$4)`,
        [inst.rows[0].id, alias.split(' ')[0], title, alias, portrait, p + 1, ['صانع ألعاب', 'هجوم', 'دفاع', 'محور', 'جناح'][p]]
      );
      const row = await pool.query('SELECT id FROM participants WHERE public_alias=$1', [alias]);
      roster.push(row.rows[0].id);
      players += 1;
    }
    for (const pid of roster) {
      await pool.query('INSERT INTO team_members(team_id,participant_id,role_label) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [team.rows[0].id, pid, 'أساسي']);
    }

    const primary = byName[sport.competition];
    const secondary = competitions[(i * 3 + 2) % competitions.length];
    const chosen = [primary, secondary].filter(Boolean);
    for (const comp of chosen) {
      for (const pid of roster.slice(0, sport.kind === 'TEAM' ? 5 : 2)) {
        await pool.query(
          `INSERT INTO competition_entries(competition_id,participant_id,confirmation_status)
           VALUES($1,$2,$3)
           ON CONFLICT(competition_id,participant_id) DO UPDATE SET confirmation_status=EXCLUDED.confirmation_status`,
          [comp.id, pid, i % 4 === 0 ? 'PENDING' : 'CONFIRMED']
        );
        entries += 1;
      }
      if (i % 4 !== 0) {
        await pool.query(
          `INSERT INTO institution_competitions(institution_id,competition_id,status,coach_name,representative_name,decided_by,decided_at)
           VALUES($1,$2,'ACCEPTED',$3,$4,$5,now())
           ON CONFLICT(institution_id,competition_id) DO UPDATE SET status='ACCEPTED'`,
          [inst.rows[0].id, comp.id, `مدرب ${title}`, `ممثل ${title}`, assocAdmin?.id ?? null]
        );
      }
    }

    if (i % 5 === 0) {
      await pool.query(
        `INSERT INTO honors(participant_id,competition_id,honor_type,title,detail,awarded_on)
         SELECT $1,$2,'GOLD',$3,$4,'2026-05-20'
         WHERE NOT EXISTS (SELECT 1 FROM honors WHERE participant_id=$1 AND title=$3)`,
        [roster[0], primary?.id ?? competitions[0].id, `ذهبية ${sport.competition}`, `تاج مستعار لـ ${title}`]
      );
      await pool.query(
        `INSERT INTO results(competition_id,participant_id,result_data,status)
         SELECT $1,$2,$3::jsonb,'ACTIVE'
         WHERE NOT EXISTS (SELECT 1 FROM results WHERE competition_id=$1 AND participant_id=$2)`,
        [primary?.id ?? competitions[0].id, roster[0], JSON.stringify({ place: 1, medal: 'ذهب', score: `${2 + (i % 3)}-${i % 2}`, note: 'نتيجة محاكاة معتمدة' })]
      );
    }

    if (i < 12 && primary) {
      const number = `NSSMS-STD-S${String(i + 1).padStart(2, '0')}A`;
      const raw = `${number}-SETIF`;
      await pool.query(
        `INSERT INTO enrollment_cards(card_number,reference_hash,holder_kind,institution_id,competition_id,participant_id,given_name,family_name,discipline,age_category,gender_category,sport_kind,season_name,competition_name,institution_name,wilaya_name,issued_by)
         SELECT $1,$2,'STUDENT',$3,$4,$5,$6,$7,$8,$9,$10,$11,'الموسم المدرسي 2025-2026',$12,$13,'سطيف',$14
         WHERE NOT EXISTS (SELECT 1 FROM enrollment_cards WHERE card_number=$1)`,
        [number, hashText(raw), inst.rows[0].id, primary.id, roster[0], aliases[i % aliases.length].split(' ')[0], title, sport.discipline, primary.age_category, primary.gender_category, primary.sport_kind, primary.name, name, assocAdmin?.id ?? null]
      );
    }

    created += 1;
    if ((i + 1) % 10 === 0) console.log(`setif institutions ${i + 1}/60`);
  }

  console.log(`setif simulation ready institutions=${created} aliasPlayers≈${players} entries≈${entries}`);
  console.log('institution logins demo.w19.s01 … demo.w19.s60 / NssmsHierarchy-2026!');
} finally {
  await pool.end();
}
