ALTER TABLE competition_entries ADD COLUMN IF NOT EXISTS confirmation_status text;
UPDATE competition_entries SET confirmation_status = COALESCE(confirmation_status, 'PENDING');
ALTER TABLE competition_entries ALTER COLUMN confirmation_status SET DEFAULT 'PENDING';
ALTER TABLE competition_entries DROP CONSTRAINT IF EXISTS competition_entries_confirmation_check;
ALTER TABLE competition_entries ADD CONSTRAINT competition_entries_confirmation_check
  CHECK (confirmation_status IN ('PENDING','CONFIRMED','REJECTED'));

CREATE TABLE IF NOT EXISTS institution_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES educational_institutions(id),
  competition_id uuid NOT NULL REFERENCES competitions(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
  coach_name text,
  representative_name text,
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, competition_id)
);

CREATE TABLE IF NOT EXISTS enrollment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number text NOT NULL UNIQUE,
  reference_hash char(64) NOT NULL UNIQUE,
  holder_kind text NOT NULL CHECK (holder_kind IN ('STUDENT','COACH','INSTITUTION_REPRESENTATIVE')),
  institution_id uuid NOT NULL REFERENCES educational_institutions(id),
  competition_id uuid NOT NULL REFERENCES competitions(id),
  participant_id uuid REFERENCES participants(id),
  given_name text NOT NULL,
  family_name text NOT NULL,
  discipline text,
  age_category text,
  gender_category text,
  sport_kind text,
  season_name text,
  competition_name text,
  institution_name text,
  wilaya_name text,
  status text NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','REVOKED')),
  issued_by uuid REFERENCES users(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_cards_competition ON enrollment_cards(competition_id, institution_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_cards_holder ON enrollment_cards(holder_kind, status);
CREATE INDEX IF NOT EXISTS idx_institution_competitions_status ON institution_competitions(competition_id, status);
