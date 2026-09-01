import { google, sheets_v4 } from 'googleapis';
import { Surat, SuratKeluar } from '../models/Surat';
import { findUserById, updateUserGoogleResourceIds } from '../models/User';
import { getOAuth2ClientForUser, GoogleReconnectRequiredError, isGoogleErrorInvalidGrant } from './userGoogleAuthService';
import { deleteUserFile } from './userGoogleDriveService';

export const INCOMING_SHEET_HEADERS = [
  'ID',
  'Letter Number',
  'Sender Name',
  'Letter Name',
  'Date Received',
  'Date Created',
  'Google Drive ID',
  'File Path',
  'Created At',
];

export const OUTGOING_SHEET_HEADERS = [
  'ID',
  'Letter Number',
  'Sender Name',
  'Letter Name',
  'Date Issued',
  'Date Created',
  'Google Drive ID',
  'File Path',
  'Created At',
];

/**
 * Build a clickable hyperlink formula for Google Drive file path
 * If googleDriveId is present, returns =HYPERLINK formula
 * Otherwise returns the filePath as plain text
 */
export function buildFilePathFormula(googleDriveId?: string, filePath?: string): string {
  if (!googleDriveId) {
    if (filePath && filePath.startsWith('http')) {
      return `=HYPERLINK("${filePath}", "Lihat File")`;
    }
    return filePath || '';
  }

  const rawLabel = (filePath && !filePath.startsWith('http')) ? filePath : 'Lihat File';
  const escapedLabel = rawLabel.replace(/"/g, '""');
  const driveUrl = `https://drive.google.com/file/d/${googleDriveId}/view`;
  return `=HYPERLINK("${driveUrl}", "${escapedLabel}")`;
}

/**
 * Ensure user has a Google Spreadsheet for incoming or outgoing letters.
 */
export async function ensureUserSpreadsheet(
  userId: number,
  type: 'incoming' | 'outgoing'
): Promise<string> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  const existingSheetId = type === 'incoming' ? user.sheet_masuk_id : user.sheet_keluar_id;
  const auth = await getOAuth2ClientForUser(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  if (existingSheetId) {
    try {
      // Check if existing sheet is accessible
      await sheets.spreadsheets.get({ spreadsheetId: existingSheetId });
      console.log(`[GoogleSheets] Found existing valid spreadsheet for user ${userId} (${type}): ${existingSheetId}`);
      return existingSheetId;
    } catch (err: any) {
      console.warn(`[GoogleSheets] Sheet ID ${existingSheetId} for user ${userId} not accessible or deleted. Creating new sheet...`);
    }
  }

  const title = type === 'incoming' ? 'E-Surat Masuk' : 'E-Surat Keluar';
  const headers = type === 'incoming' ? INCOMING_SHEET_HEADERS : OUTGOING_SHEET_HEADERS;

  console.log(`[GoogleSheets] Creating new spreadsheet '${title}' for user ${userId}...`);

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: title },
      sheets: [
        {
          properties: {
            title: 'Data',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    },
  });

  const newSheetId = response.data.spreadsheetId;
  if (!newSheetId) {
    throw new Error(`Failed to create Google Spreadsheet '${title}' for user ${userId}`);
  }

  // Set header row
  await sheets.spreadsheets.values.update({
    spreadsheetId: newSheetId,
    range: 'Data!A1:I1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers],
    },
  });

  // Save sheet ID to user's DB record
  if (type === 'incoming') {
    await updateUserGoogleResourceIds(userId, { sheet_masuk_id: newSheetId });
  } else {
    await updateUserGoogleResourceIds(userId, { sheet_keluar_id: newSheetId });
  }

  console.log(`[GoogleSheets] Successfully created spreadsheet '${title}' with ID ${newSheetId} for user ${userId}`);
  return newSheetId;
}

/**
 * Append incoming letter row to user's spreadsheet
 */
