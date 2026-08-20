import pool from '../config/database';

export interface Folder {
  id?: number;
  user_id: number;
  google_drive_folder_id: string;
  parent_folder_id: string;
  name: string;
  month: string;
  folder_type: string;
  letter_type: string;
  created_at?: Date;
  updated_at?: Date;
}

export const createFolder = async (folder: Folder): Promise<Folder> => {
  const query = `
    INSERT INTO folders (user_id, google_drive_folder_id, parent_folder_id, name, month, folder_type, letter_type, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING *
  `;
  const values = [
    folder.user_id,
    folder.google_drive_folder_id,
    folder.parent_folder_id,
    folder.name,
    folder.month,
    folder.folder_type,
    folder.letter_type,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const findFolderByDriveId = async (googleDriveFolderId: string): Promise<Folder | null> => {
  const query = 'SELECT * FROM folders WHERE google_drive_folder_id = $1';
  const result = await pool.query(query, [googleDriveFolderId]);
  return result.rows[0] || null;
};

export const findFoldersByUserAndMonth = async (userId: number, month: string, letterType: string = 'incoming'): Promise<Folder[]> => {
  const query = `
    SELECT * FROM folders 
    WHERE user_id = $1 AND month = $2 AND letter_type = $3 AND folder_type = 'custom'
    ORDER BY name ASC
  `;
  const result = await pool.query(query, [userId, month, letterType]);
  return result.rows;
};

export const findFoldersByUser = async (userId: number): Promise<Folder[]> => {
  const query = 'SELECT * FROM folders WHERE user_id = $1 ORDER BY letter_type, month, name ASC';
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const findFolderById = async (id: number): Promise<Folder | null> => {
  const query = 'SELECT * FROM folders WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const deleteFolder = async (id: number): Promise<boolean> => {
  const query = 'DELETE FROM folders WHERE id = $1';
  const result = await pool.query(query, [id]);
  return (result.rowCount ?? 0) > 0;
};

export const updateFolder = async (id: number, updates: Partial<Folder>): Promise<Folder | null> => {
  const query = `
    UPDATE folders
    SET name = COALESCE($1, name),
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const values = [updates.name, id];
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};