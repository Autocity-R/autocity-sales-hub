ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS import_status_locked_at timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS import_status_highest text;