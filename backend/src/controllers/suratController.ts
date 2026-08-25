import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Surat, deleteIncomingLetterRecord, createIncomingLetterRecord, updateIncomingLetterRecord, getAllIncomingLetterRecords, getIncomingLetterRecordById } from '../models/Surat';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { isGoogleErrorInvalidGrant, GoogleReconnectRequiredError, getOAuth2ClientForUser } from '../services/userGoogleAuthService';
import { uploadUserLetterFile, deleteUserFile, moveDriveFileToCorrectFolder, formatMonthFolderName, getMonthName, validateFolderOwnership } from '../services/userGoogleDriveService';
import { findFolderById, findFoldersByUser } from '../models/Folder';
import {
  getIncomingLetterByRow,
  appendIncomingLetterToSheet,
  updateIncomingLetterInSheet,
  deleteIncomingLetterRow,
} from '../services/userGoogleSheetsService';

export const index = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Read from local DB (has folder_id) instead of Google Sheets (no folder info)
    const surats = await getAllIncomingLetterRecords(userId);

    // Build folder id → name map in one query to avoid N+1
    const folderMap: Record<number, string> = {};
    try {
      const folders = await findFoldersByUser(userId);
      for (const f of folders) {
        if (f.id !== undefined) folderMap[f.id] = f.name;
      }
    } catch (folderErr) {
      // Non-fatal: folder names simply won't appear if this fails
      console.warn('[SuratIndex] Could not load folder names:', folderErr);
    }

    // Enrich records with folder_name
    const enriched = surats.map((s) => ({
      ...s,
      folder_name: s.folder_id ? (folderMap[s.folder_id] ?? null) : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error('Get surats error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to fetch surats', details: error.message || error.toString() });
  }
};

export const show = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const suratId = parseInt(id);

    if (isNaN(suratId) || suratId < 1) {
      return res.status(400).json({ error: 'Invalid surat ID' });
    }

    // Use DB lookup so folder_id is always present (Sheets rows have no folder_id column)
    const surat = await getIncomingLetterRecordById(userId, suratId);

    if (!surat) {
      return res.status(404).json({ error: 'Surat not found' });
    }

    // Enrich with folder_name if folder_id is set
    let folder_name: string | null = null;
    if (surat.folder_id) {
      try {
        const folder = await findFolderById(surat.folder_id);
        if (folder && folder.user_id === userId) {
          folder_name = folder.name;
        }
      } catch {
        // Non-fatal
      }
    }

    res.json({ success: true, data: { ...surat, folder_name }, surat: { ...surat, folder_name } });
  } catch (error: any) {
    console.error('Get surat error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to fetch surat' });
  }
};

