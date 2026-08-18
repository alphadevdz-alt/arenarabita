CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS competition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id),
  participant_id uuid NOT NULL REFERENCES participants(id),
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (competition_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_competition ON competition_entries(competition_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status, published_at DESC);

INSERT INTO permissions(key, description) VALUES
  ('announcement.manage', 'Manage public announcements'),
  ('competition.enter', 'Register participants in competitions')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE p.key IN ('announcement.manage', 'competition.enter')
  AND r.name IN ('SYSTEM_ADMINISTRATOR', 'NATIONAL_ADMINISTRATOR', 'ASSOCIATION_ADMINISTRATOR')
ON CONFLICT DO NOTHING;
