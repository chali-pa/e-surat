import pool from '../config/database';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  email_verified_at?: Date;
  google_sub?: string | null;
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_token_expires_at?: number | string | null;
  google_connected?: boolean;
  drive_folder_id?: string | null;
  drive_keluar_folder_id?: string | null;
  sheet_masuk_id?: string | null;
  sheet_keluar_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export const createUser = async (name: string, email: string, password: string, googleSub?: string | null): Promise<User> => {
  const query = `
    INSERT INTO users (name, email, password, google_sub, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING *
  `;
  const values = [name, email, password, googleSub || null];
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
  googleSub?: string | null
): Promise<User> => {
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
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;
    values = [accessToken, refreshToken, expiresAt || null, googleSub || null, id];
  } else {
    query = `
      UPDATE users
      SET google_access_token = $1,
          google_token_expires_at = COALESCE($2, google_token_expires_at),
          google_connected = TRUE,
          google_sub = COALESCE($3, google_sub),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    values = [accessToken, expiresAt || null, googleSub || null, id];
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
  }
): Promise<User> => {
  const query = `
    UPDATE users
    SET drive_folder_id = COALESCE($1, drive_folder_id),
        drive_keluar_folder_id = COALESCE($2, drive_keluar_folder_id),
        sheet_masuk_id = COALESCE($3, sheet_masuk_id),
        sheet_keluar_id = COALESCE($4, sheet_keluar_id),
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `;
  const values = [
    resources.drive_folder_id || null,
    resources.drive_keluar_folder_id || null,
    resources.sheet_masuk_id || null,
    resources.sheet_keluar_id || null,
    id,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

