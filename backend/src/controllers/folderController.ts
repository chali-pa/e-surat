import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { 
  createCustomFolder, 
  getMonthlyFolders,
  syncActiveMonthlyFolders,
  formatMonthYear,
  renameDriveFolder,
  trashDriveFolder
} from '../services/userGoogleDriveService';
import pool from '../config/database';
import { isGoogleErrorInvalidGrant } from '../services/userGoogleAuthService';

export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { month, monthYear, date, letter_type } = req.query;
    const letterType = (letter_type as 'incoming' | 'outgoing') || 'incoming';
    
    // Determine monthYear from various params with backward compatibility
    let resolvedMonthYear: string | null = null;
    
    if (monthYear && typeof monthYear === 'string') {
      // New format: MM-YY
      resolvedMonthYear = monthYear;
    } else if (date && typeof date === 'string') {
      // Infer from date string
      resolvedMonthYear = formatMonthYear(date);
    } else if (month && typeof month === 'string') {
      if (month.match(/^\d{2}-\d{2}$/)) {
        resolvedMonthYear = month;
      } else {
        resolvedMonthYear = month;
      }
    }

    if (!resolvedMonthYear) {
      // If no month is specified, synchronize and return active monthly folders directly from Drive
      const activeMonths = await syncActiveMonthlyFolders(userId, letterType);
      return res.json({ success: true, activeMonths, data: [] });
    }

    const folders = await getMonthlyFolders(userId, resolvedMonthYear, letterType);

    res.json({ success: true, data: folders });
  } catch (error: any) {
    console.error('Get folders error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to fetch folders', details: error.message });
  }
};

export const createFolder = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { month, monthYear, date, name, letter_type, file_type } = req.body;

  // Determine monthYear from various params with backward compatibility
  let resolvedMonthYear: string;
  
  if (monthYear) {
    // New format: MM-YY
    resolvedMonthYear = monthYear;
  } else if (date) {
    // Infer from date string
    resolvedMonthYear = formatMonthYear(date);
  } else if (month) {
    // Legacy format: month name (e.g., "January") - keep for backward compatibility
    // Try to parse as MM-YY first, if fails assume it's a legacy month name
    if (month.match(/^\d{2}-\d{2}$/)) {
      resolvedMonthYear = month;
    } else {
      // Legacy month name - this won't work with new structure but we accept it
      resolvedMonthYear = month;
    }
  } else {
    return res.status(400).json({ 
      error: 'Month parameter (monthYear, date, or month) is required',
      missing_fields: {
        monthYear: !monthYear,
        date: !date,
        month: !month,
      }
    });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ 
      error: 'Name is required',
      missing_fields: {
        name: !name || !name.trim(),
      }
    });
  }

  const letterType = (letter_type as 'incoming' | 'outgoing') || 'incoming';
  const fileType = (file_type as 'pdf' | 'excel' | 'documentation') || 'pdf';

  try {
    const result = await createCustomFolder(userId, resolvedMonthYear, name.trim(), letterType, fileType);

    if (result.message === 'Folder already exists in the selected month') {
      return res.status(409).json({ 
        success: false, 
        message: result.message,
        error: 'Folder with the same name already exists in this month'
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Folder created successfully in Google Drive.',
      folder: {
        id: result.folderId,
        name: name.trim(),
        googleDriveFolderId: result.googleDriveFolderId,
      },
      data: result 
    });
  } catch (error: any) {
    console.error('Create folder error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ 
      error: 'Failed to create folder', 
      details: error.message 
    });
  }
};

export const renameFolder = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { driveId } = req.params;
  const { name } = req.body;

  if (!driveId) {
    return res.status(400).json({ error: 'driveId parameter is required' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama folder baru tidak boleh kosong' });
  }

  try {
    const result = await renameDriveFolder(userId, driveId, name.trim());
    res.json({
      success: true,
      message: 'Folder berhasil diperbarui di Google Drive',
      data: result,
    });
  } catch (error: any) {
    console.error('Rename folder error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({
      error: error.message || 'Gagal mengubah nama folder',
      details: error.message,
    });
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { driveId } = req.params;
  const force = req.query.force === 'true';

  if (!driveId) {
    return res.status(400).json({ error: 'driveId parameter is required' });
  }

  try {
    // Check if any letters in DB reference this folder
    const countCheck = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM surats WHERE user_id = $1 AND drive_parent_folder_id = $2) AS surat_count,
        (SELECT COUNT(*) FROM surat_keluars WHERE user_id = $1 AND drive_parent_folder_id = $2) AS surat_keluar_count`,
      [userId, driveId]
    );

    const suratCount = parseInt(countCheck.rows[0]?.surat_count || '0', 10);
    const suratKeluarCount = parseInt(countCheck.rows[0]?.surat_keluar_count || '0', 10);
    const totalLetters = suratCount + suratKeluarCount;

    if (totalLetters > 0 && !force) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        letterCount: totalLetters,
        suratCount,
        suratKeluarCount,
        message: `Folder ini memiliki ${totalLetters} data arsip surat (${suratCount} surat masuk, ${suratKeluarCount} surat keluar). Menghapus folder ini akan memindahkannya ke kotak sampah Google Drive. Lanjutkan?`,
      });
    }

    await trashDriveFolder(userId, driveId);

    res.json({
      success: true,
      message: 'Folder berhasil dipindahkan ke kotak sampah Google Drive',
      driveId,
      affectedLetters: totalLetters,
    });
  } catch (error: any) {
    console.error('Delete folder error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({
      error: error.message || 'Gagal menghapus folder',
      details: error.message,
    });
  }
};