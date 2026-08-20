-- Add Google profile name and email columns for displaying connected Google account info
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email VARCHAR(255);
