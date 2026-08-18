import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { findUserById, updateUserGoogleResourceIds } from '../models/User';
import { getOAuth2ClientForUser, GoogleReconnectRequiredError, isGoogleErrorInvalidGrant } from './userGoogleAuthService';

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
  filePath: string,
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

  return uploadUserLetterFile(userId, filePath, originalFileName, letterType, letterDateStr, mimeType);
}

/**
 * Determine subfolder based on file extension / mime type
 */
export function getSubfolderType(fileName: string, mimeType?: string): 'Excel' | 'Photos' | 'PDF' {
  const ext = path.extname(fileName).toLowerCase();

  if (['.xlsx', '.xls', '.csv'].includes(ext) || (mimeType && mimeType.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv'))) {
    return 'Excel';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
    return 'Photos';
  }

  // Default for PDF, DOC, DOCX, and others
  return 'PDF';
}

/**
 * Ensure standard user drive structure exists (esurat, esurat-keluar, 12 month folders, subfolders)
 */
export async function initializeUserDriveStructure(userId: number): Promise<{
  incomingRootId: string;
  outgoingRootId: string;
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

    // Save root IDs in DB
    await updateUserGoogleResourceIds(userId, {
      drive_folder_id: incomingRootId,
      drive_keluar_folder_id: outgoingRootId,
    });

    // 3. Create 12 month folders and 3 subfolders under each root folder
    const currentYY = String(new Date().getFullYear()).slice(-2);
    const subfolders: ('Excel' | 'Photos' | 'PDF')[] = ['Excel', 'Photos', 'PDF'];

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
    return { incomingRootId, outgoingRootId };
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
  filePath: string,
  originalFileName: string,
  letterType: 'incoming' | 'outgoing',
  letterDateStr?: string,
  mimeType?: string
): Promise<{
  fileId: string;
  webViewLink: string;
  logicalPath: string;
}> {
  console.log(`[GoogleDrive] Uploading file for user ${userId}: ${originalFileName} (${letterType})`);
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file not found at: ${filePath}`);
    }

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

    // 2. Resolve month folder (MM-MM-YY)
    const { folderName: monthFolderName } = formatMonthFolderName(letterDateStr);
    const monthFolderId = await findOrCreateFolder(drive, monthFolderName, rootFolderId);

    // 3. Resolve subfolder (Excel / Photos / PDF)
    const subfolderName = getSubfolderType(originalFileName, mimeType);
    const subfolderId = await findOrCreateFolder(drive, subfolderName, monthFolderId);

    // Logical path string e.g. esurat/07-07-27/PDF/my_file.pdf
    const logicalPath = `${rootName}/${monthFolderName}/${subfolderName}/${originalFileName}`;

    // 4. Upload file to target subfolder
    const fileMetadata = {
      name: originalFileName,
      parents: [subfolderId],
    };

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: fs.createReadStream(filePath),
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
  newFilePath: string | undefined,
  originalFileName: string,
  letterType: 'incoming' | 'outgoing',
  letterDateStr: string,
  mimeType?: string
): Promise<{
  fileId: string;
  webViewLink: string;
  logicalPath: string;
}> {
  try {
    // If no new file, just return existing info
    if (!newFilePath) {
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
      newFilePath,
      originalFileName,
      letterType,
      letterDateStr,
      mimeType
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