export const store = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { nomor_surat, nama_pengirim, nama_surat, tanggal_masuk, tanggal_buat, folder_id } = req.body;

    if (!nomor_surat || !nama_pengirim || !nama_surat || !tanggal_masuk || !tanggal_buat) {
      return res.status(400).json({
        error: 'Semua field wajib diisi',
        message: 'Nomor surat, nama pengirim, nama surat, tanggal masuk, dan tanggal buat harus diisi',
        missing_fields: {
          nomor_surat: !nomor_surat,
          nama_pengirim: !nama_pengirim,
          nama_surat: !nama_surat,
          tanggal_masuk: !tanggal_masuk,
          tanggal_buat: !tanggal_buat,
        },
      });
    }

    let googleDriveId = '';
    let webViewLink = '';
    let logicalPath = '';
    let customFolderDriveId: string | undefined;

    // Verify folder ownership server-side if folder_id is provided
    if (folder_id) {
      const validation = await validateFolderOwnership(userId, folder_id, 'incoming');
      if (!validation.valid) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Folder yang dipilih tidak valid atau tidak dimiliki oleh akun Anda.',
        });
      }
      customFolderDriveId = validation.googleDriveFolderId;
    }

    if (req.file) {
      const originalName = req.file.originalname || `${nomor_surat}_${Date.now()}`;
      const ext = path.extname(originalName) || '.pdf';
      const cleanFileName = `${nomor_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${nama_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${Date.now()}${ext}`;

      console.log('Uploading file to user Drive:', cleanFileName);

      try {
        const uploadResult = await uploadUserLetterFile(
          userId,
          req.file.buffer,
          cleanFileName,
          'incoming',
          tanggal_masuk,
          req.file.mimetype,
          customFolderDriveId
        );

        googleDriveId = uploadResult.fileId;
        webViewLink = uploadResult.webViewLink;
        logicalPath = uploadResult.logicalPath;
      } catch (uploadError: any) {
        console.error('Google Drive upload error:', uploadError);
        if (isGoogleErrorInvalidGrant(uploadError)) {
          return res.status(401).json({
            error_code: 'GOOGLE_RECONNECT_REQUIRED',
            error: 'Koneksi Google perlu diperbarui',
            message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
          });
        }
        return res.status(500).json({
          error: 'Gagal mengunggah file ke Google Drive',
          message: uploadError.message || 'Gagal mengunggah file ke Google Drive user',
          details: uploadError.toString(),
        });
      }
    }

    const surat: Surat = {
      nomor_surat: nomor_surat.trim(),
      nama_pengirim: nama_pengirim.trim(),
      nama_surat: nama_surat.trim(),
      tanggal_masuk: tanggal_masuk.trim(),
      tanggal_buat: tanggal_buat.trim(),
      google_drive_id: googleDriveId,
      file_path: logicalPath || webViewLink,
      user_id: userId,
      folder_id: folder_id ? parseInt(folder_id) : undefined,
      created_at: new Date().toISOString(),
    };

    console.log('Appending letter record to user Google Sheet...');
    try {
      const uniqueRowId = await appendIncomingLetterToSheet(userId, surat);
      surat.id = uniqueRowId;
      console.log('Google Sheet append successful with ID:', uniqueRowId);

      // Save to local DB record as well
      try {
        await createIncomingLetterRecord(surat);
      } catch (dbErr) {
        console.warn('DB record sync warning:', dbErr);
      }
    } catch (sheetError: any) {
      console.error('Google Sheet append failed:', sheetError);

      if (googleDriveId) {
        try {
          await deleteUserFile(userId, googleDriveId);
          console.log('Cleaned up file from Drive due to sheet append failure');
        } catch (cleanupErr) {
          console.error('Clean up drive file error:', cleanupErr);
        }
      }

      if (isGoogleErrorInvalidGrant(sheetError)) {
        return res.status(401).json({
          error_code: 'GOOGLE_RECONNECT_REQUIRED',
          error: 'Koneksi Google perlu diperbarui',
          message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
        });
      }

      return res.status(500).json({
        error: 'Gagal menyimpan ke Google Sheet',
        message: sheetError.message || 'Gagal menyimpan data surat ke Google Sheet user',
        details: sheetError.toString(),
      });
    }

    console.log('=== STORE SURAT MASUK SUCCESS ===');
    res.status(201).json({
      success: true,
      message: 'File created and uploaded to Google Drive successfully.',
      surat,
      data: surat,
    });
  } catch (error: any) {
    console.error('=== STORE SURAT MASUK FAILED ===', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({
      error: error.message || 'Failed to create surat',
      message: 'Gagal menyimpan surat. Silakan coba lagi.',
      details: error.toString(),
    });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const rowNumber = parseInt(id);

    if (isNaN(rowNumber) || rowNumber < 1) {
      return res.status(400).json({ error: 'Invalid surat ID' });
    }

    const { nomor_surat, nama_pengirim, nama_surat, tanggal_masuk, tanggal_buat, folder_id } = req.body;

    const oldSurat = await getIncomingLetterRecordById(userId, rowNumber);
    if (!oldSurat) {
      return res.status(404).json({ error: 'Surat not found' });
    }

    let googleDriveId = oldSurat.google_drive_id || '';
    let webViewLink = oldSurat.file_path || '';
    let logicalPath = oldSurat.file_path || '';
    let customFolderDriveId: string | undefined;

    if (folder_id) {
      const validation = await validateFolderOwnership(userId, folder_id, 'incoming');
      if (!validation.valid) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Folder yang dipilih tidak valid atau tidak dimiliki oleh akun Anda.',
        });
      }
      customFolderDriveId = validation.googleDriveFolderId;
    }

    if (req.file) {
      const originalName = req.file.originalname || `${nomor_surat}_${Date.now()}`;
      const ext = path.extname(originalName) || '.pdf';
      const cleanFileName = `${nomor_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${nama_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${Date.now()}${ext}`;

      try {
        if (oldSurat.google_drive_id) {
          try {
            await deleteUserFile(userId, oldSurat.google_drive_id);
          } catch (deleteErr) {
            console.warn(`[GoogleDrive] Failed to delete old file during update:`, deleteErr);
          }
        }

        const uploadResult = await uploadUserLetterFile(
          userId,
          req.file.buffer,
          cleanFileName,
          'incoming',
          tanggal_masuk,
          req.file.mimetype,
          customFolderDriveId
        );

        googleDriveId = uploadResult.fileId;
        webViewLink = uploadResult.webViewLink;
        logicalPath = uploadResult.logicalPath;
      } catch (uploadError: any) {
        if (isGoogleErrorInvalidGrant(uploadError)) {
          return res.status(401).json({
            error_code: 'GOOGLE_RECONNECT_REQUIRED',
            error: 'Koneksi Google perlu diperbarui',
            message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
          });
        }
        throw uploadError;
      }
    } else if (oldSurat.google_drive_id) {
      const oldMonth = getMonthName(oldSurat.tanggal_masuk);
      const newMonth = getMonthName(tanggal_masuk);
      const folderChanged = String(oldSurat.folder_id || '') !== String(folder_id || '');

      if (oldMonth !== newMonth || folderChanged) {
        console.log(`[GoogleDrive] Date or folder changed. Moving file in Google Drive...`);
        try {
          const fileName = oldSurat.file_path ? path.basename(oldSurat.file_path) : `${nomor_surat}_file.pdf`;
          const moveResult = await moveDriveFileToCorrectFolder(
            userId,
            oldSurat.google_drive_id,
            fileName,
            'incoming',
            tanggal_masuk,
            undefined,
            customFolderDriveId
          );
          logicalPath = moveResult.logicalPath;
        } catch (moveError: any) {
          console.error(`[GoogleDrive] Move file failed:`, moveError);
          if (isGoogleErrorInvalidGrant(moveError)) {
            return res.status(401).json({
              error_code: 'GOOGLE_RECONNECT_REQUIRED',
              error: 'Koneksi Google perlu diperbarui',
              message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
            });
          }
          throw moveError;
        }
      }
    }

    const surat: Surat = {
      id: rowNumber,
      nomor_surat,
      nama_pengirim,
      nama_surat,
      tanggal_masuk,
      tanggal_buat,
      google_drive_id: googleDriveId,
      file_path: logicalPath,
      folder_id: folder_id ? parseInt(folder_id) : undefined,
      updated_at: new Date().toISOString(),
    };

    await updateIncomingLetterInSheet(userId, rowNumber, surat);

    try {
      await updateIncomingLetterRecord(rowNumber, userId, surat);
    } catch (dbErr) {
      console.warn('DB record update sync warning:', dbErr);
    }

    res.json({ success: true, message: 'Surat updated successfully', surat, data: surat });
  } catch (error: any) {
    console.error('Update surat error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to update surat' });
  }
};

