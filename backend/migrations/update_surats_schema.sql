-- Update surats table to match frontend field names
ALTER TABLE surats RENAME COLUMN pengirim TO nama_pengirim;
ALTER TABLE surats RENAME COLUMN perihal TO nama_surat;
ALTER TABLE surats RENAME COLUMN tanggal_terima TO tanggal_masuk;
ALTER TABLE surats ADD COLUMN IF NOT EXISTS tanggal_buat DATE;

-- Add Google Drive/Sheets fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_masuk_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_keluar_id TEXT;
