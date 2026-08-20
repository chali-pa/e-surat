-- Add folder management table for custom user folders
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_drive_folder_id VARCHAR(255) NOT NULL UNIQUE,
  parent_folder_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  month VARCHAR(20) NOT NULL, -- Format: "January", "February", etc.
  folder_type VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'custom', 'monthly', 'system'
  letter_type VARCHAR(20) NOT NULL DEFAULT 'incoming', -- 'incoming', 'outgoing'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_month ON folders(month);
CREATE INDEX IF NOT EXISTS idx_folders_letter_type ON folders(letter_type);

-- Add folder_id to surats table (nullable for backward compatibility)
ALTER TABLE surats ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL;

-- Add folder_id to surat_keluars table (nullable for backward compatibility)
ALTER TABLE surat_keluars ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL;

-- Add documentation_folder_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS documentation_folder_id VARCHAR(255);