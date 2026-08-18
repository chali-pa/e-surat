-- Add Google sub identifier column for stable Google identity tracking
-- This column stores the unique Google account identifier (sub) from OAuth
-- which is more stable than email for user identification
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;

-- Add index for faster lookups by Google sub
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);

-- Add unique constraint to ensure one Google account per user
-- This prevents duplicate accounts for the same Google identity
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_unique ON users(google_sub) WHERE google_sub IS NOT NULL;