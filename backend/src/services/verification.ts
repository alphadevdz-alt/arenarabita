import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../infrastructure/db.js';

export function hashVerificationReference(reference: string): string { return createHash('sha256').update(reference.trim(), 'utf8').digest('hex'); }
export function createVerificationReference(): string { return randomBytes(32).toString('base64url'); }

function ageCategoryFromDob(dob: string | Date | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 11) return 'U11';
  if (age < 13) return 'U13';
  if (age < 15) return 'U15';
  if (age < 17) return 'U17';
  if (age < 19) return 'U19';
  return 'OPEN';
}

export async function verifyLicense(reference: string) {
  const hash = hashVerificationReference(reference);
  const result = await pool.query(
    `SELECT l.status, l.issued_at, l.expires_at, l.license_kind, l.discipline, l.sport_kind, l.age_category, l.gender_category,
            p.given_name, p.family_name, p.date_of_birth, p.public_alias,
            i.name AS institution_name, i.sport_discipline, i.sport_category,
            c.name AS competition_name, c.discipline AS competition_discipline, c.sport_kind AS competition_sport_kind,
            c.age_category AS competition_age, c.gender_category AS competition_gender
     FROM qr_verifications q
     JOIN sports_licenses l ON l.id=q.license_id
     JOIN participants p ON p.id=l.participant_id
     JOIN educational_institutions i ON i.id=p.institution_id
     LEFT JOIN LATERAL (
       SELECT c.name, c.discipline, c.sport_kind, c.age_category, c.gender_category
       FROM competition_entries e
       JOIN competitions c ON c.id=e.competition_id
       WHERE e.participant_id=p.id AND e.archived_at IS NULL
       ORDER BY e.created_at DESC
       LIMIT 1
     ) c ON TRUE
     WHERE q.reference_hash=$1 AND q.revoked_at IS NULL`,
    [hash]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  const expired = row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : false;
  return {
    status: expired && row.status === 'ACTIVE' ? 'EXPIRED' : row.status,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    givenName: row.given_name,
    familyName: row.family_name,
    publicAlias: row.public_alias,
    institutionName: row.institution_name,
    licenseKind: row.license_kind ?? 'STUDENT',
    sportKind: row.sport_kind ?? row.competition_sport_kind ?? null,
    discipline: row.discipline ?? row.competition_discipline ?? row.sport_discipline ?? null,
    ageCategory: row.age_category ?? row.competition_age ?? ageCategoryFromDob(row.date_of_birth),
    genderCategory: row.gender_category ?? row.competition_gender ?? row.sport_category ?? null
  };
}