/**
 * Delete a letter: Drive file first -> then Sheets & local DB record.
 * If Drive deletion fails due to real error, abort and inform user.
 */
export const destroy = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const rowNumber = parseInt(id);

    if (isNaN(rowNumber) || rowNumber < 1) {
      return res.status(400).json({ error: 'Invalid surat ID' });
    }

    const surat = await getIncomingLetterRecordById(userId, rowNumber);
    if (!surat) {
      return res.status(404).json({ error: 'Surat not found' });
    }

    const driveFileId = extractDriveFileId(surat);

    // 1. Delete file from Google Drive first
    if (driveFileId) {
      try {
        await deleteUserFile(userId, driveFileId);
      } catch (driveErr: any) {
        console.error('Google Drive file deletion failed:', driveErr);

        if (isGoogleErrorInvalidGrant(driveErr)) {
          return res.status(401).json({
            error_code: 'GOOGLE_RECONNECT_REQUIRED',
            error: 'Koneksi Google perlu diperbarui',
            message: 'Google Drive authentication has expired. Please reconnect your Google account.',
          });
        }

        return res.status(500).json({
          success: false,
          error: 'The record could not be fully deleted because the Google Drive file could not be removed.',
          details: driveErr.message || driveErr.toString(),
        });
      }
    }

    // 2. Drive deletion succeeded or file was already missing (404) -> Clean up Sheets & local DB
    await deleteIncomingLetterRow(userId, rowNumber, undefined);

    try {
      await deleteIncomingLetterRecord(userId, rowNumber);
    } catch (dbErr) {
      console.warn('Local DB record deletion warning:', dbErr);
    }

    res.json({
      success: true,
      message: 'File deleted successfully from the application and Google Drive.',
    });
  } catch (error: any) {
    console.error('Delete surat error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Google Drive authentication has expired. Please reconnect your Google account.',
      });
    }
    res.status(500).json({
      success: false,
      error: 'The record could not be fully deleted because the Google Drive file could not be removed.',
      details: error.message || error.toString(),
    });
  }
};

