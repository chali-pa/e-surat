import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { findUserById, updateUserGoogleResourceIds } from '../models/User';
import { getOAuth2ClientForUser, GoogleReconnectRequiredError, isGoogleErrorInvalidGrant } from './userGoogleAuthService';
import { createFolder, findFolderByDriveId, findFoldersByUserAndMonth } from '../models/Folder';


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
 * Format month folder name in MM-YY format.
 * Examples: 01-27, 02-27, ..., 07-27, 12-27
 */
export function formatMonthFolderName(letterDateStr?: string): { folderName: string; monthIndex: number; yearYY: string } {
  let dateObj = new Date();
  if (letterDateStr) {
    const parsed = new Date(letterDateStr);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  const monthNum = dateObj.getMonth() + 1; // 1-12
  const mm = String(monthNum).padStart(2, '0');
  const fullYear = dateObj.getFullYear();
  const yy = String(fullYear).slice(-2); // e.g. "27" or "26"

  // MM-YY format (e.g. 07-27)
  const folderName = `${mm}-${yy}`;
  return { folderName, monthIndex: monthNum, yearYY: yy };
}

/**
 * Get month name from date (January, February, etc.)
 */
export function getMonthName(letterDateStr?: string): string {
  let dateObj = new Date();
  if (letterDateStr) {
    const parsed = new Date(letterDateStr);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return monthNames[dateObj.getMonth()];
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

    // Retrieve the existing parents to remove them
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
 * Move an existing file to the correct folder path based on date and type
 */
export async function moveDriveFileToCorrectFolder(
  userId: number,
  fileId: string,
  originalFileName: string,
  letterType: 'incoming' | 'outgoing',
  letterDateStr?: string,
  mimeType?: string
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

    const { folderName: monthFolderName } = formatMonthFolderName(letterDateStr);
    const monthFolderId = await findOrCreateFolder(drive, monthFolderName, rootFolderId);

    const subfolderName = getSubfolderType(originalFileName, mimeType);
    const subfolderId = await findOrCreateFolder(drive, subfolderName, monthFolderId);

    // Move file
    await moveUserFile(userId, fileId, subfolderId);

    const logicalPath = `${rootName}/${monthFolderName}/${subfolderName}/${originalFileName}`;
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
 * Determine subfolder based on file extension / mime type
 * Updated to route images to Documentation folder instead of Photos
 */
export function getSubfolderType(fileName: string, mimeType?: string): 'Excel' | 'Documentation' | 'PDF' {
  const ext = path.extname(fileName).toLowerCase();

  if (['.xlsx', '.xls', '.csv'].includes(ext) || (mimeType && mimeType.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv'))) {
    return 'Excel';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.svg'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
    return 'Documentation';
  }

  // Documentation formats
  if (['.doc', '.docx', '.txt', '.rtf', '.odt', '.pdf'].includes(ext) || 
      (mimeType && (mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('pdf')))) {
    return 'Documentation';
  }

  // Default for PDF and other files
  return 'PDF';
}

/**
 * Ensure standard user drive structure exists (esurat, esurat-keluar, Documentation, 12 month folders, subfolders)
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

    // 1. Root folder for incoming: esurat
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

    // 2. Root folder for outgoing: esurat-keluar
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

    // 3. Create Documentation folder at root level
    let documentationFolderId = user?.documentation_folder_id || null;
    if (documentationFolderId) {
      try {
        await drive.files.get({ fileId: documentationFolderId, fields: 'id, trashed' });
      } catch (e) {
        console.warn(`[GoogleDrive] Stored documentation_folder_id ${documentationFolderId} for user ${userId} is inaccessible. Resetting.`);
        documentationFolderId = null;
      }
    }

    if (!documentationFolderId) {
      documentationFolderId = await findOrCreateFolder(drive, 'Documentation');
    }

    // Save root IDs in DB
    await updateUserGoogleResourceIds(userId, {
      drive_folder_id: incomingRootId,
      drive_keluar_folder_id: outgoingRootId,
      documentation_folder_id: documentationFolderId,
    });

    // 4. Create 12 month folders and 3 subfolders under each root folder
    const currentYY = String(new Date().getFullYear()).slice(-2);
    const subfolders: ('Excel' | 'Documentation' | 'PDF')[] = ['Excel', 'Documentation', 'PDF'];

    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const monthFolderName = `${mm}-${currentYY}`;

      // Incoming month folder
      const incMonthId = await findOrCreateFolder(drive, monthFolderName, incomingRootId);
      for (const sub of subfolders) {
        await findOrCreateFolder(drive, sub, incMonthId);
      }

      // Outgoing month folder
      const outMonthId = await findOrCreateFolder(drive, monthFolderName, outgoingRootId);
      for (const sub of subfolders) {
        await findOrCreateFolder(drive, sub, outMonthId);
      }
    }

    console.log(`[GoogleDrive] Successfully initialized Drive structure for user ${userId}`);
    return { incomingRootId, outgoingRootId, documentationFolderId };
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to initialize Drive structure for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Upload file to user's Google Drive with strict folder routing
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

    // 1. Resolve root folder name and ID
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

    // 2. Determine target folder ID
    let targetFolderId: string;
    let logicalPath: string;

    if (customFolderId) {
      // Use custom folder if provided
      targetFolderId = customFolderId;
      const monthName = getMonthName(letterDateStr);
      logicalPath = `${rootName}/${monthName}/Custom/${originalFileName}`;
    } else {
      // Default routing by file type
      const subfolderName = getSubfolderType(originalFileName, mimeType);
      
      // Check if this is a documentation file that should go to Documentation folder
      if (subfolderName === 'Documentation') {
        const documentationFolderId = user?.documentation_folder_id;
        if (documentationFolderId) {
          targetFolderId = documentationFolderId;
          logicalPath = `Documentation/${originalFileName}`;
        } else {
          // Fallback to PDF routing if Documentation folder doesn't exist
          const { folderName: monthFolderName } = formatMonthFolderName(letterDateStr);
          const monthFolderId = await findOrCreateFolder(drive, monthFolderName, rootFolderId);
          targetFolderId = await findOrCreateFolder(drive, 'PDF', monthFolderId);
          logicalPath = `${rootName}/${monthFolderName}/PDF/${originalFileName}`;
        }
      } else {
        // Standard PDF/Excel routing with monthly organization
        const { folderName: monthFolderName } = formatMonthFolderName(letterDateStr);
        const monthFolderId = await findOrCreateFolder(drive, monthFolderName, rootFolderId);
        targetFolderId = await findOrCreateFolder(drive, subfolderName, monthFolderId);
        logicalPath = `${rootName}/${monthFolderName}/${subfolderName}/${originalFileName}`;
      }
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

    // Make publicly viewable if required for preview
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.warn(`[GoogleDrive] Warning: Could not set anyone-reader permission on file ${fileId}:`, permErr);
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
 * Delete a file from user's Google Drive
 */
export async function deleteUserFile(userId: number, fileId: string): Promise<void> {
  if (!fileId) return;
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId });
    console.log(`[GoogleDrive] Deleted file ${fileId} from user ${userId}'s Drive`);
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to delete file ${fileId} for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
  }
}



/**
 * Update or replace a user's letter file on edit
 * Handles file replacement and moving files when date changes
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
    // If no new file, just return existing info
    if (!newFileBuffer) {
      throw new Error('No new file provided for update');
    }

    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    // Delete old file if it exists
    if (oldDriveId) {
      try {
        await deleteUserFile(userId, oldDriveId);
        console.log(`[GoogleDrive] Deleted old file ${oldDriveId} before upload`);
      } catch (deleteErr) {
        console.warn(`[GoogleDrive] Could not delete old file ${oldDriveId}:`, deleteErr);
        // Continue with upload even if delete fails
      }
    }

    // Upload new file
    const uploadResult = await uploadUserLetterFile(
      userId,
      newFileBuffer,
      originalFileName,
      letterType,
      letterDateStr,
      mimeType,
      customFolderId
    );

    return uploadResult;
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to update user letter file:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Create a custom folder for user in specific month
 */
export async function createCustomFolder(
  userId: number,
  monthName: string,
  folderName: string,
  letterType: 'incoming' | 'outgoing' = 'incoming'
): Promise<{
  folderId: string;
  googleDriveFolderId: string;
  message: string;
}> {
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const user = await findUserById(userId);
    const rootFolderId = letterType === 'incoming' ? user?.drive_folder_id : user?.drive_keluar_folder_id;

    if (!rootFolderId) {
      throw new Error('User Drive structure not initialized. Please connect your Google account.');
    }

    // Get month folder name from month name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex === -1) {
      throw new Error('Invalid month name');
    }

    const currentYY = String(new Date().getFullYear()).slice(-2);
    const monthFolderName = `${String(monthIndex + 1).padStart(2, '0')}-${currentYY}`;
    
    // Get or create month folder
    const monthFolderId = await findOrCreateFolder(drive, monthFolderName, rootFolderId);

    // Check if folder already exists in database
    const existingFolder = await findFolderByDriveId(monthFolderId);
    if (existingFolder) {
      // Check if the specific custom folder already exists
      const customFolders = await findFoldersByUserAndMonth(userId, monthName, letterType);
      const folderExists = customFolders.find(f => f.name === folderName);
      
      if (folderExists) {
        return {
          folderId: folderExists.id?.toString() || '',
          googleDriveFolderId: folderExists.google_drive_folder_id,
          message: 'Folder already exists in the selected month'
        };
      }
    }

    // Create the custom folder in Google Drive
    const customFolderDriveId = await findOrCreateFolder(drive, folderName, monthFolderId);

    // Save to database
    const folder = await createFolder({
      user_id: userId,
      google_drive_folder_id: customFolderDriveId,
      parent_folder_id: monthFolderId,
      name: folderName,
      month: monthName,
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
 * Get custom folders for a specific month
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
  try {
    const folders = await findFoldersByUserAndMonth(userId, monthName, letterType);
    return folders.map(folder => ({
      id: folder.id?.toString() || '',
      name: folder.name,
      google_drive_folder_id: folder.google_drive_folder_id,
    }));
  } catch (error) {
    console.error(`[GoogleDrive] Failed to get monthly folders:`, error);
    return [];
  }
}