export async function appendIncomingLetterToSheet(userId: number, surat: Surat): Promise<{ rowId: number; sheetRowNumber: number }> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'incoming');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Read column A to find maximum ID to prevent duplicates
    let maxId = 0;
    let existingRowCount = 1;
    try {
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Data!A:A',
      });
      if (getRes.data.values) {
        existingRowCount = getRes.data.values.length;
        if (existingRowCount > 1) {
          const ids = getRes.data.values
            .slice(1)
            .map(r => parseInt(String(r[0] || '').trim()))
            .filter(id => !isNaN(id));
          if (ids.length > 0) {
            maxId = Math.max(...ids);
          }
        }
      }
    } catch (e) {
      console.warn(`[GoogleSheets] Could not read row count:`, e);
    }

    const rowId = maxId + 1; // Unique sequential ID
    const createdAt = surat.created_at || new Date().toISOString();

    const rowValues = [
      rowId,
      surat.nomor_surat,
      surat.nama_pengirim,
      surat.nama_surat,
      surat.tanggal_masuk || '',
      surat.tanggal_buat || '',
      surat.google_drive_id || '',
      buildFilePathFormula(surat.google_drive_id, surat.file_path),
      createdAt,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Data!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    const sheetRowNumber = existingRowCount + 1;
    console.log(`[GoogleSheets] Appended incoming letter for user ${userId} to sheet ${sheetId} with ID: ${rowId} at row: ${sheetRowNumber}`);
    return { rowId, sheetRowNumber };
  } catch (error: any) {
    console.error(`[GoogleSheets] Failed to append incoming letter for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Append outgoing letter row to user's spreadsheet
 */
export async function appendOutgoingLetterToSheet(userId: number, surat: SuratKeluar): Promise<{ rowId: number; sheetRowNumber: number }> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'outgoing');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Read column A to find maximum ID to prevent duplicates
    let maxId = 0;
    let existingRowCount = 1;
    try {
      const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Data!A:A',
      });
      if (getRes.data.values) {
        existingRowCount = getRes.data.values.length;
        if (existingRowCount > 1) {
          const ids = getRes.data.values
            .slice(1)
            .map(r => parseInt(String(r[0] || '').trim()))
            .filter(id => !isNaN(id));
          if (ids.length > 0) {
            maxId = Math.max(...ids);
          }
        }
      }
    } catch (e) {
      console.warn(`[GoogleSheets] Could not read row count:`, e);
    }

    const rowId = maxId + 1; // Unique sequential ID
    const createdAt = surat.created_at || new Date().toISOString();

    const rowValues = [
      rowId,
      surat.nomor_surat,
      surat.nama_penerima,
      surat.nama_surat,
      surat.tanggal_keluar || '',
      surat.tanggal_buat || '',
      surat.google_drive_id || '',
      buildFilePathFormula(surat.google_drive_id, surat.file_path),
      createdAt,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Data!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    const sheetRowNumber = existingRowCount + 1;
    console.log(`[GoogleSheets] Appended outgoing letter for user ${userId} to sheet ${sheetId} with ID: ${rowId} at row: ${sheetRowNumber}`);
    return { rowId, sheetRowNumber };
  } catch (error: any) {
    console.error(`[GoogleSheets] Failed to append outgoing letter for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Get all incoming letters from user's Google Sheet
 */
export async function getAllIncomingLetters(userId: number): Promise<Surat[]> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'incoming');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Data!A:I',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    return rows.slice(1).map((row: string[], index: number) => ({
      id: parseInt(row[0]) || index + 1,
      nomor_surat: row[1] || '',
      nama_pengirim: row[2] || '',
      nama_surat: row[3] || '',
      tanggal_masuk: row[4] || '',
      tanggal_buat: row[5] || '',
      google_drive_id: row[6] || '',
      file_path: row[7] || '',
      created_at: row[8] || '',
      user_id: userId,
    }));
  } catch (error: any) {
    console.error(`[GoogleSheets] Failed to get incoming letters for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Get all outgoing letters from user's Google Sheet
 */
export async function getAllOutgoingLetters(userId: number): Promise<SuratKeluar[]> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'outgoing');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Data!A:I',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    return rows.slice(1).map((row: string[], index: number) => ({
      id: parseInt(row[0]) || index + 1,
      nomor_surat: row[1] || '',
      nama_penerima: row[2] || '',
      nama_surat: row[3] || '',
      tanggal_keluar: row[4] || '',
      tanggal_buat: row[5] || '',
      google_drive_id: row[6] || '',
      file_path: row[7] || '',
      created_at: row[8] || '',
      user_id: userId,
    }));
  } catch (error: any) {
    console.error(`[GoogleSheets] Failed to get outgoing letters for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Get incoming letter by row number / letter ID
 */
export async function getIncomingLetterByRow(userId: number, rowNumber: number): Promise<Surat | null> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'incoming');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Try finding exact row index by Letter ID (Column A)
    const rowIndex = await findRowById(sheets, sheetId, rowNumber);
    const targetRowIndex = rowIndex !== null ? rowIndex + 1 : rowNumber + 1;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `Data!A${targetRowIndex}:I${targetRowIndex}`,
    });

    const row = response.data.values?.[0];
    if (row && row[0] && (parseInt(row[0]) === rowNumber || rowIndex !== null)) {
      return {
        id: parseInt(row[0]) || rowNumber,
        nomor_surat: row[1] || '',
        nama_pengirim: row[2] || '',
        nama_surat: row[3] || '',
        tanggal_masuk: row[4] || '',
        tanggal_buat: row[5] || '',
        google_drive_id: row[6] || '',
        file_path: row[7] || '',
        created_at: row[8] || '',
        user_id: userId,
      };
    }

    // Fallback: retrieve all letters and find matching ID
    const allSurats = await getAllIncomingLetters(userId);
    return allSurats.find(s => s.id === rowNumber) || null;
  } catch (error: any) {
    console.error(`[GoogleSheets] Failed to get row ${rowNumber} for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Get outgoing letter by row number / letter ID
 */
export async function getOutgoingLetterByRow(userId: number, rowNumber: number): Promise<SuratKeluar | null> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'outgoing');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Try finding exact row index by Letter ID (Column A)
    const rowIndex = await findRowById(sheets, sheetId, rowNumber);
    const targetRowIndex = rowIndex !== null ? rowIndex + 1 : rowNumber + 1;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `Data!A${targetRowIndex}:I${targetRowIndex}`,
    });

    const row = response.data.values?.[0];
    if (row && row[0] && (parseInt(row[0]) === rowNumber || rowIndex !== null)) {
      return {
        id: parseInt(row[0]) || rowNumber,
        nomor_surat: row[1] || '',
        nama_penerima: row[2] || '',
        nama_surat: row[3] || '',
        tanggal_keluar: row[4] || '',
        tanggal_buat: row[5] || '',
        google_drive_id: row[6] || '',
        file_path: row[7] || '',
        created_at: row[8] || '',
        user_id: userId,
      };
    }

    // Fallback: retrieve all outgoing letters and find matching ID
    const allSurats = await getAllOutgoingLetters(userId);
    return allSurats.find(s => s.id === rowNumber) || null;
  } catch (error: any) {
    console.error(`[GoogleSheets] Failed to get outgoing row ${rowNumber} for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Find the 0-based row index in the 'Data' sheet by Google Drive File ID (Column G, index 6)
 */
export async function findRowByDriveId(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  driveId: string
): Promise<number | null> {
  if (!driveId) return null;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Data!G:G',
    });
    const rows = res.data.values;
    if (!rows) return null;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === driveId) {
        return i;
      }
    }
    return null;
  } catch (error) {
    console.error(`[GoogleSheets] Error finding row by Drive ID ${driveId}:`, error);
    return null;
  }
}

