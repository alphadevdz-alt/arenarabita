ALTER TABLE educational_institutions ADD COLUMN IF NOT EXISTS sport_discipline text;
ALTER TABLE educational_institutions ADD COLUMN IF NOT EXISTS sport_category text;
CREATE INDEX IF NOT EXISTS idx_institutions_sport ON educational_institutions(sport_discipline, sport_category);
