-- Add Google OAuth token and resource ID columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expires_at BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_connected BOOLEAN DEFAULT FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS drive_keluar_folder_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_masuk_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_keluar_id TEXT;
