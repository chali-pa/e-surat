import pool from '../config/database';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  email_verified_at?: Date;
  google_sub?: string | null;
  google_name?: string | null;
  google_email?: string | null;
  google_picture?: string | null;
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_token_expires_at?: number | string | null;
  google_connected?: boolean;
  // Drive root folders
  drive_folder_id?: string | null;                    // esurat/ (incoming root)
  drive_keluar_folder_id?: string | null;             // esurat-keluar/ (outgoing root)
  // Drive subfolders — incoming
  pdf_folder_id?: string | null;                      // esurat/PDF/
  excel_folder_id?: string | null;                    // esurat/Excel/
  documentation_folder_id?: string | null;            // esurat/Documentation/
  photos_folder_id?: string | null;                   // esurat/Photos/ (legacy)
  // Drive subfolders — outgoing
  pdf_keluar_folder_id?: string | null;               // esurat-keluar/PDF/
  excel_keluar_folder_id?: string | null;             // esurat-keluar/Excel/
  documentation_keluar_folder_id?: string | null;     // esurat-keluar/Documentation/
  // Sheets
  sheet_masuk_id?: string | null;
  sheet_keluar_id?: string | null;
  // Configured storage destinations
  incoming_storage_folder_id?: string | null;
  incoming_storage_folder_name?: string | null;
  outgoing_storage_folder_id?: string | null;
  outgoing_storage_folder_name?: string | null;
  incoming_monthly_organization?: boolean;
  outgoing_monthly_organization?: boolean;
  created_at: Date;
  updated_at: Date;
}

