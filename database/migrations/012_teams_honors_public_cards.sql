ALTER TABLE participants ADD COLUMN IF NOT EXISTS public_alias text;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS portrait_url text;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS jersey_number smallint;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS position_label text;

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES educational_institutions(id),
  name text NOT NULL UNIQUE,
  alias text NOT NULL,
  sport_kind text NOT NULL DEFAULT 'TEAM',
  discipline text,
  motto text,
  crest_color text,
  image_url text,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id uuid NOT NULL REFERENCES teams(id),
  participant_id uuid NOT NULL REFERENCES participants(id),
  role_label text,
  PRIMARY KEY (team_id, participant_id)
);

CREATE TABLE IF NOT EXISTS honors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id),
  team_id uuid REFERENCES teams(id),
  competition_id uuid REFERENCES competitions(id),
  honor_type text NOT NULL,
  title text NOT NULL,
  detail text,
  awarded_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sport_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline text NOT NULL,
  record_label text NOT NULL,
  record_value text NOT NULL,
  holder_alias text NOT NULL,
  participant_id uuid REFERENCES participants(id),
  season_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_participant ON team_members(participant_id);
CREATE INDEX IF NOT EXISTS idx_honors_participant ON honors(participant_id);
