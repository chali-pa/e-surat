import { google, drive_v3 } from 'googleapis';
import path from 'path';
import { Readable } from 'stream';
import { findUserById, updateUserGoogleResourceIds } from '../models/User';
import { getOAuth2ClientForUser, GoogleReconnectRequiredError, isGoogleErrorInvalidGrant } from './userGoogleAuthService';
import { createFolder, findFolderByDriveId, findFoldersByUserAndMonth, findFolderById } from '../models/Folder';

/**
 * Helper to find an existing folder under parentId by name (to prevent duplicates)
 */
export async function findFolderByName(
  drive: drive_v3.Drive,
  folderName: string,
  parentId?: string
): Promise<string | null> {
  try {
    const parentQuery = parentId ? `'${parentId}' in parents` : "'root' in parents";
    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and ${parentQuery} and trashed = false`;

    const res = await drive.files.list({
      q: q,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id || null;
    }
    return null;
  } catch (error) {
    console.error(`[GoogleDrive] Error finding folder '${folderName}':`, error);
    throw error;
  }
}

/**
 * Helper to find or create a folder idempotently
 */
export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentId?: string
): Promise<string> {
  const existingId = await findFolderByName(drive, folderName, parentId);
  if (existingId) {
    console.log(`[GoogleDrive] Found existing folder '${folderName}' with ID: ${existingId}`);
    return existingId;
  }

  console.log(`[GoogleDrive] Folder '${folderName}' not found under parent '${parentId || 'root'}'. Creating new folder...`);
  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  if (!res.data.id) {
    throw new Error(`Failed to create Google Drive folder: ${folderName}`);
  }

  console.log(`[GoogleDrive] Created folder '${folderName}' with ID: ${res.data.id}`);
  return res.data.id;
}

/**
 * Format month folder name to MM-YY (e.g. "01-26") derived from date.
 */
export function formatMonthYear(letterDateStr?: string): string {
  let dateObj = new Date();
  if (letterDateStr) {
    const parsed = new Date(letterDateStr);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yy = String(dateObj.getFullYear()).slice(-2);
  return `${mm}-${yy}`;
}

/**
 * Get month name from date - maps to formatMonthYear to ensure MM-YY is used globally.
 */
export function getMonthName(letterDateStr?: string): string {
  return formatMonthYear(letterDateStr);
}

/**
 * Format month folder name object for legacy support if needed.
 */
export function formatMonthFolderName(letterDateStr?: string): { folderName: string; monthIndex: number; yearYY: string } {
  const formatted = formatMonthYear(letterDateStr);
  let dateObj = new Date();
  if (letterDateStr) {
    const parsed = new Date(letterDateStr);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }
  return {
    folderName: formatted,
    monthIndex: dateObj.getMonth() + 1,
    yearYY: String(dateObj.getFullYear()).slice(-2)
  };
}

/**
 * Helper to parse/convert month string to MM-YY if needed
 */
export function cleanMonthYear(monthStr: string): string {
  if (!monthStr) return formatMonthYear();
  if (/^\d{2}-\d{2}$/.test(monthStr)) {
    return monthStr;
  }
  // Try parsing as date
  const parsed = new Date(monthStr);
  if (!isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yy = String(parsed.getFullYear()).slice(-2);
    return `${mm}-${yy}`;
  }
  // Map month name
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const lower = monthStr.toLowerCase();
  const idx = monthNames.indexOf(lower);
  if (idx !== -1) {
    const mm = String(idx + 1).padStart(2, '0');
    const yy = String(new Date().getFullYear()).slice(-2);
    return `${mm}-${yy}`;
  }
  return monthStr;
}

/**
 * Move a file in user's Google Drive by removing from old parent and adding to new parent
 */
export async function moveUserFile(
  userId: number,
  fileId: string,
  newParentId: string
): Promise<void> {
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const file = await drive.files.get({
      fileId: fileId,
      fields: 'parents',
    });

    const previousParents = file.data.parents?.join(',') || '';

    await drive.files.update({
      fileId: fileId,
      addParents: newParentId,
      removeParents: previousParents,
      fields: 'id, parents',
    });
    console.log(`[GoogleDrive] Moved file ${fileId} to parent ${newParentId}`);
  } catch (error: any) {
    console.error(`[GoogleDrive] Move file failed for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Determine subfolder category based on file extension / mime type
 */
export function getSubfolderType(fileName: string, mimeType?: string): 'Excel' | 'Documentation' | 'PDF' {
  const ext = path.extname(fileName).toLowerCase();

  if (['.xlsx', '.xls', '.csv'].includes(ext) || (mimeType && (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')))) {
    return 'Excel';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.svg'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
    return 'Documentation';
  }

  if (['.doc', '.docx', '.txt', '.rtf', '.odt'].includes(ext) || 
      (mimeType && (mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('msword')))) {
    return 'Documentation';
  }

  return 'PDF';
}

/**
 * Move an existing file to the correct folder path based on date and type
 */
export async function moveDriveFileToCorrectFolder(
  userId: number,
  fileId: string,
  originalFileName: string,
  letterType: 'incoming' | 'outgoing',
  letterDateStr?: string,
  mimeType?: string,
  customFolderDriveId?: string
): Promise<{
  logicalPath: string;
}> {
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const rootName = letterType === 'incoming' ? 'esurat' : 'esurat-keluar';
    const user = await findUserById(userId);
    let rootFolderId = letterType === 'incoming' ? user?.drive_folder_id : user?.drive_keluar_folder_id;

    if (!rootFolderId) {
      rootFolderId = await findOrCreateFolder(drive, rootName);
      if (letterType === 'incoming') {
        await updateUserGoogleResourceIds(userId, { drive_folder_id: rootFolderId });
      } else {
        await updateUserGoogleResourceIds(userId, { drive_keluar_folder_id: rootFolderId });
      }
    }

    let targetFolderId: string;
    let logicalPath: string;

    const monthYear = formatMonthYear(letterDateStr);

    if (customFolderDriveId) {
      targetFolderId = customFolderDriveId;
      logicalPath = `${rootName}/${monthYear}/${originalFileName}`;
    } else {
      targetFolderId = await findOrCreateFolder(drive, monthYear, rootFolderId);
      logicalPath = `${rootName}/${monthYear}/${originalFileName}`;
    }

    await moveUserFile(userId, fileId, targetFolderId);

    return { logicalPath };
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to move file to correct folder:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Ensure standard user drive structure exists (esurat / esurat-keluar root folders)
 */
export async function initializeUserDriveStructure(userId: number): Promise<{
  incomingRootId: string;
  outgoingRootId: string;
  documentationFolderId: string;
}> {
  console.log(`[GoogleDrive] Initializing Drive structure for user ${userId}...`);
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const user = await findUserById(userId);

    // Root folder for incoming: esurat
    let incomingRootId = user?.drive_folder_id || null;
    if (incomingRootId) {
      try {
        await drive.files.get({ fileId: incomingRootId, fields: 'id, trashed' });
      } catch (e) {
        console.warn(`[GoogleDrive] Stored drive_folder_id ${incomingRootId} for user ${userId} is inaccessible. Resetting.`);
        incomingRootId = null;
      }
    }

    if (!incomingRootId) {
      incomingRootId = await findOrCreateFolder(drive, 'esurat');
    }

    // Root folder for outgoing: esurat-keluar
    let outgoingRootId = user?.drive_keluar_folder_id || null;
    if (outgoingRootId) {
      try {
        await drive.files.get({ fileId: outgoingRootId, fields: 'id, trashed' });
      } catch (e) {
        console.warn(`[GoogleDrive] Stored drive_keluar_folder_id ${outgoingRootId} for user ${userId} is inaccessible. Resetting.`);
        outgoingRootId = null;
      }
    }

    if (!outgoingRootId) {
      outgoingRootId = await findOrCreateFolder(drive, 'esurat-keluar');
    }

    // Save root IDs in DB
    await updateUserGoogleResourceIds(userId, {
      drive_folder_id: incomingRootId,
      drive_keluar_folder_id: outgoingRootId,
    });

    console.log(`[GoogleDrive] Successfully initialized Drive structure for user ${userId}`);
    return { incomingRootId, outgoingRootId, documentationFolderId: '' };
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to initialize Drive structure for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Upload file to user's Google Drive with strict MM-YY folder routing.
 * Fails explicitly if a customFolderId is invalid/unresolvable.
 */
export async function uploadUserLetterFile(
  userId: number,
  fileBuffer: Buffer,
  originalFileName: string,
  letterType: 'incoming' | 'outgoing',
  letterDateStr?: string,
  mimeType?: string,
  customFolderId?: string
): Promise<{
  fileId: string;
  webViewLink: string;
  logicalPath: string;
}> {
  console.log(`[GoogleDrive] Uploading file for user ${userId}: ${originalFileName} (${letterType})`);
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    // 1. Resolve root folder ID
    const rootName = letterType === 'incoming' ? 'esurat' : 'esurat-keluar';
    const user = await findUserById(userId);
    let rootFolderId = letterType === 'incoming' ? user?.drive_folder_id : user?.drive_keluar_folder_id;

    if (!rootFolderId) {
      rootFolderId = await findOrCreateFolder(drive, rootName);
      if (letterType === 'incoming') {
        await updateUserGoogleResourceIds(userId, { drive_folder_id: rootFolderId });
      } else {
        await updateUserGoogleResourceIds(userId, { drive_keluar_folder_id: rootFolderId });
      }
    }

    // 2. Determine target folder ID and logical path
    let targetFolderId: string = '';
    let logicalPath: string = '';

    const monthYear = formatMonthYear(letterDateStr);

    if (customFolderId) {
      // Validate custom folder ID exists and is accessible
      try {
        await drive.files.get({ fileId: customFolderId, fields: 'id, trashed' });
        targetFolderId = customFolderId;
        logicalPath = `${rootName}/${monthYear}/${originalFileName}`;
      } catch (e: any) {
        console.error(`[GoogleDrive] Custom folder ID ${customFolderId} not accessible or missing:`, e);
        throw new Error(`Folder Google Drive '${customFolderId}' tidak ditemukan atau tidak dapat diakses.`);
      }
    } else {
      targetFolderId = await findOrCreateFolder(drive, monthYear, rootFolderId);
      logicalPath = `${rootName}/${monthYear}/${originalFileName}`;
    }

    // 3. Upload file to target folder
    const fileMetadata = {
      name: originalFileName,
      parents: [targetFolderId],
    };

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    if (!response.data.id) {
      throw new Error('Google Drive API did not return a file ID');
    }

    const fileId = response.data.id;
    const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    // Make viewable
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.warn(`[GoogleDrive] Could not set reader permission on file ${fileId}:`, permErr);
    }

    console.log(`[GoogleDrive] Upload successful! File ID: ${fileId}, Logical Path: ${logicalPath}`);
    return { fileId, webViewLink, logicalPath };
  } catch (error: any) {
    console.error(`[GoogleDrive] Upload failed for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Delete a file from user's Google Drive.
 * Handles 404 gracefully (file already missing/deleted).
 * Throws real errors (network, permission, auth) so callers can prevent premature DB deletion.
 */
export async function deleteUserFile(userId: number, fileId: string): Promise<void> {
  if (!fileId) return;
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    try {
      await drive.files.get({ fileId, fields: 'id' });
    } catch (getError: any) {
      if (getError.code === 404 || getError.status === 404) {
        console.log(`[GoogleDrive] File ${fileId} not found in Drive, treating as already deleted.`);
        return;
      }
      if (isGoogleErrorInvalidGrant(getError)) {
        throw new GoogleReconnectRequiredError();
      }
      throw getError;
    }

    await drive.files.delete({ fileId });
    console.log(`[GoogleDrive] Deleted file ${fileId} from user ${userId}'s Drive`);
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to delete file ${fileId} for user ${userId}:`, error);

    if (error.code === 404 || error.status === 404) {
      console.log(`[GoogleDrive] File ${fileId} already deleted, treating as success.`);
      return;
    }

    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Replace a file on user's Google Drive (delete old, upload new)
 */
export async function replaceUserLetterFile(
  userId: number,
  oldFileId: string | undefined | null,
  fileBuffer: Buffer,
  originalFileName: string,
  letterType: 'incoming' | 'outgoing',
  letterDateStr?: string,
  mimeType?: string
): Promise<{
  fileId: string;
  webViewLink: string;
  logicalPath: string;
}> {
  if (oldFileId) {
    try {
      console.log(`[GoogleDrive] Replacing file. Deleting old file: ${oldFileId}`);
      await deleteUserFile(userId, oldFileId);
    } catch (err) {
      console.error(`[GoogleDrive] Failed to delete old file during replace:`, err);
    }
  }

  return uploadUserLetterFile(userId, fileBuffer, originalFileName, letterType, letterDateStr, mimeType);
}

/**
 * Update or replace a user's letter file on edit
 */
export async function updateUserLetterFile(
  userId: number,
  oldDriveId: string | undefined,
  newFileBuffer: Buffer | undefined,
  originalFileName: string,
  letterType: 'incoming' | 'outgoing',
  letterDateStr: string,
  mimeType?: string,
  customFolderId?: string
): Promise<{
  fileId: string;
  webViewLink: string;
  logicalPath: string;
}> {
  try {
    if (!newFileBuffer) {
      throw new Error('No new file provided for update');
    }

    if (oldDriveId) {
      try {
        await deleteUserFile(userId, oldDriveId);
      } catch (deleteErr) {
        console.warn(`[GoogleDrive] Could not delete old file ${oldDriveId}:`, deleteErr);
      }
    }

    return await uploadUserLetterFile(
      userId,
      newFileBuffer,
      originalFileName,
      letterType,
      letterDateStr,
      mimeType,
      customFolderId
    );
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to update user letter file:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Create a custom folder for user in specific month / category
 */
export async function createCustomFolder(
  userId: number,
  monthName: string,
  folderName: string,
  letterType: 'incoming' | 'outgoing' = 'incoming',
  fileType: 'pdf' | 'excel' | 'documentation' = 'pdf'
): Promise<{
  folderId: string;
  googleDriveFolderId: string;
  message: string;
}> {
  try {
    const cleanedMonth = cleanMonthYear(monthName);
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const user = await findUserById(userId);
    const rootFolderId = letterType === 'incoming' ? user?.drive_folder_id : user?.drive_keluar_folder_id;

    if (!rootFolderId) {
      throw new Error('User Drive structure not initialized. Please connect your Google account.');
    }

    // Check if folder already exists in DB for this user, month & letterType
    const customFolders = await findFoldersByUserAndMonth(userId, cleanedMonth, letterType);
    const folderExistsInDb = customFolders.find(f => f.name.toLowerCase() === folderName.trim().toLowerCase());

    if (folderExistsInDb) {
      return {
        folderId: folderExistsInDb.id?.toString() || '',
        googleDriveFolderId: folderExistsInDb.google_drive_folder_id,
        message: 'Folder already exists in the selected month'
      };
    }

    // Build parent hierarchy
    // Under MM-YY format, custom folders are nested inside their MM-YY folder directly: esurat/<MM-YY>/<FolderName>
    const parentFolderId = await findOrCreateFolder(drive, cleanedMonth, rootFolderId);

    // Create custom folder under parent folder in Drive
    const customFolderDriveId = await findOrCreateFolder(drive, folderName.trim(), parentFolderId);

    // Save to database
    const folder = await createFolder({
      user_id: userId,
      google_drive_folder_id: customFolderDriveId,
      parent_folder_id: parentFolderId,
      name: folderName.trim(),
      month: cleanedMonth,
      folder_type: 'custom',
      letter_type: letterType,
    });

    return {
      folderId: folder.id?.toString() || '',
      googleDriveFolderId: customFolderDriveId,
      message: 'Folder created successfully'
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to create custom folder:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Validate folder ownership by checking database and verifying Drive folder exists
 * 
 * ROOT CAUSE FIX: The folderId parameter is the DATABASE ID, not the Google Drive ID.
 * This function looks up the Drive ID from the database and validates that the folder
 * actually exists in Drive. This prevents the false rejection caused by using DB ID as Drive ID.
 */
export async function validateFolderOwnership(
  userId: number,
  folderId: string,
  letterType: 'incoming' | 'outgoing' = 'incoming'
): Promise<{ valid: boolean; googleDriveFolderId?: string; dbFolderId?: number }> {
  try {
    // Parse folderId safely - handle string/number conversion
    const parsedFolderId = parseInt(folderId, 10);
    if (isNaN(parsedFolderId)) {
      return { valid: false };
    }
    
    // Look up folder in database using the database ID
    const dbFolder = await findFolderById(parsedFolderId);
    
    if (!dbFolder) {
      return { valid: false };
    }

    if (dbFolder.user_id !== userId) {
      return { valid: false };
    }

    // Check if letter_type matches (incoming vs outgoing)
    if (dbFolder.letter_type !== letterType) {
      return { valid: false };
    }

    // Check if google_drive_folder_id exists and is valid
    if (!dbFolder.google_drive_folder_id || dbFolder.google_drive_folder_id.trim() === '') {
      return { valid: false };
    }

    // Verify the folder actually exists in Drive using the correct Drive ID from database
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    try {
      await drive.files.get({
        fileId: dbFolder.google_drive_folder_id,
        fields: 'id, name, trashed'
      });

      return {
        valid: true,
        googleDriveFolderId: dbFolder.google_drive_folder_id,
        dbFolderId: dbFolder.id
      };
    } catch (driveError: any) {
      return { valid: false };
    }
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Get custom folders for a specific month.
 *
 * Lists folder children of the <root>/<MM-YY>/ path directly from Google Drive
 * so that folders created in Drive outside the app are visible in the dropdown.
 * Any newly discovered Drive folders are upserted into the local DB so that
 * validateFolderOwnership can find them on first submit (fixes Issue A for
 * Drive-created folders).
 *
 * Falls back to DB-only listing if Drive is unreachable (non-auth error).
 * Re-throws GoogleReconnectRequiredError so the controller can send a proper
 * reconnect response.
 */
export async function getMonthlyFolders(
  userId: number,
  monthName: string,
  letterType: 'incoming' | 'outgoing' = 'incoming'
): Promise<Array<{
  id: string;
  name: string;
  google_drive_folder_id: string;
}>> {
  const cleanedMonth = cleanMonthYear(monthName);

  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    // 1. Resolve the user's root folder for this letter type
    const user = await findUserById(userId);
    const rootFolderId = letterType === 'incoming'
      ? user?.drive_folder_id
      : user?.drive_keluar_folder_id;

    if (!rootFolderId) {
      // Drive not set up yet — fall back to DB only
      const dbFolders = await findFoldersByUserAndMonth(userId, cleanedMonth, letterType);
      return dbFolders.map((f) => ({
        id: f.id?.toString() || '',
        name: f.name,
        google_drive_folder_id: f.google_drive_folder_id,
      }));
    }

    // 2. Find the month sub-folder (list only — do NOT create it here)
    const monthFolderId = await findFolderByName(drive, cleanedMonth, rootFolderId);
    if (!monthFolderId) {
      // Month folder doesn't exist yet — nothing to list
      return [];
    }

    // 3. List all folder children of the month folder from Drive
    const driveRes = await drive.files.list({
      q: `'${monthFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      pageSize: 100,
    });

    const driveFolders = driveRes.data.files || [];

    // 4. Upsert each Drive folder into the local DB and build the result list
    const results: Array<{ id: string; name: string; google_drive_folder_id: string }> = [];

    for (const driveFolder of driveFolders) {
      if (!driveFolder.id || !driveFolder.name) continue;

      let dbRow = await findFolderByDriveId(driveFolder.id);

      if (!dbRow) {
        // Drive-created folder not yet in DB — register it so validateFolderOwnership can find it
        try {
          dbRow = await createFolder({
            user_id: userId,
            google_drive_folder_id: driveFolder.id,
            parent_folder_id: monthFolderId,
            name: driveFolder.name,
            month: cleanedMonth,
            folder_type: 'custom',
            letter_type: letterType,
          });
        } catch (upsertErr: any) {
          // Concurrent request may have inserted it between our check and insert — retry lookup
          dbRow = await findFolderByDriveId(driveFolder.id);
          if (!dbRow) {
            console.warn(`[GoogleDrive] Could not upsert folder '${driveFolder.name}' (${driveFolder.id}):`, upsertErr);
            continue;
          }
        }
      }

      results.push({
        id: dbRow.id?.toString() || '',
        name: dbRow.name,
        google_drive_folder_id: dbRow.google_drive_folder_id,
      });
    }

    return results;
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to get monthly folders:`, error);

    // Auth errors must propagate so the controller can send the reconnect response
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }

    // For other transient errors fall back to DB-only listing so the UI stays usable
    try {
      const dbFolders = await findFoldersByUserAndMonth(userId, cleanedMonth, letterType);
      return dbFolders.map((f) => ({
        id: f.id?.toString() || '',
        name: f.name,
        google_drive_folder_id: f.google_drive_folder_id,
      }));
    } catch {
      return [];
    }
  }
}
