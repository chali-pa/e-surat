import { google, drive_v3 } from 'googleapis';
import path from 'path';
import { Readable } from 'stream';
import { findUserById, updateUserGoogleResourceIds, updateUserStorageSettings } from '../models/User';
import { getOAuth2ClientForUser, GoogleReconnectRequiredError, isGoogleErrorInvalidGrant } from './userGoogleAuthService';
import { createFolder, findFolderByDriveId, findFoldersByUserAndMonth, findFolderById, deleteFolder, findFoldersByUser } from '../models/Folder';

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

export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentId?: string,
  excludeId?: string | null
): Promise<string> {
  const existingId = await findFolderByName(drive, folderName, parentId);
  if (existingId && existingId !== excludeId) {
    console.log(`[GoogleDrive] Found existing folder '${folderName}' with ID: ${existingId}`);
    return existingId;
  }

  console.log(`[GoogleDrive] Folder '${folderName}' not found or excluded under parent '${parentId || 'root'}'. Creating new folder...`);
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
export function getSubfolderType(fileName: string, mimeType?: string): 'Excel' | 'Photos' | 'PDF' {
  const ext = path.extname(fileName).toLowerCase();

  if (['.xlsx', '.xls', '.csv'].includes(ext) || (mimeType && (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')))) {
    return 'Excel';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.svg'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
    return 'Photos';
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

    if (customFolderDriveId) {
      // User specified an explicit target folder (outside default esurat)
      // DO NOT create esurat or esurat-keluar root folders or MM-YY folders!
      let folderName = 'Folder Pilihan';
      try {
        const folderRes = await drive.files.get({
          fileId: customFolderDriveId,
          fields: 'id, name',
        });
        if (folderRes.data.name) {
          folderName = folderRes.data.name;
        }
      } catch (_) {}

      await moveUserFile(userId, fileId, customFolderDriveId);
      return { logicalPath: `${folderName}/${originalFileName}` };
    }

    const rootName = letterType === 'incoming' ? 'esurat' : 'esurat-keluar';
    const user = await findUserById(userId);
    let rootFolderId = letterType === 'incoming' ? user?.drive_folder_id : user?.drive_keluar_folder_id;
    const otherFolderId = letterType === 'incoming' ? user?.drive_keluar_folder_id : user?.drive_folder_id;

    if (rootFolderId && otherFolderId && rootFolderId === otherFolderId) {
      console.warn(`[GoogleDrive] Identical folder ID detected. Resetting rootFolderId for ${letterType}.`);
      rootFolderId = null;
    }

    if (!rootFolderId) {
      rootFolderId = await findOrCreateFolder(drive, rootName, undefined, otherFolderId);
      if (letterType === 'incoming') {
        await updateUserGoogleResourceIds(userId, { drive_folder_id: rootFolderId });
      } else {
        await updateUserGoogleResourceIds(userId, { drive_keluar_folder_id: rootFolderId });
      }
    }

    let targetFolderId: string;
    let logicalPath: string;

    const monthYear = formatMonthYear(letterDateStr);
    const subfolder = getSubfolderType(originalFileName, mimeType);

    const monthFolderId = await findOrCreateFolder(drive, monthYear, rootFolderId);
    targetFolderId = await findOrCreateFolder(drive, subfolder, monthFolderId);
    logicalPath = `${rootName}/${monthYear}/${subfolder}/${originalFileName}`;

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

    // Avoid sharing the same root folder ID
    if (incomingRootId && outgoingRootId && incomingRootId === outgoingRootId) {
      console.warn(`[GoogleDrive] Identical folder ID detected for incoming and outgoing roots. Resetting outgoing.`);
      outgoingRootId = null;
    }

    if (!incomingRootId) {
      incomingRootId = await findOrCreateFolder(drive, 'esurat', undefined, outgoingRootId);
    }

    if (!outgoingRootId) {
      outgoingRootId = await findOrCreateFolder(drive, 'esurat-keluar', undefined, incomingRootId);
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
 * Upload file to user's Google Drive using the official Google Drive Resumable Upload protocol.
 * Supports files up to 50 MB with binary transfer (no Base64 conversion overhead) and automatic retry.
 */
export async function uploadToDriveResumable(
  auth: any,
  fileBuffer: Buffer,
  fileMetadata: { name: string; parents?: string[]; mimeType?: string },
  mimeType: string
): Promise<{ id: string; webViewLink?: string; parents?: string[] }> {
  const fileSize = fileBuffer.length;
  const contentType = mimeType || 'application/octet-stream';

  // Step 1: Initiate resumable session with Google Drive
  const initRes = await auth.request({
    method: 'POST',
    url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,parents',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': contentType,
      'X-Upload-Content-Length': fileSize.toString(),
    },
    data: fileMetadata,
  });

  const sessionUri = initRes.headers?.location || initRes.headers?.['location'];
  if (!sessionUri) {
    throw new Error('Google Drive API did not return a resumable session URI');
  }

  // Step 2: Upload binary buffer to the session URI via native fetch without Authorization header.
  // Google Drive Resumable Upload protocol mandates NO Authorization header on subsequent PUT requests.
  let attempts = 0;
  const maxAttempts = 3;
  let lastErr: any;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const putRes = await fetch(sessionUri, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileSize.toString(),
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
        },
        body: fileBuffer,
      });

      if (!putRes.ok && putRes.status !== 308) {
        const errText = await putRes.text();
        throw new Error(`Google Drive upload returned status ${putRes.status}: ${errText}`);
      }

      const uploadData: any = await putRes.json();
      if (!uploadData?.id) {
        throw new Error('Google Drive upload response missing file ID');
      }
      return uploadData;
    } catch (err: any) {
      lastErr = err;
      if (attempts >= maxAttempts) throw lastErr;
      console.warn(`[GoogleDrive] Resumable upload attempt ${attempts} failed: ${err.message}. Retrying...`);
      await new Promise((r) => setTimeout(r, 1000 * attempts));
    }
  }

  throw lastErr || new Error('Failed to upload file to Google Drive');
}

/**
 * Resolve target folder ID and logical path based on user configuration, letter type, and date.
 */
export async function resolveUserStorageDestination(
  userId: number,
  originalFileName: string,
  letterType: 'incoming' | 'outgoing',
  letterDateStr?: string,
  mimeType?: string,
  customFolderId?: string
): Promise<{
  targetFolderId: string;
  storageDestination: string;
  logicalPath: string;
}> {
  const auth = await getOAuth2ClientForUser(userId);
  const drive = google.drive({ version: 'v3', auth });
  const user = await findUserById(userId);
  const rootName = letterType === 'incoming' ? 'esurat' : 'esurat-keluar';
  const monthYear = formatMonthYear(letterDateStr);
  const subfolder = getSubfolderType(originalFileName, mimeType);

  let targetFolderId = '';
  let storageDestination = '';
  let logicalPath = '';

  if (customFolderId) {
    try {
      const folderRes = await drive.files.get({
        fileId: customFolderId,
        fields: 'id, name, mimeType, trashed',
      });
      if (folderRes.data.trashed) {
        throw new Error(`Folder Google Drive '${folderRes.data.name || customFolderId}' berada di kotak sampah.`);
      }
      if (folderRes.data.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error(`ID '${customFolderId}' bukan sebuah folder Google Drive.`);
      }
      targetFolderId = customFolderId;
      storageDestination = folderRes.data.name || 'Folder Pilihan';
      logicalPath = `${storageDestination}/${originalFileName}`;
    } catch (e: any) {
      console.error(`[GoogleDrive] Custom folder ID ${customFolderId} not accessible:`, e);
      throw new Error(e.message || `Folder Google Drive '${customFolderId}' tidak ditemukan atau tidak dapat diakses.`);
    }
  } else {
    const configuredFolderId = letterType === 'incoming'
      ? user?.incoming_storage_folder_id
      : user?.outgoing_storage_folder_id;
    const configuredFolderName = letterType === 'incoming'
      ? (user?.incoming_storage_folder_name || 'esurat')
      : (user?.outgoing_storage_folder_name || 'esurat-keluar');
    const useMonthlyOrg = letterType === 'incoming'
      ? !!user?.incoming_monthly_organization
      : !!user?.outgoing_monthly_organization;

    const defaultRootId = letterType === 'incoming' ? user?.drive_folder_id : user?.drive_keluar_folder_id;
    const isDefault = !configuredFolderId || configuredFolderId === defaultRootId;

    if (isDefault) {
      let rootFolderId = defaultRootId;
      const otherFolderId = letterType === 'incoming' ? user?.drive_keluar_folder_id : user?.drive_folder_id;

      if (rootFolderId && otherFolderId && rootFolderId === otherFolderId) {
        console.warn(`[GoogleDrive] Identical folder ID detected for incoming and outgoing. Resetting rootFolderId for ${letterType}.`);
        rootFolderId = null;
      }

      if (!rootFolderId) {
        rootFolderId = await findOrCreateFolder(drive, rootName, undefined, otherFolderId);
        if (letterType === 'incoming') {
          await updateUserGoogleResourceIds(userId, { drive_folder_id: rootFolderId });
        } else {
          await updateUserGoogleResourceIds(userId, { drive_keluar_folder_id: rootFolderId });
        }
      }

      const monthFolderId = await findOrCreateFolder(drive, monthYear, rootFolderId);
      targetFolderId = await findOrCreateFolder(drive, subfolder, monthFolderId);
      storageDestination = rootName;
      logicalPath = `${rootName}/${monthYear}/${subfolder}/${originalFileName}`;
    } else {
      try {
        const folderRes = await drive.files.get({
          fileId: configuredFolderId,
          fields: 'id, name, mimeType, trashed',
        });
        if (folderRes.data.trashed) {
          throw new Error(`Folder tujuan penyimpanan Google Drive '${configuredFolderName}' berada di kotak sampah.`);
        }
        if (folderRes.data.mimeType !== 'application/vnd.google-apps.folder') {
          throw new Error(`Folder tujuan penyimpanan Google Drive '${configuredFolderName}' bukan sebuah folder.`);
        }
        const verifiedName = folderRes.data.name || configuredFolderName;
        storageDestination = verifiedName;

        if (useMonthlyOrg) {
          const monthFolderId = await findOrCreateFolder(drive, monthYear, configuredFolderId);
          targetFolderId = await findOrCreateFolder(drive, subfolder, monthFolderId);
          logicalPath = `${verifiedName}/${monthYear}/${subfolder}/${originalFileName}`;
        } else {
          targetFolderId = configuredFolderId;
          logicalPath = `${verifiedName}/${originalFileName}`;
        }
      } catch (folderErr: any) {
        console.error(`[GoogleDrive] Configured storage folder inaccessible for user ${userId}:`, folderErr);
        throw new Error(
          `Folder tujuan penyimpanan Google Drive '${configuredFolderName}' tidak ditemukan atau telah dipindahkan/dihapus di Google Drive. Silakan buka Pengaturan Profil untuk memilih folder tujuan baru.`
        );
      }
    }
  }

  return { targetFolderId, storageDestination, logicalPath };
}

/**
 * Create a server-authorized Google Drive Resumable Upload session.
 * Allows the browser (client) to upload files up to 50 MB (including the 9.15 MB reproduction case)
 * directly to Google Drive without hitting serverless / reverse-proxy body limits (e.g. Vercel 4.5 MB).
 */
export async function createResumableUploadSession(
  userId: number,
  originalFileName: string,
  fileSize: number,
  letterType: 'incoming' | 'outgoing',
  letterDateStr?: string,
  mimeType?: string,
  customFolderId?: string
): Promise<{
  sessionUri: string;
  cleanFileName: string;
  logicalPath: string;
  parentFolderId: string;
  storageDestination: string;
}> {
  console.log(`[GoogleDrive] Creating resumable upload session for user ${userId}: ${originalFileName} (${letterType}) [size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB]`);
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const { targetFolderId, storageDestination, logicalPath } = await resolveUserStorageDestination(
      userId,
      originalFileName,
      letterType,
      letterDateStr,
      mimeType,
      customFolderId
    );

    const contentType = mimeType || 'application/octet-stream';
    const cleanFileName = path.basename(logicalPath);
    const fileMetadata = {
      name: cleanFileName,
      parents: [targetFolderId],
    };

    const initRes = await auth.request({
      method: 'POST',
      url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,parents',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': fileSize.toString(),
      },
      data: fileMetadata,
    });

    const sessionUri = initRes.headers?.location || initRes.headers?.['location'];
    if (!sessionUri) {
      throw new Error('Google Drive API did not return a resumable session URI');
    }

    return {
      sessionUri,
      cleanFileName,
      logicalPath,
      parentFolderId: targetFolderId,
      storageDestination,
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to create resumable upload session:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Create a server-authorized Google Drive Resumable Update session on an existing Drive file.
 * Updates the existing file IN-PLACE without creating new folders (such as esurat/esurat-keluar/MM-YY/PDF).
 * Works for files of any size, including documents and photos larger than 50 MB.
 */
export async function createResumableUpdateSession(
  userId: number,
  existingDriveFileId: string,
  uploadFileName: string,
  fileSize: number,
  mimeType?: string
): Promise<{
  sessionUri: string;
  cleanFileName: string;
  logicalPath: string;
  parentFolderId: string;
  storageDestination: string;
}> {
  console.log(`[GoogleDrive] Creating in-place resumable update session for user ${userId}, fileId ${existingDriveFileId}: ${uploadFileName} [size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB]`);
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    // Verify existing file access and retrieve its current parent folder
    const fileRes = await drive.files.get({
      fileId: existingDriveFileId,
      fields: 'id, name, parents, trashed, mimeType',
    });

    if (fileRes.data.trashed) {
      throw new Error(`File Google Drive yang akan diperbarui berada di kotak sampah.`);
    }

    const currentParentId = fileRes.data.parents?.[0] || '';
    let storageDestination = 'Current Location';
    if (currentParentId) {
      try {
        const parentRes = await drive.files.get({
          fileId: currentParentId,
          fields: 'name',
        });
        if (parentRes.data.name) storageDestination = parentRes.data.name;
      } catch (_) {
        // Fallback to Current Location if parent cannot be inspected
      }
    }

    const contentType = mimeType || fileRes.data.mimeType || 'application/octet-stream';
    const cleanFileName = path.basename(uploadFileName);
    const fileMetadata = {
      name: cleanFileName,
    };

    // Resumable upload for updating an existing file: PATCH on fileId with uploadType=resumable
    const initRes = await auth.request({
      method: 'PATCH',
      url: `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingDriveFileId)}?uploadType=resumable&fields=id,name,webViewLink,parents`,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': fileSize.toString(),
      },
      data: fileMetadata,
    });

    const sessionUri = initRes.headers?.location || initRes.headers?.['location'];
    if (!sessionUri) {
      throw new Error('Google Drive API did not return a resumable session URI for existing file update');
    }

    const logicalPath = `${storageDestination}/${cleanFileName}`;

    return {
      sessionUri,
      cleanFileName,
      logicalPath,
      parentFolderId: currentParentId,
      storageDestination,
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to create resumable update session for existing file ${existingDriveFileId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Update media content of an existing Google Drive file in-place (buffer / stream).
 * Keeps the existing file ID and parent folder without creating new folders.
 */
export async function updateExistingDriveFile(
  userId: number,
  existingDriveFileId: string,
  fileBuffer: Buffer,
  cleanFileName: string,
  mimeType?: string
): Promise<{
  fileId: string;
  webViewLink: string;
  logicalPath: string;
  parentFolderId: string;
  storageDestination: string;
}> {
  console.log(`[GoogleDrive] Updating existing file in-place for user ${userId}: ${existingDriveFileId} (${cleanFileName})`);
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    // Verify existing file access
    const fileRes = await drive.files.get({
      fileId: existingDriveFileId,
      fields: 'id, name, parents, trashed',
    });

    if (fileRes.data.trashed) {
      throw new Error(`File Google Drive yang akan diperbarui berada di kotak sampah.`);
    }

    const currentParentId = fileRes.data.parents?.[0] || '';
    let storageDestination = 'Current Location';
    if (currentParentId) {
      try {
        const parentRes = await drive.files.get({
          fileId: currentParentId,
          fields: 'name',
        });
        if (parentRes.data.name) storageDestination = parentRes.data.name;
      } catch (_) {}
    }

    const contentType = mimeType || 'application/octet-stream';
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    const updateRes = await drive.files.update({
      fileId: existingDriveFileId,
      requestBody: {
        name: cleanFileName,
      },
      media: {
        mimeType: contentType,
        body: stream,
      },
      fields: 'id, name, webViewLink, parents',
    });

    const fileId = updateRes.data.id || existingDriveFileId;
    const webViewLink = updateRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    const logicalPath = `${storageDestination}/${cleanFileName}`;

    return {
      fileId,
      webViewLink,
      logicalPath,
      parentFolderId: currentParentId,
      storageDestination,
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] Failed to update existing file ${existingDriveFileId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Verify and finalize a file uploaded via direct resumable upload session.
 * Confirms the file exists in Google Drive and sets reader permissions.
 */
export async function confirmUploadedDriveFile(
  userId: number,
  fileId: string
): Promise<{
  fileId: string;
  name: string;
  webViewLink: string;
  mimeType?: string;
  parentFolderId?: string;
}> {
  const auth = await getOAuth2ClientForUser(userId);
  const drive = google.drive({ version: 'v3', auth });

  const getRes = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, trashed, webViewLink, parents',
  });

  if (!getRes.data || getRes.data.trashed) {
    throw new Error('File Google Drive tidak ditemukan atau berada di kotak sampah.');
  }

  // Make file viewable
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (permErr) {
    console.warn(`[GoogleDrive] Could not set reader permission on file ${fileId}:`, permErr);
  }

  return {
    fileId: getRes.data.id!,
    name: getRes.data.name || '',
    webViewLink: getRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    mimeType: getRes.data.mimeType || undefined,
    parentFolderId: getRes.data.parents?.[0] || undefined,
  };
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
  parentFolderId: string;
  storageDestination: string;
}> {
  console.log(`[GoogleDrive] Uploading file for user ${userId}: ${originalFileName} (${letterType}) [size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB]`);
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const { targetFolderId, storageDestination, logicalPath } = await resolveUserStorageDestination(
      userId,
      originalFileName,
      letterType,
      letterDateStr,
      mimeType,
      customFolderId
    );

    // Upload file using Resumable Upload protocol (streaming binary, handles up to 50MB reliably)
    const fileMetadata = {
      name: originalFileName,
      parents: [targetFolderId],
    };

    const uploadedFile = await uploadToDriveResumable(
      auth,
      fileBuffer,
      fileMetadata,
      mimeType || 'application/octet-stream'
    );

    const fileId = uploadedFile.id;
    const webViewLink = uploadedFile.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

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

    console.log(`[GoogleDrive] Upload successful! File ID: ${fileId}, targetFolder: ${targetFolderId}, path: ${logicalPath}`);
    return {
      fileId,
      webViewLink,
      logicalPath,
      parentFolderId: targetFolderId,
      storageDestination,
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] Upload failed for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Delete a file from user's Google Drive safely.
 * Strictly verifies the target is a file (never a folder) and deletes ONLY that file ID.
 * Preserves all unrelated files and parent folders completely.
 */
export async function deleteUserFile(userId: number, fileId: string): Promise<void> {
  if (!fileId) return;
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    let fileData: any = null;
    try {
      const getRes = await drive.files.get({ fileId, fields: 'id, name, mimeType' });
      fileData = getRes.data;
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

    // Critical safeguard: Never delete a folder
    if (fileData?.mimeType === 'application/vnd.google-apps.folder') {
      console.error(`[GoogleDrive] CRITICAL REFUSAL: Refusing to delete ${fileId} because it is a folder!`);
      throw new Error(`Operasi dibatalkan: ID '${fileId}' adalah folder Google Drive. Aplikasi E-Surat hanya dapat menghapus file surat.`);
    }

    await drive.files.delete({ fileId });
    console.log(`[GoogleDrive] Safely deleted managed file ${fileId} (${fileData?.name}) from user ${userId}'s Drive`);
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
    let rootFolderId = letterType === 'incoming' ? user?.drive_folder_id : user?.drive_keluar_folder_id;
    const otherFolderId = letterType === 'incoming' ? user?.drive_keluar_folder_id : user?.drive_folder_id;

    if (!rootFolderId || (rootFolderId && otherFolderId && rootFolderId === otherFolderId)) {
      console.warn(`[GoogleDrive] Root folder ID invalid or identical in createCustomFolder. Initializing drive structure.`);
      const provision = await initializeUserDriveStructure(userId);
      rootFolderId = letterType === 'incoming' ? provision.incomingRootId : provision.outgoingRootId;
    }

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

    // Build parent hierarchy — custom folders live directly under their MM-YY folder:
    // esurat/<MM-YY>/<FolderName>
    const parentFolderId = await findOrCreateFolder(drive, cleanedMonth, rootFolderId);

    // Create the custom folder under the month folder in Drive
    const customFolderDriveId = await findOrCreateFolder(drive, folderName.trim(), parentFolderId);

    // Persist to database
    const folder = await createFolder({
      user_id: userId,
      google_drive_folder_id: customFolderDriveId,
      parent_folder_id: parentFolderId,
      name: folderName.trim(),
      month: cleanedMonth,
      folder_type: 'custom',
      letter_type: letterType,
    });

    console.log(`[GoogleDrive] Created folder '${folderName.trim()}' in DB with id ${folder.id}`);

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
 * Validate folder ownership using the local database only.
 *
 * Accepts the folder's database integer ID (as a string — the value sent by the
 * frontend via FormData) and confirms:
 *   1. The row exists in the `folders` table.
 *   2. It belongs to `userId`.
 *   3. Its `letter_type` matches the form being submitted.
 *   4. It has a non-empty `google_drive_folder_id`.
 *
 * No Drive API round-trip is performed here.  The DB row is authoritative proof
 * of ownership — `getMonthlyFolders` already upserts every Drive folder into the
 * DB before it appears in the dropdown, so by the time the user submits the form
 * the row is guaranteed to exist.  Calling `drive.files.get` at this point
 * caused false rejections immediately after folder creation while Drive was still
 * indexing the new item (the original Issue A bug).
 *
 * The `googleDriveFolderId` returned here is passed to `uploadUserLetterFile`,
 * which already calls `drive.files.get` before uploading and will surface a
 * clear error if the folder is trashed or inaccessible.
 */
export async function validateFolderOwnership(
  userId: number,
  folderId: string | number,
  letterType: 'incoming' | 'outgoing' = 'incoming'
): Promise<{ valid: boolean; googleDriveFolderId?: string; dbFolderId?: number }> {
  try {
    const rawId = String(folderId).trim();
    if (!rawId) return { valid: false };

    // 1. Check if numeric database folder ID
    const parsedFolderId = parseInt(rawId, 10);
    if (!isNaN(parsedFolderId) && String(parsedFolderId) === rawId) {
      const dbFolder = await findFolderById(parsedFolderId);
      if (dbFolder && Number(dbFolder.user_id) === Number(userId)) {
        if (dbFolder.google_drive_folder_id && dbFolder.google_drive_folder_id.trim() !== '') {
          return {
            valid: true,
            googleDriveFolderId: dbFolder.google_drive_folder_id,
            dbFolderId: dbFolder.id,
          };
        }
      }
    }

    // 2. Check if rawId is a Google Drive folder ID in the database
    const dbFolderByDrive = await findFolderByDriveId(rawId);
    if (dbFolderByDrive && Number(dbFolderByDrive.user_id) === Number(userId)) {
      return {
        valid: true,
        googleDriveFolderId: dbFolderByDrive.google_drive_folder_id,
        dbFolderId: dbFolderByDrive.id,
      };
    }

    // 3. Check directly in Google Drive with user's OAuth client
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });
    const driveFile = await drive.files.get({
      fileId: rawId,
      fields: 'id, name, mimeType, trashed',
    });

    if (
      driveFile.data &&
      !driveFile.data.trashed &&
      driveFile.data.mimeType === 'application/vnd.google-apps.folder'
    ) {
      let registeredId = dbFolderByDrive?.id;
      if (!registeredId) {
        try {
          const newDb = await createFolder({
            user_id: userId,
            google_drive_folder_id: rawId,
            parent_folder_id: 'root',
            name: driveFile.data.name || 'Folder Pilihan',
            month: formatMonthYear(),
            folder_type: 'custom',
            letter_type: letterType,
          });
          registeredId = newDb.id;
        } catch (regErr) {
          console.warn('[validateFolderOwnership] Could not register folder in DB:', regErr);
        }
      }
      return {
        valid: true,
        googleDriveFolderId: rawId,
        dbFolderId: registeredId,
      };
    }

    return { valid: false };
  } catch (error) {
    console.warn('[validateFolderOwnership] Error checking folder:', error);
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
    let rootFolderId = letterType === 'incoming'
      ? user?.drive_folder_id
      : user?.drive_keluar_folder_id;
    const otherFolderId = letterType === 'incoming'
      ? user?.drive_keluar_folder_id
      : user?.drive_folder_id;

    if (rootFolderId && otherFolderId && rootFolderId === otherFolderId) {
      console.warn(`[GoogleDrive] Identical folder ID detected in getMonthlyFolders. Initializing Drive structure.`);
      const provision = await initializeUserDriveStructure(userId);
      rootFolderId = letterType === 'incoming' ? provision.incomingRootId : provision.outgoingRootId;
    }

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
      // Month folder was deleted or doesn't exist in Google Drive!
      // Synchronize database: clean up custom folders for this deleted month so they disappear from UI
      try {
        const existingDbFolders = await findFoldersByUserAndMonth(userId, cleanedMonth, letterType);
        for (const dbF of existingDbFolders) {
          if (dbF.id) {
            console.log(`[GoogleDrive] Monthly folder '${cleanedMonth}' was deleted from Drive. Removing DB custom folder '${dbF.name}' (${dbF.id})`);
            await deleteFolder(dbF.id);
          }
        }
      } catch (cleanErr) {
        console.warn(`[GoogleDrive] Error cleaning up deleted month folders from DB:`, cleanErr);
      }
      return [];
    }

    // 3. List all folder children of the month folder from Drive
    const driveRes = await drive.files.list({
      q: `'${monthFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, trashed)',
      spaces: 'drive',
      pageSize: 100,
    });

    const systemFolderNames = ['excel', 'photos', 'pdf', 'documentation'];
    const driveFolders = (driveRes.data.files || []).filter(
      (f) => f.id && f.name && !systemFolderNames.includes(f.name.toLowerCase()) && !f.trashed
    );
    const driveFolderMap = new Map(driveFolders.map((f) => [f.id!, f.name!]));

    // 4. Synchronize: Clean up DB folders for this month that no longer exist in Drive
    const existingDbFolders = await findFoldersByUserAndMonth(userId, cleanedMonth, letterType);
    for (const dbF of existingDbFolders) {
      if (!driveFolderMap.has(dbF.google_drive_folder_id)) {
        console.log(`[GoogleDrive] Folder '${dbF.name}' (${dbF.google_drive_folder_id}) was deleted from Drive. Removing from DB.`);
        if (dbF.id) {
          await deleteFolder(dbF.id);
        }
      }
    }

    // 5. Upsert remaining or newly discovered Drive folders into DB and build the result list
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

    // For other transient errors return empty array
    return [];
  }
}

/**
 * Synchronize all monthly folders in user's root folder with Drive.
 * Scans Google Drive root (esurat or esurat-keluar) and returns active monthly folders.
 * Automatically cleans up any custom folder records in DB whose parent monthly folder was deleted from Drive.
 */
export async function syncActiveMonthlyFolders(
  userId: number,
  letterType: 'incoming' | 'outgoing' = 'incoming'
): Promise<Array<{ month: string; driveFolderId: string }>> {
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const user = await findUserById(userId);
    const rootFolderId = letterType === 'incoming' ? user?.drive_folder_id : user?.drive_keluar_folder_id;
    if (!rootFolderId) return [];

    const res = await drive.files.list({
      q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, trashed)',
      spaces: 'drive',
      pageSize: 100,
    });

    const activeMonthFolders: Array<{ month: string; driveFolderId: string }> = [];
    const activeMonths = new Set<string>();

    for (const file of res.data.files || []) {
      if (file.id && file.name && /^\d{2}-\d{2}$/.test(file.name) && !file.trashed) {
        activeMonthFolders.push({ month: file.name, driveFolderId: file.id });
        activeMonths.add(file.name);
      }
    }

    // Clean up any DB folders whose month no longer exists in Drive
    const allDbFolders = await findFoldersByUser(userId);
    for (const dbF of allDbFolders) {
      if (dbF.letter_type === letterType && dbF.month && !activeMonths.has(dbF.month)) {
        console.log(`[GoogleDrive] Monthly folder '${dbF.month}' deleted in Drive. Removing DB folder '${dbF.name}' (${dbF.id})`);
        if (dbF.id) {
          await deleteFolder(dbF.id);
        }
      }
    }

    return activeMonthFolders;
  } catch (err: any) {
    console.error(`[GoogleDrive] Error syncing active monthly folders:`, err);
    if (isGoogleErrorInvalidGrant(err)) {
      throw new GoogleReconnectRequiredError();
    }
    return [];
  }
}

/**
 * List folders in user's Google Drive for the folder browser.
 * Only lists folders belonging to the authenticated user's Google account.
 * Supports navigation from My Drive root or inside a specific parent folder.
 */
export async function listDriveFolders(
  userId: number,
  parentId?: string,
  pageToken?: string
): Promise<{
  folders: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
  }>;
  nextPageToken?: string | null;
  currentFolder: {
    id: string;
    name: string;
    parentId: string | null;
  };
}> {
  try {
    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const isRoot = !parentId || parentId === 'root' || parentId.trim() === '';
    const parentQuery = isRoot ? "'root' in parents" : `'${parentId}' in parents`;
    const q = `${parentQuery} and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    let currentFolder = {
      id: 'root',
      name: 'My Drive',
      parentId: null as string | null,
    };

    if (!isRoot) {
      try {
        const folderRes = await drive.files.get({
          fileId: parentId,
          fields: 'id, name, parents, trashed',
        });
        if (folderRes.data.trashed) {
          throw new Error(`Folder '${folderRes.data.name || parentId}' berada di kotak sampah.`);
        }
        currentFolder = {
          id: folderRes.data.id || parentId,
          name: folderRes.data.name || 'Folder',
          parentId: folderRes.data.parents?.[0] || 'root',
        };
      } catch (err: any) {
        console.error(`[GoogleDrive] Error fetching current folder ${parentId}:`, err);
        throw new Error(`Folder tidak ditemukan atau tidak dapat diakses.`);
      }
    }

    const res = await drive.files.list({
      q,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, parents)',
      orderBy: 'name asc',
      pageSize: 50,
      pageToken: pageToken || undefined,
      spaces: 'drive',
    });

    const folders = (res.data.files || []).map((f) => ({
      id: f.id || '',
      name: f.name || '',
      mimeType: f.mimeType || 'application/vnd.google-apps.folder',
      modifiedTime: f.modifiedTime || undefined,
    }));

    return {
      folders,
      nextPageToken: res.data.nextPageToken || null,
      currentFolder,
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] listDriveFolders error for user ${userId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Get details and validate a folder in Google Drive.
 * Verifies that the folder exists, is not trashed, is a folder (not a file),
 * and that the user has permission to add files to it.
 */
export async function getFolderDetails(
  userId: number,
  folderId: string
): Promise<{
  id: string;
  name: string;
  parentId: string | null;
  canAddChildren: boolean;
  isRoot: boolean;
}> {
  try {
    if (!folderId || folderId === 'root') {
      return {
        id: 'root',
        name: 'My Drive',
        parentId: null,
        canAddChildren: true,
        isRoot: true,
      };
    }

    const auth = await getOAuth2ClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, parents, trashed, capabilities(canAddChildren)',
    });

    if (res.data.trashed) {
      throw new Error(`Folder '${res.data.name || folderId}' berada di kotak sampah (trashed).`);
    }

    if (res.data.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error(`Item '${res.data.name || folderId}' bukan sebuah folder Google Drive.`);
    }

    const canAddChildren = res.data.capabilities?.canAddChildren ?? true;

    return {
      id: res.data.id || folderId,
      name: res.data.name || 'Folder',
      parentId: res.data.parents?.[0] || 'root',
      canAddChildren,
      isRoot: false,
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] getFolderDetails error for folder ${folderId}:`, error);
    if (isGoogleErrorInvalidGrant(error)) {
      throw new GoogleReconnectRequiredError();
    }
    throw error;
  }
}

/**
 * Retrieve parent folder details for breadcrumb / navigation upwards.
 */
export async function getParentFolder(
  userId: number,
  folderId: string
): Promise<{ id: string; name: string } | null> {
  if (!folderId || folderId === 'root') {
    return null;
  }

  try {
    const details = await getFolderDetails(userId, folderId);
    if (!details.parentId || details.parentId === 'root') {
      return { id: 'root', name: 'My Drive' };
    }
    const parentDetails = await getFolderDetails(userId, details.parentId);
    return { id: parentDetails.id, name: parentDetails.name };
  } catch {
    return { id: 'root', name: 'My Drive' };
  }
}

/**
 * Get current storage settings for incoming and outgoing mail.
 * Checks folder accessibility in Google Drive to detect if user moved or deleted folders.
 */
export async function getStorageSettings(userId: number): Promise<{
  incoming: {
    folderId: string | null;
    folderName: string;
    isDefault: boolean;
    useMonthlyOrganization: boolean;
    accessible: boolean;
    warning?: string | null;
  };
  outgoing: {
    folderId: string | null;
    folderName: string;
    isDefault: boolean;
    useMonthlyOrganization: boolean;
    accessible: boolean;
    warning?: string | null;
  };
  defaultIncoming: {
    folderId: string | null;
    folderName: string;
  };
  defaultOutgoing: {
    folderId: string | null;
    folderName: string;
  };
}> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  let drive: drive_v3.Drive | null = null;
  try {
    const auth = await getOAuth2ClientForUser(userId);
    drive = google.drive({ version: 'v3', auth });
  } catch (authErr) {
    console.warn(`[GoogleDrive] Could not get OAuth client for storage settings check:`, authErr);
  }

  const defaultIncomingId = user.drive_folder_id || null;
  const defaultOutgoingId = user.drive_keluar_folder_id || null;

  // Incoming configuration
  const incomingFolderId = user.incoming_storage_folder_id || defaultIncomingId;
  const incomingFolderName = user.incoming_storage_folder_name || 'esurat';
  const incomingIsDefault = !user.incoming_storage_folder_id || user.incoming_storage_folder_id === defaultIncomingId;
  const incomingMonthly = incomingIsDefault ? true : !!user.incoming_monthly_organization;

  let incomingAccessible = true;
  let incomingWarning: string | null = null;

  if (drive && incomingFolderId) {
    try {
      const res = await drive.files.get({ fileId: incomingFolderId, fields: 'id, name, trashed' });
      if (res.data.trashed) {
        incomingAccessible = false;
        incomingWarning = `Folder '${incomingFolderName}' telah dipindahkan ke kotak sampah di Google Drive. Silakan pilih folder penyimpanan baru.`;
      }
    } catch (e: any) {
      if (e.code === 404 || e.status === 404) {
        incomingAccessible = false;
        incomingWarning = `Folder '${incomingFolderName}' tidak ditemukan atau telah dihapus di Google Drive. Silakan pilih folder penyimpanan baru.`;
      }
    }
  }

  // Outgoing configuration
  const outgoingFolderId = user.outgoing_storage_folder_id || defaultOutgoingId;
  const outgoingFolderName = user.outgoing_storage_folder_name || 'esurat-keluar';
  const outgoingIsDefault = !user.outgoing_storage_folder_id || user.outgoing_storage_folder_id === defaultOutgoingId;
  const outgoingMonthly = outgoingIsDefault ? true : !!user.outgoing_monthly_organization;

  let outgoingAccessible = true;
  let outgoingWarning: string | null = null;

  if (drive && outgoingFolderId) {
    try {
      const res = await drive.files.get({ fileId: outgoingFolderId, fields: 'id, name, trashed' });
      if (res.data.trashed) {
        outgoingAccessible = false;
        outgoingWarning = `Folder '${outgoingFolderName}' telah dipindahkan ke kotak sampah di Google Drive. Silakan pilih folder penyimpanan baru.`;
      }
    } catch (e: any) {
      if (e.code === 404 || e.status === 404) {
        outgoingAccessible = false;
        outgoingWarning = `Folder '${outgoingFolderName}' tidak ditemukan atau telah dihapus di Google Drive. Silakan pilih folder penyimpanan baru.`;
      }
    }
  }

  return {
    incoming: {
      folderId: incomingFolderId,
      folderName: incomingFolderName,
      isDefault: incomingIsDefault,
      useMonthlyOrganization: incomingMonthly,
      accessible: incomingAccessible,
      warning: incomingWarning,
    },
    outgoing: {
      folderId: outgoingFolderId,
      folderName: outgoingFolderName,
      isDefault: outgoingIsDefault,
      useMonthlyOrganization: outgoingMonthly,
      accessible: outgoingAccessible,
      warning: outgoingWarning,
    },
    defaultIncoming: {
      folderId: defaultIncomingId,
      folderName: 'esurat',
    },
    defaultOutgoing: {
      folderId: defaultOutgoingId,
      folderName: 'esurat-keluar',
    },
  };
}

/**
 * Update user's storage destination for incoming or outgoing mail.
 * Server-side validates folder existence and access before saving.
 */
export async function updateStorageSettings(
  userId: number,
  payload: {
    letterType: 'incoming' | 'outgoing';
    folderId?: string | null;
    folderName?: string | null;
    useMonthlyOrganization?: boolean;
    resetToDefault?: boolean;
  }
): Promise<ReturnType<typeof getStorageSettings>> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  const { letterType, resetToDefault } = payload;

  if (resetToDefault) {
    if (letterType === 'incoming') {
      await updateUserStorageSettings(userId, {
        incoming_storage_folder_id: null,
        incoming_storage_folder_name: 'esurat',
        incoming_monthly_organization: false,
      });
    } else {
      await updateUserStorageSettings(userId, {
        outgoing_storage_folder_id: null,
        outgoing_storage_folder_name: 'esurat-keluar',
        outgoing_monthly_organization: false,
      });
    }
    return getStorageSettings(userId);
  }

  if (!payload.folderId) {
    throw new Error('folderId diperlukan untuk mengatur tujuan penyimpanan.');
  }

  // Validate folder server-side in Google Drive
  const details = await getFolderDetails(userId, payload.folderId);
  if (!details.canAddChildren) {
    throw new Error(`Anda tidak memiliki izin untuk mengunggah file ke folder '${details.name}'.`);
  }

  const verifiedName = payload.folderName?.trim() || details.name;

  if (letterType === 'incoming') {
    await updateUserStorageSettings(userId, {
      incoming_storage_folder_id: details.id,
      incoming_storage_folder_name: verifiedName,
      incoming_monthly_organization: !!payload.useMonthlyOrganization,
    });
  } else {
    await updateUserStorageSettings(userId, {
      outgoing_storage_folder_id: details.id,
      outgoing_storage_folder_name: verifiedName,
      outgoing_monthly_organization: !!payload.useMonthlyOrganization,
    });
  }

  console.log(`[GoogleDrive] Updated storage settings for user ${userId} (${letterType}): folder=${verifiedName} (${details.id})`);
  return getStorageSettings(userId);
}

/**
 * Rename a Google Drive folder. Validates the folder belongs to the user's
 * Drive tree (accessible via their OAuth token). Preserves contents.
 */
export async function renameDriveFolder(
  userId: number,
  driveId: string,
  newName: string
): Promise<{ id: string; name: string }> {
  if (!newName || !newName.trim()) {
    throw new Error('Nama folder baru tidak boleh kosong.');
  }
  const trimmed = newName.trim();
  const auth = await getOAuth2ClientForUser(userId);
  const drive = google.drive({ version: 'v3', auth });

  // Verify folder is accessible by this user and not trashed
  const existing = await drive.files.get({
    fileId: driveId,
    fields: 'id, name, mimeType, trashed, parents',
  });
  if (existing.data.trashed) {
    throw new Error(`Folder '${existing.data.name}' berada di kotak sampah.`);
  }
  if (existing.data.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error(`'${driveId}' bukan sebuah folder.`);
  }

  // Protect root folders from being renamed to arbitrary names that break app structure
  const user = await findUserById(userId);
  if (driveId === user?.drive_folder_id || driveId === user?.drive_keluar_folder_id) {
    throw new Error('Folder root default (esurat / esurat-keluar) tidak boleh diubah namanya.');
  }

  const updated = await drive.files.update({
    fileId: driveId,
    requestBody: { name: trimmed },
    fields: 'id, name',
  });

  // Update DB folder record if exists
  try {
    const dbFolder = await findFolderByDriveId(driveId);
    if (dbFolder && dbFolder.id) {
      const { updateFolder } = await import('../models/Folder');
      await updateFolder(dbFolder.id, { name: trimmed });
    }
  } catch (dbErr) {
    console.warn(`[GoogleDrive] Note: Could not update DB record for folder ${driveId}:`, dbErr);
  }

  console.log(`[GoogleDrive] Renamed folder ${driveId} to '${trimmed}' for user ${userId}`);
  return { id: updated.data.id!, name: updated.data.name! };
}

/**
 * Move a Google Drive folder to trash. Protects root folders.
 * Never permanently deletes — sets trashed: true via Drive API.
 */
export async function trashDriveFolder(
  userId: number,
  driveId: string
): Promise<void> {
  const auth = await getOAuth2ClientForUser(userId);
  const drive = google.drive({ version: 'v3', auth });

  // Verify folder is accessible and not already trashed
  const existing = await drive.files.get({
    fileId: driveId,
    fields: 'id, name, mimeType, trashed',
  });
  if (existing.data.trashed) {
    throw new Error(`Folder '${existing.data.name}' sudah berada di kotak sampah.`);
  }
  if (existing.data.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error(`'${driveId}' bukan sebuah folder.`);
  }

  // Protect the user's root esurat / esurat-keluar folders
  const user = await findUserById(userId);
  if (
    driveId === user?.drive_folder_id ||
    driveId === user?.drive_keluar_folder_id
  ) {
    throw new Error(
      `Tidak dapat menghapus folder root '${existing.data.name}'. Folder ini diperlukan oleh sistem.`
    );
  }

  // Protect configured root storage destinations
  if (
    driveId === user?.incoming_storage_folder_id ||
    driveId === user?.outgoing_storage_folder_id
  ) {
    throw new Error(
      `Folder '${existing.data.name}' sedang aktif digunakan sebagai tujuan penyimpanan utama. Ubah tujuan penyimpanan terlebih dahulu sebelum menghapus.`
    );
  }

  await drive.files.update({
    fileId: driveId,
    requestBody: { trashed: true },
  });

  // Clean up any database folder entry
  try {
    const dbFolder = await findFolderByDriveId(driveId);
    if (dbFolder && dbFolder.id) {
      await deleteFolder(dbFolder.id);
    }
  } catch (dbErr) {
    console.warn(`[GoogleDrive] Note: Could not delete DB record for folder ${driveId}:`, dbErr);
  }

  console.log(`[GoogleDrive] Moved folder ${driveId} ('${existing.data.name}') to trash for user ${userId}`);
}


