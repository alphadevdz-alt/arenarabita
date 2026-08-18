ALTER TABLE sports_licenses ADD COLUMN IF NOT EXISTS license_kind text;
ALTER TABLE sports_licenses ADD COLUMN IF NOT EXISTS discipline text;
ALTER TABLE sports_licenses ADD COLUMN IF NOT EXISTS sport_kind text;
ALTER TABLE sports_licenses ADD COLUMN IF NOT EXISTS age_category text;
ALTER TABLE sports_licenses ADD COLUMN IF NOT EXISTS gender_category text;

ALTER TABLE sports_licenses DROP CONSTRAINT IF EXISTS sports_licenses_license_kind_check;
ALTER TABLE sports_licenses ADD CONSTRAINT sports_licenses_license_kind_check
  CHECK (license_kind IS NULL OR license_kind IN ('STUDENT','COACH','OFFICIAL'));
ALTER TABLE sports_licenses DROP CONSTRAINT IF EXISTS sports_licenses_sport_kind_check;
ALTER TABLE sports_licenses ADD CONSTRAINT sports_licenses_sport_kind_check
  CHECK (sport_kind IS NULL OR sport_kind IN ('INDIVIDUAL','TEAM'));
ALTER TABLE sports_licenses DROP CONSTRAINT IF EXISTS sports_licenses_age_category_check;
ALTER TABLE sports_licenses ADD CONSTRAINT sports_licenses_age_category_check
  CHECK (age_category IS NULL OR age_category IN ('U11','U13','U15','U17','U19','OPEN'));
ALTER TABLE sports_licenses DROP CONSTRAINT IF EXISTS sports_licenses_gender_category_check;
ALTER TABLE sports_licenses ADD CONSTRAINT sports_licenses_gender_category_check
  CHECK (gender_category IS NULL OR gender_category IN ('MALE','FEMALE','MIXED'));
