import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Surat, deleteIncomingLetterRecord, createIncomingLetterRecord, updateIncomingLetterRecord, getAllIncomingLetterRecords, getIncomingLetterRecordById, getIncomingLetterRecordsByMonth } from '../models/Surat';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { isGoogleErrorInvalidGrant, GoogleReconnectRequiredError, getOAuth2ClientForUser } from '../services/userGoogleAuthService';
import { uploadUserLetterFile, deleteUserFile, moveDriveFileToCorrectFolder, formatMonthFolderName, getMonthName, validateFolderOwnership, createResumableUploadSession, confirmUploadedDriveFile, createResumableUpdateSession, updateExistingDriveFile } from '../services/userGoogleDriveService';
import { MAX_MAIL_UPLOAD_SIZE_BYTES, MAX_MAIL_UPLOAD_SIZE_MB, MAX_MULTIPART_UPLOAD_SIZE_BYTES, MAX_MULTIPART_UPLOAD_SIZE_MB } from '../config/upload';
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

    // Supports two query modes:
    //   ?month=current          → server-clock month of tanggal_masuk
    //   ?year=2026&month=8      → explicit year+month (1-based)
    const monthParam = req.query.month as string | undefined;
    const yearParam  = req.query.year  as string | undefined;
    let surats: Surat[];
    let filterMeta: { year: number; month: number } | null = null;

    if (monthParam === 'current') {
      const now = new Date();
      filterMeta = { year: now.getFullYear(), month: now.getMonth() + 1 };
      surats = await getIncomingLetterRecordsByMonth(userId, filterMeta.year, filterMeta.month);
    } else if (monthParam && yearParam) {
      const y = parseInt(yearParam, 10);
      const m = parseInt(monthParam, 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        filterMeta = { year: y, month: m };
        surats = await getIncomingLetterRecordsByMonth(userId, y, m);
      } else {
        surats = await getAllIncomingLetterRecords(userId);
      }
    } else {
      surats = await getAllIncomingLetterRecords(userId);
    }

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

    res.json({
      success: true,
      data: enriched,
      // Include server-resolved month/year so the frontend never has to guess
      ...(filterMeta && { filter: { month: filterMeta.month, year: filterMeta.year } }),
    });
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
    let resolvedDbFolderId: number | undefined;

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
      resolvedDbFolderId = validation.dbFolderId;
    }

    // ── Mail upload size limit ────────────────────────────────────────
    // Applies to all file uploads.
    if (req.file && req.file.size > MAX_MAIL_UPLOAD_SIZE_BYTES) {
      const fileMB = (req.file.size / (1024 * 1024)).toFixed(1);
      return res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: `Ukuran file maksimum adalah ${MAX_MAIL_UPLOAD_SIZE_MB} MB. File Anda ${fileMB} MB — silakan kurangi ukurannya dan coba lagi.`,
      });
    }

    let parentFolderId = '';
    let storageDestination = '';
    let originalFileName = '';
    let fileMimeType = '';

    if (req.body.uploaded_drive_file_id) {
      try {
        const confirmed = await confirmUploadedDriveFile(userId, req.body.uploaded_drive_file_id);
        googleDriveId = confirmed.fileId;
        webViewLink = confirmed.webViewLink;
        logicalPath = req.body.logical_path || confirmed.name;
        parentFolderId = req.body.parent_folder_id || '';
        storageDestination = req.body.storage_destination || '';
        originalFileName = req.body.original_file_name || confirmed.name;
        fileMimeType = req.body.file_mime_type || '';
      } catch (confirmErr: any) {
        if (isGoogleErrorInvalidGrant(confirmErr)) {
          return res.status(401).json({
            error_code: 'GOOGLE_RECONNECT_REQUIRED',
            error: 'Koneksi Google perlu diperbarui',
            message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
          });
        }
        return res.status(500).json({ error: confirmErr.message || 'Gagal memverifikasi file Google Drive' });
      }
    } else if (req.file) {
      originalFileName = req.file.originalname || `${nomor_surat}_${Date.now()}`;
      fileMimeType = req.file.mimetype || 'application/octet-stream';
      const ext = path.extname(originalFileName) || '.pdf';
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
        parentFolderId = uploadResult.parentFolderId;
        storageDestination = uploadResult.storageDestination;
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
      folder_id: resolvedDbFolderId ?? (folder_id && !isNaN(parseInt(folder_id)) ? parseInt(folder_id) : undefined),
      drive_parent_folder_id: parentFolderId,
      original_file_name: originalFileName,
      file_mime_type: fileMimeType,
      storage_destination: storageDestination,
      created_at: new Date().toISOString(),
    };

    console.log('Appending letter record to user Google Sheet...');
    try {
      const { rowId, sheetRowNumber } = await appendIncomingLetterToSheet(userId, surat);
      surat.id = rowId;
      surat.google_sheet_row = sheetRowNumber;
      console.log('Google Sheet append successful with ID:', rowId, 'row:', sheetRowNumber);

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
    const realMsg = error.message || 'Gagal menyimpan surat. Silakan coba lagi.';
    res.status(500).json({
      error: realMsg,
      message: realMsg.startsWith('Gagal') ? realMsg : `Gagal menyimpan surat: ${realMsg}`,
      details: error.stack || error.toString(),
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
    let resolvedDbFolderId: number | undefined;

    if (folder_id) {
      const validation = await validateFolderOwnership(userId, folder_id, 'incoming');
      if (!validation.valid) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Folder yang dipilih tidak valid atau tidak dimiliki oleh akun Anda.',
        });
      }
      customFolderDriveId = validation.googleDriveFolderId;
      resolvedDbFolderId = validation.dbFolderId;
    }

    // ── Mail upload size limit ──────────────────────────────────────────────
    // Applied to all file uploads (50 MB maximum).
    if (req.file && req.file.size > MAX_MAIL_UPLOAD_SIZE_BYTES) {
      const fileMB = (req.file.size / (1024 * 1024)).toFixed(1);
      return res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: `Ukuran file maksimum adalah ${MAX_MAIL_UPLOAD_SIZE_MB} MB. File Anda ${fileMB} MB — silakan kurangi ukurannya dan coba lagi.`,
      });
    }

    let parentFolderId = oldSurat.drive_parent_folder_id || '';
    let storageDestination = oldSurat.storage_destination || '';
    let originalFileName = oldSurat.original_file_name || '';
    let fileMimeType = oldSurat.file_mime_type || '';

    if (req.body.uploaded_drive_file_id) {
      const oldDriveIdToDelete = oldSurat.google_drive_id;
      try {
        const confirmed = await confirmUploadedDriveFile(userId, req.body.uploaded_drive_file_id);
        googleDriveId = confirmed.fileId;
        webViewLink = confirmed.webViewLink;
        logicalPath = req.body.logical_path || confirmed.name;
        parentFolderId = req.body.parent_folder_id || oldSurat.drive_parent_folder_id || '';
        storageDestination = req.body.storage_destination || oldSurat.storage_destination || '';
        originalFileName = req.body.original_file_name || confirmed.name;
        fileMimeType = req.body.file_mime_type || oldSurat.file_mime_type || '';

        // Safely remove the old file ONLY if a completely new file was created and upload is confirmed
        if (oldDriveIdToDelete && oldDriveIdToDelete !== googleDriveId) {
          try {
            await deleteUserFile(userId, oldDriveIdToDelete);
            console.log(`[GoogleDrive] Cleaned up replaced old file: ${oldDriveIdToDelete}`);
          } catch (deleteErr) {
            console.warn(`[GoogleDrive] Non-fatal: Failed to delete old file after replacement:`, deleteErr);
          }
        }
      } catch (confirmErr: any) {
        if (isGoogleErrorInvalidGrant(confirmErr)) {
          return res.status(401).json({
            error_code: 'GOOGLE_RECONNECT_REQUIRED',
            error: 'Koneksi Google perlu diperbarui',
            message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
          });
        }
        return res.status(500).json({ error: confirmErr.message || 'Gagal memverifikasi file Google Drive' });
      }
    } else if (req.file) {
      originalFileName = req.file.originalname || `${nomor_surat}_${Date.now()}`;
      fileMimeType = req.file.mimetype || 'application/octet-stream';
      const oldDriveIdToDelete = oldSurat.google_drive_id;
      const ext = path.extname(originalFileName) || '.pdf';
      const cleanFileName = `${nomor_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${nama_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${Date.now()}${ext}`;

      try {
        // If updating an existing Drive file and no explicit different folder was requested, update in-place!
        if (oldSurat.google_drive_id && !customFolderDriveId) {
          const updateResult = await updateExistingDriveFile(
            userId,
            oldSurat.google_drive_id,
            req.file.buffer,
            cleanFileName,
            req.file.mimetype
          );
          googleDriveId = updateResult.fileId;
          webViewLink = updateResult.webViewLink;
          logicalPath = updateResult.logicalPath;
          parentFolderId = updateResult.parentFolderId;
          storageDestination = updateResult.storageDestination;
        } else {
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
          parentFolderId = uploadResult.parentFolderId;
          storageDestination = uploadResult.storageDestination;

          // Safely remove the old file ONLY after new upload is confirmed
          if (oldDriveIdToDelete && oldDriveIdToDelete !== googleDriveId) {
            try {
              await deleteUserFile(userId, oldDriveIdToDelete);
              console.log(`[GoogleDrive] Cleaned up replaced old file: ${oldDriveIdToDelete}`);
            } catch (deleteErr) {
              console.warn(`[GoogleDrive] Non-fatal: Failed to delete old file after replacement:`, deleteErr);
            }
          }
        }
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

      // Identify whether the file belongs to the default E-Surat folder structure
      const isDefaultEsurat = Boolean(oldSurat.file_path && oldSurat.file_path.startsWith('esurat/'));

      // CRITICAL: Documents outside esurat must remain in their current location.
      // Do NOT create esurat/MM-YY/PDF folders when updating metadata outside esurat!
      if ((customFolderDriveId && folderChanged) || (isDefaultEsurat && (folderChanged || oldMonth !== newMonth))) {
        console.log(`[GoogleDrive] Moving file in Google Drive...`);
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
          console.error(`[GoogleDrive] Move file warning:`, moveError);
          if (isGoogleErrorInvalidGrant(moveError)) {
            return res.status(401).json({
              error_code: 'GOOGLE_RECONNECT_REQUIRED',
              error: 'Koneksi Google perlu diperbarui',
              message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
            });
          }
          // Non-fatal: if moving file in Drive encounters an issue, keep existing path
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
      google_sheet_row: oldSurat.google_sheet_row,
      folder_id: resolvedDbFolderId ?? (folder_id && !isNaN(parseInt(folder_id)) ? parseInt(folder_id) : undefined),
      drive_parent_folder_id: parentFolderId,
      original_file_name: originalFileName,
      file_mime_type: fileMimeType,
      storage_destination: storageDestination,
      updated_at: new Date().toISOString(),
    };

    let sheetSyncWarning: string | undefined;
    try {
      await updateIncomingLetterInSheet(userId, rowNumber, surat, oldSurat.google_sheet_row, oldSurat.google_drive_id);
    } catch (sheetError: any) {
      console.warn(`[GoogleSheets] Warning: Failed to sync incoming letter to sheet:`, sheetError);
      if (isGoogleErrorInvalidGrant(sheetError)) {
        return res.status(401).json({
          error_code: 'GOOGLE_RECONNECT_REQUIRED',
          error: 'Koneksi Google perlu diperbarui',
          message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
        });
      }
      sheetSyncWarning = sheetError.message || 'Gagal menyinkronkan data ke Google Sheet';
    }

    try {
      await updateIncomingLetterRecord(rowNumber, userId, surat);
    } catch (dbErr: any) {
      console.error('DB record update sync warning:', dbErr);
      return res.status(500).json({
        error: 'DATABASE_UPDATE_FAILED',
        message: 'Gagal memperbarui data surat di database',
        details: dbErr.message,
        drive_file_id: googleDriveId,
      });
    }

    if (sheetSyncWarning) {
      return res.json({
        success: true,
        sheets_synced: false,
        warning: `Data berhasil diperbarui di database dan Google Drive, namun sinkronisasi Google Sheet tertunda: ${sheetSyncWarning}`,
        message: `Surat berhasil diperbarui di Google Drive. Sinkronisasi Google Sheets tertunda: ${sheetSyncWarning}`,
        surat,
        data: surat,
      });
    }

    res.json({ success: true, message: 'Surat updated successfully', surat, data: surat, sheets_synced: true });
  } catch (error: any) {
    console.error('Update surat error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    const errMsg = error.message || 'Failed to update surat';
    res.status(500).json({ error: errMsg, message: errMsg });
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
    await deleteIncomingLetterRow(userId, rowNumber, driveFileId || undefined, surat.google_sheet_row);

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

/**
 * Create a direct resumable upload session with Google Drive.
 * This allows uploading files up to 50 MB (including the 9.15 MB reproduction case)
 * directly from the browser to Google Drive, completely bypassing serverless / proxy body limits.
 */
export const createUploadSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { original_file_name, file_size, mime_type, tanggal_masuk, folder_id, nomor_surat, nama_surat, existing_drive_file_id } = req.body;

    if (!original_file_name) {
      return res.status(400).json({ error: 'Nama file asli wajib diisi' });
    }

    const size = parseInt(file_size);
    if (isNaN(size) || size <= 0) {
      return res.status(400).json({ error: 'Ukuran file tidak valid' });
    }

    if (size > MAX_MAIL_UPLOAD_SIZE_BYTES) {
      const fileMB = (size / (1024 * 1024)).toFixed(1);
      return res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: `Ukuran file maksimum adalah ${MAX_MAIL_UPLOAD_SIZE_MB} MB. File Anda ${fileMB} MB — silakan kurangi ukurannya dan coba lagi.`,
      });
    }

    const ext = path.extname(original_file_name) || '.pdf';
    const uploadFileName = (nomor_surat && nama_surat)
      ? `${nomor_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${nama_surat.replace(/[\/\\?%*:|"<>]/g, '_')}_${Date.now()}${ext}`
      : original_file_name;

    // CRITICAL: When updating an existing document and no explicit new folder was specified,
    // update the file IN-PLACE directly on existing_drive_file_id.
    // This strictly avoids creating esurat/esurat-keluar/MM-YY/PDF folders for files outside esurat.
    if (existing_drive_file_id && !folder_id) {
      try {
        const session = await createResumableUpdateSession(
          userId,
          existing_drive_file_id,
          uploadFileName,
          size,
          mime_type
        );

        return res.json({
          success: true,
          sessionUri: session.sessionUri,
          cleanFileName: session.cleanFileName,
          logicalPath: session.logicalPath,
          parentFolderId: session.parentFolderId,
          storageDestination: session.storageDestination,
          is_update: true,
        });
      } catch (err: any) {
        console.warn(`[GoogleDrive] Direct in-place update session failed, falling back to standard session:`, err);
        // Fall back to standard session if existing file is inaccessible in Drive
      }
    }

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

    const session = await createResumableUploadSession(
      userId,
      uploadFileName,
      size,
      'incoming',
      tanggal_masuk,
      mime_type,
      customFolderDriveId
    );

    res.json({
      success: true,
      sessionUri: session.sessionUri,
      cleanFileName: session.cleanFileName,
      logicalPath: session.logicalPath,
      parentFolderId: session.parentFolderId,
      storageDestination: session.storageDestination,
    });
  } catch (error: any) {
    console.error('Create upload session error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    const errMsg = error.message || 'Gagal membuat sesi upload Google Drive';
    res.status(500).json({ error: errMsg, message: errMsg });
  }
};

