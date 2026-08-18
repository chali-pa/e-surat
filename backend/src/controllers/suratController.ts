import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Surat } from '../models/Surat';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { isGoogleErrorInvalidGrant, GoogleReconnectRequiredError, getOAuth2ClientForUser } from '../services/userGoogleAuthService';
import { uploadUserLetterFile, deleteUserFile, moveDriveFileToCorrectFolder, formatMonthFolderName } from '../services/userGoogleDriveService';
import {
  getAllIncomingLetters,
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

    const surats = await getAllIncomingLetters(userId);
    res.json({ success: true, data: surats });
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
    const rowNumber = parseInt(id);

    if (isNaN(rowNumber) || rowNumber < 1) {
      return res.status(400).json({ error: 'Invalid surat ID' });
    }

    const surat = await getIncomingLetterByRow(userId, rowNumber);

    if (!surat) {
      return res.status(404).json({ error: 'Surat not found' });
    }

    res.json({ success: true, data: surat, surat });
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

  let filePath = '';

  try {
    console.log('=== STORE SURAT MASUK REQUEST START ===');
    console.log('User ID:', userId);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? req.file.filename : 'No file');

    const { nomor_surat, nama_pengirim, nama_surat, tanggal_masuk, tanggal_buat } = req.body;

    // Validate required fields
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

    if (req.file) {
      filePath = req.file.path;
      const originalName = req.file.originalname || `${nomor_surat}_${Date.now()}`;
      const ext = path.extname(originalName) || '.pdf';
      const cleanFileName = `${nomor_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${nama_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${Date.now()}${ext}`;

      console.log('Uploading file to user Drive:', cleanFileName);

      try {
        const uploadResult = await uploadUserLetterFile(
          userId,
          filePath,
          cleanFileName,
          'incoming',
          tanggal_masuk,
          req.file.mimetype
        );

        googleDriveId = uploadResult.fileId;
        webViewLink = uploadResult.webViewLink;
        logicalPath = uploadResult.logicalPath;

        // Clean up local temp file after upload
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (uploadError: any) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
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
      created_at: new Date().toISOString(),
    };

    console.log('Appending letter record to user Google Sheet...');
    try {
      const uniqueRowId = await appendIncomingLetterToSheet(userId, surat);
      surat.id = uniqueRowId;
      console.log('Google Sheet append successful with ID:', uniqueRowId);
    } catch (sheetError: any) {
      console.error('Google Sheet append failed:', sheetError);

      // Rollback uploaded file if sheet append fails
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
      message: 'Surat created successfully',
      surat,
      data: surat,
    });
  } catch (error: any) {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
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

    const { nomor_surat, nama_pengirim, nama_surat, tanggal_masuk, tanggal_buat } = req.body;

    const oldSurat = await getIncomingLetterByRow(userId, rowNumber);
    if (!oldSurat) {
      return res.status(404).json({ error: 'Surat not found' });
    }

    let googleDriveId = oldSurat.google_drive_id || '';
    let webViewLink = oldSurat.file_path || '';
    let logicalPath = oldSurat.file_path || '';

    if (req.file) {
      const filePath = req.file.path;
      const originalName = req.file.originalname || `${nomor_surat}_${Date.now()}`;
      const ext = path.extname(originalName) || '.pdf';
      const cleanFileName = `${nomor_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${nama_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${Date.now()}${ext}`;

      try {
        if (oldSurat.google_drive_id) {
          try {
            await deleteUserFile(userId, oldSurat.google_drive_id);
          } catch (deleteErr) {
            console.warn(`[GoogleDrive] Failed to delete old file:`, deleteErr);
          }
        }

        const uploadResult = await uploadUserLetterFile(
          userId,
          filePath,
          cleanFileName,
          'incoming',
          tanggal_masuk,
          req.file.mimetype
        );

        googleDriveId = uploadResult.fileId;
        webViewLink = uploadResult.webViewLink;
        logicalPath = uploadResult.logicalPath;

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (uploadError: any) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
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
      const oldMonth = formatMonthFolderName(oldSurat.tanggal_masuk).folderName;
      const newMonth = formatMonthFolderName(tanggal_masuk).folderName;

      if (oldMonth !== newMonth) {
        console.log(`[GoogleDrive] Date changed from ${oldSurat.tanggal_masuk} to ${tanggal_masuk}. Moving file...`);
        try {
          const fileName = oldSurat.file_path ? path.basename(oldSurat.file_path) : `${nomor_surat}_file.pdf`;
          const moveResult = await moveDriveFileToCorrectFolder(
            userId,
            oldSurat.google_drive_id,
            fileName,
            'incoming',
            tanggal_masuk
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
      updated_at: new Date().toISOString(),
    };

    await updateIncomingLetterInSheet(userId, rowNumber, surat);

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

    const surat = await getIncomingLetterByRow(userId, rowNumber);
    if (!surat) {
      return res.status(404).json({ error: 'Surat not found' });
    }

    await deleteIncomingLetterRow(userId, rowNumber, surat.google_drive_id);
    res.json({ success: true, message: 'Surat deleted successfully' });
  } catch (error: any) {
    console.error('Delete surat error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to delete surat' });
  }
};

/**
 * Helper to extract Google Drive File ID from surat record
 */
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

    const surat = await getIncomingLetterByRow(userId, suratId);
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

/**
 * Serve the actual file from Google Drive (or local storage fallback) for this letter.
 * Supports ?disposition=attachment (download) or default inline (view/preview/print).
 */
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

    // Verify ownership — letter must belong to authenticated user
    const surat = await getIncomingLetterByRow(userId, suratId);
    if (!surat) {
      return res.status(404).json({ 
        error: 'Surat not found',
        error_code: 'LETTER_NOT_FOUND'
      });
    }

    let fileId = extractDriveFileId(surat);

    // Get authenticated Google Drive client for this user
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

    // If fileId is missing, attempt Google Drive search by name before checking local
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
          console.log(`[serveFile] Located missing fileId in Drive via name search: ${fileId}`);
        }
      } catch (searchErr) {
        console.warn('[serveFile] Drive search fallback failed:', searchErr);
      }
    }

    // Check local storage fallback if no Drive ID exists
    if (!fileId) {
      const rawPath = surat.file_path || '';
      const possibleLocalPaths: string[] = [];
      if (rawPath) possibleLocalPaths.push(rawPath);
      if (rawPath) possibleLocalPaths.push(path.join(__dirname, '../../uploads', path.basename(rawPath)));

      for (const localP of possibleLocalPaths) {
        if (fs.existsSync(localP)) {
          console.log(`[serveFile] Serving file from local disk fallback: ${localP}`);
          return res.sendFile(path.resolve(localP));
        }
      }

      return res.status(404).json({ 
        error: 'File tidak ditemukan di Google Drive atau penyimpanan server',
        error_code: 'NO_DRIVE_ID'
      });
    }

    // Retrieve file metadata to get name and mimeType
    let metaRes;
    try {
      metaRes = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size',
      });
    } catch (driveError: any) {
      console.error('Drive file metadata fetch error:', driveError);
      
      // Handle specific Drive API errors
      if (driveError.code === 404) {
        // Local disk check if Drive returns 404
        const rawPath = surat.file_path || '';
        const possibleLocalPaths: string[] = [];
        if (rawPath) possibleLocalPaths.push(rawPath);
        if (rawPath) possibleLocalPaths.push(path.join(__dirname, '../../uploads', path.basename(rawPath)));

        for (const localP of possibleLocalPaths) {
          if (fs.existsSync(localP)) {
            console.log(`[serveFile] Drive file 404, serving from local disk: ${localP}`);
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
      
      // Generic Drive API error
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

    // Google Docs / Sheets / Slides are Google native formats — export them
    const googleMimeExportMap: Record<string, { mime: string; ext: string }> = {
      'application/vnd.google-apps.document': { mime: 'application/pdf', ext: '.pdf' },
      'application/vnd.google-apps.spreadsheet': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
      'application/vnd.google-apps.presentation': { mime: 'application/pdf', ext: '.pdf' },
    };

    const isDispositionAttachment = req.query.disposition === 'attachment';
    const dispositionType = isDispositionAttachment ? 'attachment' : 'inline';

    // Allow iframe embedding from same origin only & expose headers
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, X-File-Name');
    res.setHeader('X-File-Name', encodeURIComponent(fileName));

    // Helper: RFC 5987 filename encoding for Content-Disposition
    const buildContentDisposition = (disposition: string, name: string) => {
      const safeName = name.replace(/["\\]/g, '_');
      return `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(name)}`;
    };

    try {
      if (googleMimeExportMap[mimeType]) {
        // Export Google native file
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
        // Download binary file
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
    console.error('Serve file (incoming) error:', error);
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
