import pool from '../config/database';

export interface Surat {
  id?: number;
  nomor_surat: string;
  nama_pengirim: string;
  nama_surat: string;
  tanggal_masuk: string;
  tanggal_buat: string;
  file_path?: string;
  google_drive_id?: string;
  google_sheet_row?: number;
  user_id?: number;
  folder_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SuratKeluar {
  id?: number;
  nomor_surat: string;
  nama_penerima: string;
  nama_surat: string;
  tanggal_keluar: string;
  tanggal_buat: string;
  file_path?: string;
  google_drive_id?: string;
  google_sheet_row?: number;
  user_id?: number;
  folder_id?: number;
  created_at?: string;
  updated_at?: string;
}

const toDateValue = (dateValue?: string) => {
  if (!dateValue) return null;
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) {
    return null;
  }
  return value.toISOString().slice(0, 10);
};

const ensureSuratKeluarColumns = async (): Promise<void> => {
  await pool.query(`
    ALTER TABLE surat_keluars
      ADD COLUMN IF NOT EXISTS nama_penerima VARCHAR(255),
      ADD COLUMN IF NOT EXISTS nama_surat TEXT,
      ADD COLUMN IF NOT EXISTS tanggal_keluar DATE,
      ADD COLUMN IF NOT EXISTS tanggal_buat DATE,
      ADD COLUMN IF NOT EXISTS google_sheet_row INTEGER
  `);
};

/**
 * Fetch incoming letter records for a specific calendar month.
 * `year` and `month` are 1-based (month: 1–12).
 * Uses a half-open interval [start_of_month, start_of_next_month) so the
 * filter is determined entirely by the server's clock — no client date needed.
 */
export const getIncomingLetterRecordsByMonth = async (
  userId: number,
  year: number,
  month: number
): Promise<Surat[]> => {
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  const result = await pool.query(
    `SELECT * FROM surats
     WHERE user_id = $1
       AND tanggal_masuk >= $2
       AND tanggal_masuk < $3
     ORDER BY tanggal_masuk DESC, created_at DESC, id DESC`,
    [userId, startOfMonth.toISOString().slice(0, 10), startOfNextMonth.toISOString().slice(0, 10)]
  );
  return result.rows.map((row) => ({
    id: row.id,
    nomor_surat: row.nomor_surat || '',
    nama_pengirim: row.nama_pengirim || '',
    nama_surat: row.nama_surat || '',
    tanggal_masuk: row.tanggal_masuk ? new Date(row.tanggal_masuk).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path || '',
    google_drive_id: row.google_drive_id || '',
    google_sheet_row: row.google_sheet_row ?? undefined,
    user_id: row.user_id,
    folder_id: row.folder_id ?? undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  }));
};

export const getAllIncomingLetterRecords = async (userId: number): Promise<Surat[]> => {
  const result = await pool.query(
    'SELECT * FROM surats WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
    [userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    nomor_surat: row.nomor_surat || '',
    nama_pengirim: row.nama_pengirim || '',
    nama_surat: row.nama_surat || '',
    tanggal_masuk: row.tanggal_masuk ? new Date(row.tanggal_masuk).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path || '',
    google_drive_id: row.google_drive_id || '',
    google_sheet_row: row.google_sheet_row ?? undefined,
    user_id: row.user_id,
    folder_id: row.folder_id ?? undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  }));
};

