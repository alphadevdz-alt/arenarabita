import { createRequire } from 'node:module';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const require = createRequire(import.meta.url);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function loadJson(rel) {
  return require(rel);
}

try {
  const wilayasDoc = loadJson('geoalgeria/data/wilayas.json');
  const dairas = loadJson('geoalgeria/data/dairas.json');
  const communeFiles = [
    'geoalgeria/data/communes_w1_w23.json',
    'geoalgeria/data/communes_w24_w48.json',
    'geoalgeria/data/communes_w49_w69.json'
  ];
  const communes = communeFiles.flatMap((file) => loadJson(file));
  const ecolesPkg = loadJson('@geoalgeria/ecoles/data/ecoles.json');
  const ecoles = Array.isArray(ecolesPkg) ? ecolesPkg : ecolesPkg.ecoles;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const wilaya of wilayasDoc.wilayas) {
      await client.query(
        `INSERT INTO wilayas(id,name,ar_name) VALUES($1,$2,$3)
         ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,ar_name=EXCLUDED.ar_name`,
        [wilaya.code, wilaya.name_fr, wilaya.name_ar || wilaya.name_fr]
      );
    }

    const dairaByWilayaName = new Map();
    for (const daira of dairas) {
      const ar = daira.name_ar || daira.name_fr;
      await client.query(
        `INSERT INTO dairas(id,wilaya_id,name,ar_name) VALUES($1,$2,$3,$4)
         ON CONFLICT(id) DO UPDATE SET wilaya_id=EXCLUDED.wilaya_id,name=EXCLUDED.name,ar_name=EXCLUDED.ar_name`,
        [daira.id, daira.wilaya_code, daira.name_fr, ar]
      );
      dairaByWilayaName.set(`${daira.wilaya_code}::${String(daira.name_fr).trim().toLowerCase()}`, daira.id);
    }

    let communeCount = 0;
    for (const commune of communes) {
      const dairaId = dairaByWilayaName.get(`${commune.wilaya_code}::${String(commune.daira ?? '').trim().toLowerCase()}`) ?? null;
      if (!dairaId) continue;
      const parsedCode = Number(commune.code_commune);
      const communeId = Number.isFinite(parsedCode) && parsedCode > 0 ? parsedCode : Number(`${commune.wilaya_code}${String(communeCount + 1).padStart(4, '0')}`);
      await client.query(
        `INSERT INTO communes(id,daira_id,wilaya_id,name,ar_name) VALUES($1,$2,$3,$4,$5)
         ON CONFLICT(id) DO UPDATE SET daira_id=EXCLUDED.daira_id,wilaya_id=EXCLUDED.wilaya_id,name=EXCLUDED.name,ar_name=EXCLUDED.ar_name`,
        [communeId, dairaId, commune.wilaya_code, commune.name_fr, commune.name_ar || commune.name_fr]
      );
      communeCount += 1;
    }

    let schoolCount = 0;
    for (const school of ecoles) {
      const wilayaId = Number(school.wilaya_code);
      if (!wilayaId) continue;
      await client.query(
        `INSERT INTO school_directory(id,name,name_ar,name_fr,wilaya_id,commune_code,commune_name,cycle,kind,lat,lng,source)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'geoalgeria')
         ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,name_ar=EXCLUDED.name_ar,name_fr=EXCLUDED.name_fr,wilaya_id=EXCLUDED.wilaya_id,commune_code=EXCLUDED.commune_code,commune_name=EXCLUDED.commune_name,cycle=EXCLUDED.cycle,kind=EXCLUDED.kind,lat=EXCLUDED.lat,lng=EXCLUDED.lng`,
        [
          school.id,
          school.name || school.name_fr || school.name_ar || school.id,
          school.name_ar,
          school.name_fr,
          wilayaId,
          school.commune_code ? Number(school.commune_code) : null,
          school.commune ?? null,
          school.cycle ?? null,
          school.kind ?? null,
          school.lat ?? null,
          school.lng ?? null
        ]
      );
      schoolCount += 1;
    }

    for (const wilaya of wilayasDoc.wilayas) {
      const code = `WILAYA-${String(wilaya.code).padStart(2, '0')}`;
      await client.query(
        `INSERT INTO organizations(name,code,organization_type,wilaya_id)
         VALUES($1,$2,'ASSOCIATION',$3)
         ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,organization_type='ASSOCIATION',wilaya_id=EXCLUDED.wilaya_id`,
        [`الرابطة الولائية للرياضة المدرسية - ${wilaya.name_ar || wilaya.name_fr}`, code, wilaya.code]
      );
    }

    await client.query('COMMIT');
    console.log(`Imported GeoAlgeria: ${wilayasDoc.wilayas.length} wilayas, ${dairas.length} dairas, ${communeCount} communes, ${schoolCount} schools`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
