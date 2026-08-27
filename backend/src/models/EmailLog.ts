import pool from '../config/database';

export interface EmailLogData {
  userId: number;
  suratType: 'masuk' | 'keluar';
  suratId: number;
  recipients: string;
  subject: string;
  deliveryType: 'attachment' | 'drive_link';
  status: 'success' | 'failed';
  errorMessage?: string | null;
}

export async function createEmailLog(data: EmailLogData) {
  const query = `
    INSERT INTO email_logs (
      user_id,
      surat_type,
      surat_id,
      recipients,
      subject,
      delivery_type,
      status,
      error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    data.userId,
    data.suratType,
    data.suratId,
    data.recipients,
    data.subject,
    data.deliveryType,
    data.status,
    data.errorMessage || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getEmailLogsBySurat(suratType: 'masuk' | 'keluar', suratId: number) {
  const query = `
    SELECT * FROM email_logs
    WHERE surat_type = $1 AND surat_id = $2
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [suratType, suratId]);
  return result.rows;
}
