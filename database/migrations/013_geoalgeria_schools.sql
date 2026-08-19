ALTER TABLE wilayas DROP CONSTRAINT IF EXISTS wilayas_id_check;
CREATE TABLE IF NOT EXISTS school_directory (
  id text PRIMARY KEY,
  name text,
  name_ar text,
  name_fr text,
  wilaya_id smallint REFERENCES wilayas(id),
  commune_code integer,
  commune_name text,
  cycle text,
  kind text,
  lat double precision,
  lng double precision,
  source text NOT NULL DEFAULT 'geoalgeria'
);
CREATE INDEX IF NOT EXISTS idx_school_directory_wilaya ON school_directory(wilaya_id, cycle);
CREATE INDEX IF NOT EXISTS idx_school_directory_name ON school_directory(name);
