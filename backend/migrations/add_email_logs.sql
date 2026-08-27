-- Email audit logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    surat_type VARCHAR(50) NOT NULL, -- 'masuk' or 'keluar'
    surat_id INTEGER NOT NULL,
    recipients TEXT NOT NULL,
    subject TEXT,
    delivery_type VARCHAR(50) NOT NULL, -- 'attachment' or 'drive_link'
    status VARCHAR(50) NOT NULL, -- 'success' or 'failed'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_surat ON email_logs(surat_type, surat_id);