export function extractDriveFileId(surat: { google_drive_id?: string; file_path?: string }): string {
  if (surat.google_drive_id && surat.google_drive_id.trim()) {
    return surat.google_drive_id.trim();
  }

  const fileStr = surat.file_path || '';
  if (!fileStr) return '';

  const matchFileD = fileStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  const matchQueryId = fileStr.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchQueryId && matchQueryId[1]) return matchQueryId[1];

  if (/^[a-zA-Z0-9_-]{25,}$/.test(fileStr.trim())) {
    return fileStr.trim();
  }

  return '';
}

export const preview = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const suratId = parseInt(id);

    if (isNaN(suratId) || suratId < 1) {
      return res.status(400).json({ error: 'Invalid surat ID' });
    }

    const surat = await getIncomingLetterRecordById(userId, suratId);
    if (!surat) {
      return res.status(404).json({ error: 'Surat not found' });
    }

    const resolvedDriveId = extractDriveFileId(surat);

    res.json({
      success: true,
      surat: {
        ...surat,
        google_drive_id: resolvedDriveId || surat.google_drive_id,
        preview_url: surat.file_path,
      },
    });
  } catch (error: any) {
    console.error('Preview surat error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to preview surat' });
  }
};

export const serveFile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const suratId = parseInt(id);

    if (isNaN(suratId) || suratId < 1) {
      return res.status(400).json({ error: 'Invalid surat ID' });
    }

    const surat = await getIncomingLetterRecordById(userId, suratId);
    if (!surat) {
      return res.status(404).json({ 
        error: 'Surat not found',
        error_code: 'LETTER_NOT_FOUND'
      });
    }

    let fileId = extractDriveFileId(surat);

    let drive: any = null;
    try {
      const auth = await getOAuth2ClientForUser(userId);
      drive = google.drive({ version: 'v3', auth });
    } catch (authErr: any) {
      console.error('OAuth client creation error:', authErr);
      if (isGoogleErrorInvalidGrant(authErr)) {
        return res.status(401).json({
          error_code: 'GOOGLE_RECONNECT_REQUIRED',
          error: 'Koneksi Google perlu diperbarui',
          message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
        });
      }
    }

    if (!fileId && drive && surat.nama_surat) {
      try {
        const safeName = surat.nama_surat.replace(/'/g, "\\'");
        const searchRes = await drive.files.list({
          q: `trashed = false and name contains '${safeName}'`,
          pageSize: 1,
          fields: 'files(id, name, mimeType)',
        });
        if (searchRes.data.files && searchRes.data.files.length > 0) {
          fileId = searchRes.data.files[0].id;
        }
      } catch (searchErr) {
        console.warn('[serveFile] Drive search fallback failed:', searchErr);
      }
    }

    if (!fileId) {
      const rawPath = surat.file_path || '';
      const possibleLocalPaths: string[] = [];
      if (rawPath) possibleLocalPaths.push(rawPath);
      if (rawPath) possibleLocalPaths.push(path.join(__dirname, '../../uploads', path.basename(rawPath)));

      for (const localP of possibleLocalPaths) {
        if (fs.existsSync(localP)) {
          return res.sendFile(path.resolve(localP));
        }
      }

      return res.status(404).json({ 
        error: 'File tidak ditemukan di Google Drive atau penyimpanan server',
        error_code: 'NO_DRIVE_ID'
      });
    }

    let metaRes;
    try {
      metaRes = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size',
      });
    } catch (driveError: any) {
      console.error('Drive file metadata fetch error:', driveError);
      
      if (driveError.code === 404 || driveError.status === 404) {
        const rawPath = surat.file_path || '';
        const possibleLocalPaths: string[] = [];
        if (rawPath) possibleLocalPaths.push(rawPath);
        if (rawPath) possibleLocalPaths.push(path.join(__dirname, '../../uploads', path.basename(rawPath)));

        for (const localP of possibleLocalPaths) {
          if (fs.existsSync(localP)) {
            return res.sendFile(path.resolve(localP));
          }
        }

        return res.status(404).json({ 
          error: 'File tidak ditemukan di Google Drive',
          error_code: 'FILE_NOT_FOUND_IN_DRIVE'
        });
      }
      
      if (driveError.code === 403) {
        return res.status(403).json({ 
          error: 'Akun Google yang terhubung tidak memiliki izin untuk mengakses file ini',
          error_code: 'PERMISSION_DENIED'
        });
      }
      
      if (isGoogleErrorInvalidGrant(driveError)) {
        return res.status(401).json({
          error_code: 'GOOGLE_RECONNECT_REQUIRED',
          error: 'Koneksi Google perlu diperbarui',
          message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
        });
      }
      
      return res.status(502).json({ 
        error: 'Gagal mengambil file dari Google Drive. Silakan coba lagi.',
        error_code: 'DRIVE_API_ERROR'
      });
    }

    const fileName = metaRes.data.name || 'document';
    const mimeType = metaRes.data.mimeType || 'application/octet-stream';

    let responseMimeType = mimeType;
    if (!responseMimeType || responseMimeType === 'application/octet-stream') {
      const ext = path.extname(fileName).toLowerCase();
      if (ext === '.pdf') responseMimeType = 'application/pdf';
      else if (ext === '.xlsx') responseMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (ext === '.xls') responseMimeType = 'application/vnd.ms-excel';
      else if (ext === '.csv') responseMimeType = 'text/csv';
      else if (ext === '.docx') responseMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.doc') responseMimeType = 'application/msword';
      else if (ext === '.png') responseMimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') responseMimeType = 'image/jpeg';
      else if (ext === '.webp') responseMimeType = 'image/webp';
    }

    const googleMimeExportMap: Record<string, { mime: string; ext: string }> = {
      'application/vnd.google-apps.document': { mime: 'application/pdf', ext: '.pdf' },
      'application/vnd.google-apps.spreadsheet': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
      'application/vnd.google-apps.presentation': { mime: 'application/pdf', ext: '.pdf' },
    };

    const isDispositionAttachment = req.query.disposition === 'attachment';
    const dispositionType = isDispositionAttachment ? 'attachment' : 'inline';

    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, X-File-Name');
    res.setHeader('X-File-Name', encodeURIComponent(fileName));

    const buildContentDisposition = (disposition: string, name: string) => {
      const safeName = name.replace(/["\\]/g, '_');
      return `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(name)}`;
    };

    try {
      if (googleMimeExportMap[mimeType]) {
        const exportInfo = googleMimeExportMap[mimeType];
        const exportName = fileName.endsWith(exportInfo.ext) ? fileName : `${fileName}${exportInfo.ext}`;

        const exportRes = await drive.files.export(
          { fileId, mimeType: exportInfo.mime },
          { responseType: 'stream' }
        );

        res.setHeader('Content-Type', exportInfo.mime);
        res.setHeader('Content-Disposition', buildContentDisposition(dispositionType, exportName));
        res.setHeader('Cache-Control', 'private, no-cache');
        (exportRes.data as any).pipe(res);
      } else {
        const fileRes = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' }
        );

        res.setHeader('Content-Type', responseMimeType);
        res.setHeader('Content-Disposition', buildContentDisposition(dispositionType, fileName));
        res.setHeader('Cache-Control', 'private, no-cache');
        (fileRes.data as any).pipe(res);
      }
    } catch (streamError: any) {
      console.error('Drive file stream error:', streamError);
      
      if (isGoogleErrorInvalidGrant(streamError)) {
        return res.status(401).json({
          error_code: 'GOOGLE_RECONNECT_REQUIRED',
          error: 'Koneksi Google perlu diperbarui',
          message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
        });
      }
      
      if (!res.headersSent) {
        res.status(502).json({ 
          error: 'Gagal mengambil konten file dari Google Drive. Silakan coba lagi.',
          error_code: 'DRIVE_STREAM_ERROR'
        });
      }
    }
  } catch (error: any) {
    console.error('Serve file error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Terjadi kesalahan saat menyajikan file',
        error_code: 'SERVER_ERROR'
      });
    }
  }
};
