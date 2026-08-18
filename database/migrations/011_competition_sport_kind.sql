ALTER TABLE competitions ADD COLUMN IF NOT EXISTS sport_kind text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS discipline text;
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_sport_kind_check;
ALTER TABLE competitions ADD CONSTRAINT competitions_sport_kind_check CHECK (sport_kind IS NULL OR sport_kind IN ('INDIVIDUAL','TEAM'));
CREATE INDEX IF NOT EXISTS idx_competitions_sport_kind ON competitions(sport_kind);