// Ensure optional columns exist in users table safely
let columnsEnsured = false;
export async function ensureUserGoogleColumns() {
  if (columnsEnsured) return;
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_picture TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expires_at BIGINT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_connected BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS drive_keluar_folder_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_masuk_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_keluar_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS documentation_folder_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS incoming_storage_folder_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS incoming_storage_folder_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS outgoing_storage_folder_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS outgoing_storage_folder_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS incoming_monthly_organization BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS outgoing_monthly_organization BOOLEAN DEFAULT FALSE;
    `);
    columnsEnsured = true;
  } catch (err) {
    console.warn('[User] Auto-ensuring columns warning:', err);
  }
}
ensureUserGoogleColumns();

export const createUser = async (
  name: string,
  email: string,
  password: string,
  googleSub?: string | null,
  googleName?: string | null,
  googleEmail?: string | null
): Promise<User> => {
  await ensureUserGoogleColumns();
  const query = `
    INSERT INTO users (name, email, password, google_sub, google_name, google_email, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `;
  const values = [name, email, password, googleSub || null, googleName || null, googleEmail || null];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

export const findUserByGoogleSub = async (googleSub: string): Promise<User | null> => {
  const query = 'SELECT * FROM users WHERE google_sub = $1';
  const result = await pool.query(query, [googleSub]);
  return result.rows[0] || null;
};

export const findUserById = async (id: number): Promise<User | null> => {
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const updateUser = async (id: number, name: string, email: string): Promise<User> => {
  const query = `
    UPDATE users 
    SET name = $1, email = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;
  const values = [name, email, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const updatePassword = async (id: number, password: string): Promise<User> => {
  const query = `
    UPDATE users 
    SET password = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const values = [password, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const deleteUser = async (id: number): Promise<void> => {
  const query = 'DELETE FROM users WHERE id = $1';
  await pool.query(query, [id]);
};

export const updateUserGoogleTokens = async (
  id: number,
  accessToken: string,
  refreshToken?: string | null,
  expiresAt?: number | null,
  googleSub?: string | null,
  googleName?: string | null,
  googleEmail?: string | null,
  googlePicture?: string | null
): Promise<User> => {
  await ensureUserGoogleColumns();
  let query: string;
  let values: any[];

  if (refreshToken) {
    query = `
      UPDATE users
      SET google_access_token = $1,
          google_refresh_token = $2,
          google_token_expires_at = $3,
          google_connected = TRUE,
          google_sub = COALESCE($4, google_sub),
          google_name = COALESCE($5, google_name),
          google_email = COALESCE($6, google_email),
          google_picture = COALESCE($7, google_picture),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    values = [accessToken, refreshToken, expiresAt || null, googleSub || null, googleName || null, googleEmail || null, googlePicture || null, id];
  } else {
    query = `
      UPDATE users
      SET google_access_token = $1,
          google_token_expires_at = COALESCE($2, google_token_expires_at),
          google_connected = TRUE,
          google_sub = COALESCE($3, google_sub),
          google_name = COALESCE($4, google_name),
          google_email = COALESCE($5, google_email),
          google_picture = COALESCE($6, google_picture),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;
    values = [accessToken, expiresAt || null, googleSub || null, googleName || null, googleEmail || null, googlePicture || null, id];
  }

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const clearUserGoogleTokens = async (id: number): Promise<User> => {
  const query = `
    UPDATE users
    SET google_access_token = NULL,
        google_refresh_token = NULL,
        google_token_expires_at = NULL,
        google_connected = FALSE,
        google_name = NULL,
        google_email = NULL,
        google_picture = NULL,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export const updateUserGoogleResourceIds = async (
  id: number,
  resources: {
    drive_folder_id?: string | null;
    drive_keluar_folder_id?: string | null;
    sheet_masuk_id?: string | null;
    sheet_keluar_id?: string | null;
    documentation_folder_id?: string | null;
  }
): Promise<User> => {
  const query = `
    UPDATE users
    SET drive_folder_id = COALESCE($1, drive_folder_id),
        drive_keluar_folder_id = COALESCE($2, drive_keluar_folder_id),
        sheet_masuk_id = COALESCE($3, sheet_masuk_id),
        sheet_keluar_id = COALESCE($4, sheet_keluar_id),
        documentation_folder_id = COALESCE($5, documentation_folder_id),
        updated_at = NOW()
    WHERE id = $6
    RETURNING *
  `;
  const values = [
    resources.drive_folder_id || null,
    resources.drive_keluar_folder_id || null,
    resources.sheet_masuk_id || null,
    resources.sheet_keluar_id || null,
    resources.documentation_folder_id || null,
    id,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const updateUserStorageSettings = async (
  id: number,
  settings: {
    incoming_storage_folder_id?: string | null;
    incoming_storage_folder_name?: string | null;
    outgoing_storage_folder_id?: string | null;
    outgoing_storage_folder_name?: string | null;
    incoming_monthly_organization?: boolean;
    outgoing_monthly_organization?: boolean;
  }
): Promise<User> => {
  await ensureUserGoogleColumns();
  const hasIncomingFolder = settings.incoming_storage_folder_id !== undefined;
  const hasIncomingName = settings.incoming_storage_folder_name !== undefined;
  const hasOutgoingFolder = settings.outgoing_storage_folder_id !== undefined;
  const hasOutgoingName = settings.outgoing_storage_folder_name !== undefined;
  const hasIncomingMonthly = settings.incoming_monthly_organization !== undefined;
  const hasOutgoingMonthly = settings.outgoing_monthly_organization !== undefined;

  const query = `
    UPDATE users
    SET incoming_storage_folder_id = CASE WHEN $1::boolean THEN $2 ELSE incoming_storage_folder_id END,
        incoming_storage_folder_name = CASE WHEN $3::boolean THEN $4 ELSE incoming_storage_folder_name END,
        outgoing_storage_folder_id = CASE WHEN $5::boolean THEN $6 ELSE outgoing_storage_folder_id END,
        outgoing_storage_folder_name = CASE WHEN $7::boolean THEN $8 ELSE outgoing_storage_folder_name END,
        incoming_monthly_organization = CASE WHEN $9::boolean THEN $10 ELSE incoming_monthly_organization END,
        outgoing_monthly_organization = CASE WHEN $11::boolean THEN $12 ELSE outgoing_monthly_organization END,
        updated_at = NOW()
    WHERE id = $13
    RETURNING *
  `;
  const values = [
    hasIncomingFolder, settings.incoming_storage_folder_id ?? null,
    hasIncomingName, settings.incoming_storage_folder_name ?? null,
    hasOutgoingFolder, settings.outgoing_storage_folder_id ?? null,
    hasOutgoingName, settings.outgoing_storage_folder_name ?? null,
    hasIncomingMonthly, settings.incoming_monthly_organization ?? null,
    hasOutgoingMonthly, settings.outgoing_monthly_organization ?? null,
    id,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

