ALTER TABLE competitions ADD COLUMN IF NOT EXISTS age_category text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS gender_category text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS rules_text text;
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_age_category_check;
ALTER TABLE competitions ADD CONSTRAINT competitions_age_category_check CHECK (age_category IS NULL OR age_category IN ('U11','U13','U15','U17','U19','OPEN'));
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_gender_category_check;
ALTER TABLE competitions ADD CONSTRAINT competitions_gender_category_check CHECK (gender_category IS NULL OR gender_category IN ('MALE','FEMALE','MIXED'));

CREATE TABLE IF NOT EXISTS enrollment_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES educational_institutions(id),
  role_kind text NOT NULL CHECK (role_kind IN ('COACH','STUDENT')),
  code_hash char(64) NOT NULL UNIQUE,
  label text,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrollment_codes_institution ON enrollment_codes(institution_id);
