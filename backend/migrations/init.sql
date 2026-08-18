-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP,
    drive_folder_id TEXT,
    sheet_masuk_id TEXT,
    sheet_keluar_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Surat Masuk table
CREATE TABLE IF NOT EXISTS surats (
    id SERIAL PRIMARY KEY,
    nomor_surat VARCHAR(255),
    nama_pengirim VARCHAR(255),
    nama_surat TEXT,
    tanggal_masuk DATE,
    tanggal_buat DATE,
    file_path TEXT,
    google_drive_id TEXT,
    google_sheet_row INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Surat Keluar table
CREATE TABLE IF NOT EXISTS surat_keluars (
    id SERIAL PRIMARY KEY,
    nomor_surat VARCHAR(255),
    penerima VARCHAR(255),
    perihal TEXT,
    tanggal_kirim DATE,
    file_path TEXT,
    google_drive_id TEXT,
    google_sheet_row INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_surats_user_id ON surats(user_id);
CREATE INDEX IF NOT EXISTS idx_surat_keluars_user_id ON surat_keluars(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_surats_updated_at ON surats;
CREATE TRIGGER update_surats_updated_at BEFORE UPDATE ON surats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_surat_keluars_updated_at ON surat_keluars;
CREATE TRIGGER update_surat_keluars_updated_at BEFORE UPDATE ON surat_keluars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