export const getIncomingLetterRecordById = async (userId: number, id: number): Promise<Surat | null> => {
  const result = await pool.query('SELECT * FROM surats WHERE id = $1 AND user_id = $2', [id, userId]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    nomor_surat: row.nomor_surat || '',
    nama_pengirim: row.nama_pengirim || '',
    nama_surat: row.nama_surat || '',
    tanggal_masuk: row.tanggal_masuk ? new Date(row.tanggal_masuk).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path || '',
    google_drive_id: row.google_drive_id || '',
    google_sheet_row: row.google_sheet_row ?? undefined,
    user_id: row.user_id,
    folder_id: row.folder_id ?? undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
};

export const createIncomingLetterRecord = async (surat: Surat): Promise<Surat> => {
  const result = await pool.query(
    `INSERT INTO surats (nomor_surat, nama_pengirim, nama_surat, tanggal_masuk, tanggal_buat, file_path, google_drive_id, google_sheet_row, user_id, folder_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      surat.nomor_surat,
      surat.nama_pengirim,
      surat.nama_surat,
      toDateValue(surat.tanggal_masuk),
      toDateValue(surat.tanggal_buat),
      surat.file_path || null,
      surat.google_drive_id || null,
      surat.google_sheet_row ?? null,
      surat.user_id ?? null,
      surat.folder_id ?? null,
    ]
  );
  const row = result.rows[0];
  
  return {
    id: row.id,
    nomor_surat: row.nomor_surat,
    nama_pengirim: row.nama_pengirim,
    nama_surat: row.nama_surat,
    tanggal_masuk: row.tanggal_masuk ? new Date(row.tanggal_masuk).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path,
    google_drive_id: row.google_drive_id,
    google_sheet_row: row.google_sheet_row,
    user_id: row.user_id,
    folder_id: row.folder_id ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const updateIncomingLetterRecord = async (id: number, userId: number, surat: Partial<Surat>): Promise<Surat | null> => {
  const hasFolderId = surat.folder_id !== undefined;
  const folderIdValue = surat.folder_id === null ? null : surat.folder_id;

  const result = await pool.query(
    `UPDATE surats
     SET nomor_surat = COALESCE($1, nomor_surat),
         nama_pengirim = COALESCE($2, nama_pengirim),
         nama_surat = COALESCE($3, nama_surat),
         tanggal_masuk = COALESCE($4, tanggal_masuk),
         tanggal_buat = COALESCE($5, tanggal_buat),
         file_path = COALESCE($6, file_path),
         google_drive_id = COALESCE($7, google_drive_id),
         google_sheet_row = COALESCE($8, google_sheet_row),
         folder_id = CASE WHEN $9::boolean THEN $10::integer ELSE folder_id END,
         updated_at = NOW()
     WHERE id = $11 AND user_id = $12
     RETURNING *`,
    [
      surat.nomor_surat ?? null,
      surat.nama_pengirim ?? null,
      surat.nama_surat ?? null,
      surat.tanggal_masuk ? toDateValue(surat.tanggal_masuk) : null,
      surat.tanggal_buat ? toDateValue(surat.tanggal_buat) : null,
      surat.file_path ?? null,
      surat.google_drive_id ?? null,
      surat.google_sheet_row ?? null,
      hasFolderId,
      folderIdValue,
      id,
      userId,
    ]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    nomor_surat: row.nomor_surat,
    nama_pengirim: row.nama_pengirim,
    nama_surat: row.nama_surat,
    tanggal_masuk: row.tanggal_masuk ? new Date(row.tanggal_masuk).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path,
    google_drive_id: row.google_drive_id,
    google_sheet_row: row.google_sheet_row,
    user_id: row.user_id,
    folder_id: row.folder_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const deleteIncomingLetterRecord = async (userId: number, id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM surats WHERE id = $1 AND user_id = $2', [id, userId]);
  return (result.rowCount ?? 0) > 0;
};

export const getAllOutgoingLetterRecords = async (userId: number): Promise<SuratKeluar[]> => {
  await ensureSuratKeluarColumns();
  const result = await pool.query(
    'SELECT * FROM surat_keluars WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
    [userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    nomor_surat: row.nomor_surat || '',
    nama_penerima: row.nama_penerima || row.penerima || '',
    nama_surat: row.nama_surat || row.perihal || '',
    tanggal_keluar: row.tanggal_keluar ? new Date(row.tanggal_keluar).toISOString().slice(0, 10) : row.tanggal_kirim ? new Date(row.tanggal_kirim).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path || '',
    google_drive_id: row.google_drive_id || '',
    google_sheet_row: row.google_sheet_row ?? undefined,
    user_id: row.user_id,
    folder_id: row.folder_id ?? undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  }));
};

/**
 * Fetch outgoing letter records for a specific calendar month.
 * `year` and `month` are 1-based (month: 1–12).
 * Filters on `tanggal_keluar` — the same field that drives Drive folder placement.
 */
export const getOutgoingLetterRecordsByMonth = async (
  userId: number,
  year: number,
  month: number
): Promise<SuratKeluar[]> => {
  await ensureSuratKeluarColumns();
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  const result = await pool.query(
    `SELECT * FROM surat_keluars
     WHERE user_id = $1
       AND tanggal_keluar >= $2
       AND tanggal_keluar < $3
     ORDER BY tanggal_keluar DESC, created_at DESC, id DESC`,
    [userId, startOfMonth.toISOString().slice(0, 10), startOfNextMonth.toISOString().slice(0, 10)]
  );
  return result.rows.map((row) => ({
    id: row.id,
    nomor_surat: row.nomor_surat || '',
    nama_penerima: row.nama_penerima || row.penerima || '',
    nama_surat: row.nama_surat || row.perihal || '',
    tanggal_keluar: row.tanggal_keluar ? new Date(row.tanggal_keluar).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path || '',
    google_drive_id: row.google_drive_id || '',
    google_sheet_row: row.google_sheet_row ?? undefined,
    user_id: row.user_id,
    folder_id: row.folder_id ?? undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  }));
};

export const getOutgoingLetterRecordById = async (userId: number, id: number): Promise<SuratKeluar | null> => {
  await ensureSuratKeluarColumns();
  const result = await pool.query('SELECT * FROM surat_keluars WHERE id = $1 AND user_id = $2', [id, userId]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    nomor_surat: row.nomor_surat || '',
    nama_penerima: row.nama_penerima || row.penerima || '',
    nama_surat: row.nama_surat || row.perihal || '',
    tanggal_keluar: row.tanggal_keluar ? new Date(row.tanggal_keluar).toISOString().slice(0, 10) : row.tanggal_kirim ? new Date(row.tanggal_kirim).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path || '',
    google_drive_id: row.google_drive_id || '',
    google_sheet_row: row.google_sheet_row ?? undefined,
    user_id: row.user_id,
    folder_id: row.folder_id ?? undefined,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
};

export const createOutgoingLetterRecord = async (surat: SuratKeluar): Promise<SuratKeluar> => {
  await ensureSuratKeluarColumns();
  
  const result = await pool.query(
    `INSERT INTO surat_keluars (nomor_surat, nama_penerima, nama_surat, tanggal_keluar, tanggal_buat, file_path, google_drive_id, google_sheet_row, user_id, folder_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      surat.nomor_surat,
      surat.nama_penerima,
      surat.nama_surat,
      toDateValue(surat.tanggal_keluar),
      toDateValue(surat.tanggal_buat),
      surat.file_path || null,
      surat.google_drive_id || null,
      surat.google_sheet_row ?? null,
      surat.user_id ?? null,
      surat.folder_id ?? null,
    ]
  );
  const row = result.rows[0];
  
  return {
    id: row.id,
    nomor_surat: row.nomor_surat,
    nama_penerima: row.nama_penerima || row.penerima,
    nama_surat: row.nama_surat || row.perihal,
    tanggal_keluar: row.tanggal_keluar ? new Date(row.tanggal_keluar).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path,
    google_drive_id: row.google_drive_id,
    google_sheet_row: row.google_sheet_row,
    user_id: row.user_id,
    folder_id: row.folder_id ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const updateOutgoingLetterRecord = async (id: number, userId: number, surat: Partial<SuratKeluar>): Promise<SuratKeluar | null> => {
  await ensureSuratKeluarColumns();
  const hasFolderId = surat.folder_id !== undefined;
  const folderIdValue = surat.folder_id === null ? null : surat.folder_id;

  const result = await pool.query(
    `UPDATE surat_keluars
     SET nomor_surat = COALESCE($1, nomor_surat),
         nama_penerima = COALESCE($2, nama_penerima),
         nama_surat = COALESCE($3, nama_surat),
         tanggal_keluar = COALESCE($4, tanggal_keluar),
         tanggal_buat = COALESCE($5, tanggal_buat),
         file_path = COALESCE($6, file_path),
         google_drive_id = COALESCE($7, google_drive_id),
         google_sheet_row = COALESCE($8, google_sheet_row),
         folder_id = CASE WHEN $9::boolean THEN $10::integer ELSE folder_id END,
         updated_at = NOW()
     WHERE id = $11 AND user_id = $12
     RETURNING *`,
    [
      surat.nomor_surat ?? null,
      surat.nama_penerima ?? null,
      surat.nama_surat ?? null,
      surat.tanggal_keluar ? toDateValue(surat.tanggal_keluar) : null,
      surat.tanggal_buat ? toDateValue(surat.tanggal_buat) : null,
      surat.file_path ?? null,
      surat.google_drive_id ?? null,
      surat.google_sheet_row ?? null,
      hasFolderId,
      folderIdValue,
      id,
      userId,
    ]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    nomor_surat: row.nomor_surat,
    nama_penerima: row.nama_penerima || row.penerima,
    nama_surat: row.nama_surat || row.perihal,
    tanggal_keluar: row.tanggal_keluar ? new Date(row.tanggal_keluar).toISOString().slice(0, 10) : '',
    tanggal_buat: row.tanggal_buat ? new Date(row.tanggal_buat).toISOString().slice(0, 10) : '',
    file_path: row.file_path,
    google_drive_id: row.google_drive_id,
    google_sheet_row: row.google_sheet_row,
    user_id: row.user_id,
    folder_id: row.folder_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const deleteOutgoingLetterRecord = async (userId: number, id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM surat_keluars WHERE id = $1 AND user_id = $2', [id, userId]);
  return (result.rowCount ?? 0) > 0;
};
