-- Add index on user_id, month and letter_type for faster folder queries in the new format.
CREATE INDEX IF NOT EXISTS idx_folders_month_user ON folders(user_id, month, letter_type);
