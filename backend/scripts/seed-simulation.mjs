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
  await pool.query("UPDATE competitions SET name='ألعاب القوى المدرسية' WHERE name='ألعاب القوى المدرسية - سطيف'");
  await pool.query("UPDATE competitions SET name='كرة القدم المدرسية' WHERE name='كرة القدم المدرسية الولائية'");

  const competitions = [
    ['ألعاب القوى المدرسية', 'INDIVIDUAL', 'athletics', 'REGISTRATION', '/media/athletics.jpg', 'سباقات السرعة والتتابع والقفز للمؤسسات المنخرطة.'],
    ['السباحة المدرسية', 'INDIVIDUAL', 'swimming', 'REGISTRATION', '/media/swimming.jpg', 'سباقات حرة وظهر للمراحل المتوسطة والثانوية.'],
    ['الجودو المدرسي', 'INDIVIDUAL', 'judo', 'ACTIVE', '/media/judo.jpg', 'منافسات الأوزان المعتمدة ذكوراً وإناثاً.'],
    ['الكاراتيه المدرسي', 'INDIVIDUAL', 'karate', 'ACTIVE', '/media/judo.jpg', 'كوماتيه وكاتا وفق الرزنامة الولائية.'],
    ['تنس الطاولة', 'INDIVIDUAL', 'table-tennis', 'REGISTRATION', '/media/athletics.jpg', 'فردي وزوجي لتلاميذ المؤسسات.'],
    ['الريشة الطائرة', 'INDIVIDUAL', 'badminton', 'REGISTRATION', '/media/volleyball.jpg', 'أدوار إقصائية ثم نصف نهائي ونهائي.'],
    ['الجمباز الإيقاعي', 'INDIVIDUAL', 'gymnastics', 'ACTIVE', '/media/season-open.jpg', 'عروض فردية معتمدة من لجنة التحكيم.'],
    ['الشطرنج المدرسي', 'INDIVIDUAL', 'chess', 'RESULTS', '/media/season-open.jpg', 'دوري سويسري بنتائج معتمدة.'],
    ['الدراجات الهوائية', 'INDIVIDUAL', 'cycling', 'REGISTRATION', '/media/athletics.jpg', 'سباق طرق قصير بين المؤسسات.'],
    ['كرة القدم المدرسية', 'TEAM', 'football', 'ACTIVE', '/media/football.jpg', 'دور مجموعات ثم خروج المغلوب.'],
    ['كرة القدم المصغرة', 'TEAM', 'futsal', 'REGISTRATION', '/media/football.jpg', 'قاعات مغطاة للمؤسسات المنخرطة.'],
    ['كرة السلة ذكور', 'TEAM', 'basketball', 'ACTIVE', '/media/basketball.jpg', 'بطولة ولائية للذكور.'],
    ['كرة السلة إناث', 'TEAM', 'basketball-women', 'RESULTS', '/media/basketball.jpg', 'نهائيات معتمدة للإناث.'],
    ['الكرة الطائرة', 'TEAM', 'volleyball', 'REGISTRATION', '/media/volleyball.jpg', 'ذهاباً وإياباً بين الثانويات.'],
    ['كرة اليد', 'TEAM', 'handball', 'ACTIVE', '/media/handball.jpg', 'منافسات جماعية معتمدة للمتوسط والثانوي.']
  ];
  const competitionIds = [];
  for (const [name, sportKind, discipline, status, imageUrl, summary] of competitions) {
    const row = await pool.query(
      `INSERT INTO competitions(season_id,name,status,start_date,end_date,image_url,summary,sport_kind,discipline)
       SELECT $1,$2,$3::competition_status,'2026-02-01','2026-05-30',$4,$5,$6,$7
       WHERE NOT EXISTS (SELECT 1 FROM competitions WHERE name=$2)
       RETURNING id`,
      [seasonId, name, status, imageUrl, summary, sportKind, discipline]
    );
    const id = row.rows[0]?.id ?? (await pool.query('SELECT id FROM competitions WHERE name=$1', [name])).rows[0].id;
    const gender = name.includes('إناث') ? 'FEMALE' : sportKind === 'TEAM' ? 'MALE' : 'MIXED';
    const age = sportKind === 'TEAM' ? 'U15' : 'U17';
    const rules = sportKind === 'TEAM'
      ? 'فريق واحد لكل مؤسسة. تحديد الجنس والفئة إلزامي. السن وفق شهادة الميلاد.'
      : 'مشاركة فردية. فئة عمرية واحدة لكل سباق. يُعتمد الترتيب الرسمي للجنة.';
    await pool.query('UPDATE competitions SET image_url=$2,summary=$3,status=$4::competition_status,sport_kind=$5,discipline=$6,age_category=$7,gender_category=$8,rules_text=$9 WHERE id=$1', [id, imageUrl, summary, status, sportKind, discipline, age, gender, rules]);
    competitionIds.push(id);
    console.log(`competition ${name} ${sportKind} ${status}`);
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
    ['نتائج كرة السلة الإناث', 'نُشرت النتائج المعتمدة لنهائيات كرة السلة المدرسية للإناث.', '/media/basketball.jpg'],
    ['اعتماد الرزنامة الفردية والجماعية', 'اعتُمدت 15 منافسة مدرسية: 9 فردية و6 جماعية، وهي منشورة للتسجيل أو الجريان أو النتائج.', '/media/season-open.jpg']
  ];
  for (const [title, body, imageUrl] of announcements) {
    await pool.query(
      `INSERT INTO announcements(title,body,status,published_at,image_url)
       SELECT $1,$2,'ACTIVE',now(),$3
       WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title=$1)`,
      [title, body, imageUrl]
    );
  }

  const squad = [
    ['فارس', 'نسر الهضاب', 9, 'صانع ألعاب', '/media/players/p01.jpg'],
    ['لينة', 'شعلة العالية', 7, 'هجوم', '/media/players/p02.jpg'],
    ['أيوب', 'برق سطيف', 11, 'سرعة', '/media/players/p03.jpg'],
    ['سندس', 'نجمة بوعنداس', 4, 'صادة', '/media/players/p04.jpg'],
    ['مهدي', 'أسد قجال', 5, 'محور', '/media/players/p05.jpg'],
    ['هديل', 'ياقوت الأطلس', 3, 'وزن خفيف', '/media/players/p06.jpg'],
    ['أنس', 'قطرة الذهب', 1, 'سباح حر', '/media/players/p07.jpg'],
    ['مريم', 'زهرة الملعب', 10, 'جناح', '/media/players/p08.jpg']
  ];
  const playerIds = [];
  for (const [given, alias, number, position, portrait] of squad) {
    await pool.query(
      `INSERT INTO participants(institution_id,given_name,family_name,status,public_alias,portrait_url,jersey_number,position_label)
       SELECT $1,$2,'مستعار','ACTIVE',$3,$4,$5,$6
       WHERE NOT EXISTS (SELECT 1 FROM participants WHERE public_alias=$3)`,
      [institution.rows[0].id, given, alias, portrait, number, position]
    );
    const row = await pool.query('SELECT id FROM participants WHERE public_alias=$1', [alias]);
    playerIds.push(row.rows[0].id);
  }

  const clubs = [
    ['نسور الهضاب', 'النسور', 'football', 'نرتقي باللعب النظيف', '#0f6b4a', '/media/football.jpg', [0, 2, 4]],
    ['شعلات العالية', 'الشعلات', 'basketball', 'همة البنات عنوان الولاية', '#b42318', '/media/basketball.jpg', [1, 7]],
    ['أمواج سطيف', 'الأمواج', 'swimming', 'كل دورة رقم قياسي جديد', '#1d4e89', '/media/swimming.jpg', [6]],
    ['صقر الأطلس', 'الصقور', 'handball', 'دفاع صلب وهجوم سريع', '#c4a35a', '/media/handball.jpg', [4, 0]],
    ['زمرد القلعة', 'الزمرد', 'volleyball', 'فريق واحد إيقاع واحد', '#2f6f4e', '/media/volleyball.jpg', [3, 1]],
    ['أسود التاتامي', 'الأسود', 'judo', 'الاحترام قبل النقاط', '#3d2b1f', '/media/judo.jpg', [5]]
  ];
  for (const [name, alias, discipline, motto, color, image, members] of clubs) {
    const team = await pool.query(
      `INSERT INTO teams(institution_id,name,alias,sport_kind,discipline,motto,crest_color,image_url)
       VALUES ($1,$2,$3,'TEAM',$4,$5,$6,$7)
       ON CONFLICT(name) DO UPDATE SET motto=EXCLUDED.motto,image_url=EXCLUDED.image_url
       RETURNING id`,
      [institution.rows[0].id, name, alias, discipline, motto, color, image]
    );
    for (const index of members) {
      await pool.query('INSERT INTO team_members(team_id,participant_id,role_label) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [team.rows[0].id, playerIds[index], 'لاعب أساسي']);
    }
  }

  const honorRows = [
    [0, 'GOLD', 'ذهبية كرة القدم الولائية', 'أفضل صانع ألعاب للموسم'],
    [1, 'GOLD', 'ذهبية كرة السلة إناث', 'هجومية البطولة'],
    [2, 'SILVER', 'فضية 100 متر', 'رقم شبه قياسي ولائي'],
    [5, 'GOLD', 'ذهبية الجودو', 'وزن خفيف إناث'],
    [6, 'BRONZE', 'برونزية السباحة الحرة', '50 متر'],
    [7, 'MENTION', 'تكريم الروح الرياضية', 'جائزة اللعب النظيف']
  ];
  for (const [index, type, title, detail] of honorRows) {
    await pool.query(
      `INSERT INTO honors(participant_id,competition_id,honor_type,title,detail,awarded_on)
       SELECT $1,$2,$3,$4,$5,'2026-05-15'
       WHERE NOT EXISTS (SELECT 1 FROM honors WHERE title=$4 AND participant_id=$1)`,
      [playerIds[index], competitionIds[0], type, title, detail]
    );
  }

  const records = [
    ['ألعاب القوى', '100 متر ذكور', '11.42 ث', 'برق سطيف', 'الموسم المدرسي 2025-2026'],
    ['السباحة', '50 متر حرة', '27.80 ث', 'قطرة الذهب', 'الموسم المدرسي 2025-2026'],
    ['الجودو', 'أسرع إيبون', '12 ث', 'ياقوت الأطلس', 'الموسم المدرسي 2025-2026'],
    ['كرة السلة', 'أكثر نقاط في مباراة', '28 نقطة', 'شعلة العالية', 'الموسم المدرسي 2025-2026']
  ];
  for (const [discipline, label, value, holder, seasonName] of records) {
    await pool.query(
      `INSERT INTO sport_records(discipline,record_label,record_value,holder_alias,season_name)
       SELECT $1,$2,$3,$4,$5
       WHERE NOT EXISTS (SELECT 1 FROM sport_records WHERE record_label=$2 AND holder_alias=$4)`,
      [discipline, label, value, holder, seasonName]
    );
  }

  await pool.query(
    `INSERT INTO results(competition_id,participant_id,result_data,status)
     SELECT $1,$2,$3::jsonb,'ACTIVE'
     WHERE NOT EXISTS (SELECT 1 FROM results WHERE participant_id=$2 AND competition_id=$1)`,
    [competitionIds[9] ?? competitionIds[0], playerIds[0], JSON.stringify({ place: 1, medal: 'ذهب', score: '2-1', note: 'نهائي كرة القدم' })]
  );
  await pool.query(
    `INSERT INTO results(competition_id,participant_id,result_data,status)
     SELECT $1,$2,$3::jsonb,'ACTIVE'
     WHERE NOT EXISTS (SELECT 1 FROM results WHERE participant_id=$2 AND competition_id=$1)`,
    [competitionIds[12] ?? competitionIds[0], playerIds[1], JSON.stringify({ place: 1, medal: 'ذهب', score: '58-51', note: 'نهائي السلة إناث' })]
  );

  await pool.query(
    'INSERT INTO audit_logs(actor_user_id,action,entity_type,result_status,metadata) VALUES($1,$2,$3,$4,$5)',
    [userIds['demo.national'], 'SIMULATION_SEED', 'SYSTEM', 'SUCCESS', JSON.stringify({ wilaya: 19 })]
  );
  console.log('simulation seed complete');
} finally {
  await pool.end();
}