/**
 * Find the 0-based row index in the 'Data' sheet by Letter ID (Column A, index 0)
 */
export async function findRowById(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  id: number
): Promise<number | null> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Data!A:A',
    });
    const rows = res.data.values;
    if (!rows) return null;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]) {
        const valStr = String(rows[i][0] || '').trim();
        const parsed = parseInt(valStr, 10);
        if (!isNaN(parsed) && parsed === id) {
          return i;
        }
      }
    }
    return null;
  } catch (error) {
    console.error(`[GoogleSheets] Error finding row by ID ${id}:`, error);
    return null;
  }
}

/**
 * Find row index using stored 1-based sheet row number (verifies ID at that row)
 */
export async function verifyRowBySheetRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetRowNumber: number,
  expectedId: number
): Promise<number | null> {
  if (!sheetRowNumber || sheetRowNumber < 2) return null;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Data!A${sheetRowNumber}`,
    });
    const val = res.data.values?.[0]?.[0];
    if (val !== undefined && val !== null) {
      const parsed = parseInt(String(val).trim(), 10);
      if (!isNaN(parsed) && parsed === expectedId) {
        return sheetRowNumber - 1; // 0-based index
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Update incoming letter in sheet
 */
export async function updateIncomingLetterInSheet(
  userId: number,
  letterId: number,
  surat: Surat,
  storedSheetRow?: number,
  driveId?: string
): Promise<void> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'incoming');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Try finding row by ID in Column A
    let rowIndex = await findRowById(sheets, sheetId, letterId);

    // 2. Try stored sheet row verification
    if (rowIndex === null && storedSheetRow) {
      rowIndex = await verifyRowBySheetRow(sheets, sheetId, storedSheetRow, letterId);
    }

    // 3. Try Drive ID in Column G
    const searchDriveId = driveId || surat.google_drive_id;
    if (rowIndex === null && searchDriveId) {
      rowIndex = await findRowByDriveId(sheets, sheetId, searchDriveId);
    }

    // 4. Graceful fallback: row deleted or missing, re-append
    if (rowIndex === null) {
      console.warn(`[GoogleSheets] Row for letter ID ${letterId} not found in sheet, re-appending`);
      await appendIncomingLetterToSheet(userId, surat);
      return;
    }

    const rowValues = [
      letterId,
      surat.nomor_surat,
      surat.nama_pengirim,
      surat.nama_surat,
      surat.tanggal_masuk,
      surat.tanggal_buat,
      surat.google_drive_id || '',
      buildFilePathFormula(surat.google_drive_id, surat.file_path),
      surat.updated_at || new Date().toISOString(),
    ];

    const targetRowNumber = rowIndex + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Data!A${targetRowNumber}:I${targetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowValues] },
    });

    console.log(`[GoogleSheets] Successfully updated incoming letter ID ${letterId} at row ${targetRowNumber}`);
  } catch (error: any) {
    console.error(`[GoogleSheets] Update failed for incoming letter ID ${letterId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Update outgoing letter in sheet
 */
export async function updateOutgoingLetterInSheet(
  userId: number,
  letterId: number,
  surat: SuratKeluar,
  storedSheetRow?: number,
  driveId?: string
): Promise<void> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'outgoing');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Try finding row by ID in Column A
    let rowIndex = await findRowById(sheets, sheetId, letterId);

    // 2. Try stored sheet row verification
    if (rowIndex === null && storedSheetRow) {
      rowIndex = await verifyRowBySheetRow(sheets, sheetId, storedSheetRow, letterId);
    }

    // 3. Try Drive ID in Column G
    const searchDriveId = driveId || surat.google_drive_id;
    if (rowIndex === null && searchDriveId) {
      rowIndex = await findRowByDriveId(sheets, sheetId, searchDriveId);
    }

    // 4. Graceful fallback: row deleted or missing, re-append
    if (rowIndex === null) {
      console.warn(`[GoogleSheets] Row for outgoing letter ID ${letterId} not found in sheet, re-appending`);
      await appendOutgoingLetterToSheet(userId, surat);
      return;
    }

    const rowValues = [
      letterId,
      surat.nomor_surat,
      surat.nama_penerima,
      surat.nama_surat,
      surat.tanggal_keluar,
      surat.tanggal_buat,
      surat.google_drive_id || '',
      buildFilePathFormula(surat.google_drive_id, surat.file_path),
      surat.updated_at || new Date().toISOString(),
    ];

    const targetRowNumber = rowIndex + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Data!A${targetRowNumber}:I${targetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowValues] },
    });

    console.log(`[GoogleSheets] Successfully updated outgoing letter ID ${letterId} at row ${targetRowNumber}`);
  } catch (error: any) {
    console.error(`[GoogleSheets] Update outgoing failed for letter ID ${letterId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Delete incoming letter row from sheet
 */
export async function deleteIncomingLetterRow(
  userId: number,
  letterId: number,
  fileId?: string,
  storedSheetRow?: number
): Promise<void> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'incoming');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Try finding row by ID in Column A
    let rowIndex = await findRowById(sheets, sheetId, letterId);

    // 2. Try stored sheet row verification
    if (rowIndex === null && storedSheetRow) {
      rowIndex = await verifyRowBySheetRow(sheets, sheetId, storedSheetRow, letterId);
    }

    // 3. Try Drive ID in Column G
    if (rowIndex === null && fileId) {
      rowIndex = await findRowByDriveId(sheets, sheetId, fileId);
    }

    if (rowIndex === null) {
      console.warn(`[GoogleSheets] Row with ID ${letterId} not found in sheet ${sheetId} for deletion`);
      return;
    }

    // Get tab sheetId (gid)
    const doc = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheet = doc.data.sheets?.find(s => s.properties?.title === 'Data');
    const gid = sheet?.properties?.sheetId || 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: gid,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });
    console.log(`[GoogleSheets] Deleted row index ${rowIndex} (row ${rowIndex + 1}) from incoming sheet ${sheetId}`);
  } catch (error: any) {
    console.error(`[GoogleSheets] Delete incoming failed for letter ID ${letterId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Delete outgoing letter row from sheet
 */
export async function deleteOutgoingLetterRow(
  userId: number,
  letterId: number,
  fileId?: string,
  storedSheetRow?: number
): Promise<void> {
  try {
    const sheetId = await ensureUserSpreadsheet(userId, 'outgoing');
    const auth = await getOAuth2ClientForUser(userId);
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Try finding row by ID in Column A
    let rowIndex = await findRowById(sheets, sheetId, letterId);

    // 2. Try stored sheet row verification
    if (rowIndex === null && storedSheetRow) {
      rowIndex = await verifyRowBySheetRow(sheets, sheetId, storedSheetRow, letterId);
    }

    // 3. Try Drive ID in Column G
    if (rowIndex === null && fileId) {
      rowIndex = await findRowByDriveId(sheets, sheetId, fileId);
    }

    if (rowIndex === null) {
      console.warn(`[GoogleSheets] Outgoing row with ID ${letterId} not found in sheet ${sheetId} for deletion`);
      return;
    }

    // Get tab sheetId (gid)
    const doc = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheet = doc.data.sheets?.find(s => s.properties?.title === 'Data');
    const gid = sheet?.properties?.sheetId || 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: gid,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });
    console.log(`[GoogleSheets] Deleted row index ${rowIndex} (row ${rowIndex + 1}) from outgoing sheet ${sheetId}`);
  } catch (error: any) {
    console.error(`[GoogleSheets] Delete outgoing failed for letter ID ${letterId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}
