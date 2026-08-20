import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { 
  createCustomFolder, 
  getMonthlyFolders,
  formatMonthYear 
} from '../services/userGoogleDriveService';
import { isGoogleErrorInvalidGrant } from '../services/userGoogleAuthService';

export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { month, monthYear, date, letter_type } = req.query;
    
    // Determine monthYear from various params with backward compatibility
    let resolvedMonthYear: string;
    
    if (monthYear && typeof monthYear === 'string') {
      // New format: MM-YY
      resolvedMonthYear = monthYear;
    } else if (date && typeof date === 'string') {
      // Infer from date string
      resolvedMonthYear = formatMonthYear(date);
    } else if (month && typeof month === 'string') {
      // Legacy format: month name (e.g., "January") - keep for backward compatibility
      // Try to parse as MM-YY first, if fails assume it's a legacy month name
      if (month.match(/^\d{2}-\d{2}$/)) {
        resolvedMonthYear = month;
      } else {
        // Legacy month name - this won't work with new structure but we accept it
        // The frontend should send MM-YY or date going forward
        resolvedMonthYear = month;
      }
    } else {
      return res.status(400).json({ error: 'Month parameter (monthYear, date, or month) is required' });
    }

    const letterType = (letter_type as 'incoming' | 'outgoing') || 'incoming';
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
  try {
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
    
    console.log(`[DEBUG-FOLDER-CREATE-1] Request body:`, req.body);
    console.log(`[DEBUG-FOLDER-CREATE-2] calling createCustomFolder with userId=${userId}, resolvedMonthYear=${resolvedMonthYear}, name=${name.trim()}, letterType=${letterType}`);
    const result = await createCustomFolder(userId, resolvedMonthYear, name.trim(), letterType, fileType);
    console.log(`[DEBUG-FOLDER-CREATE-3] createCustomFolder returned:`, result);

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