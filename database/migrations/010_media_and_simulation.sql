ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS summary text;
