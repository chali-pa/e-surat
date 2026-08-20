import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { 
  createCustomFolder, 
  getMonthlyFolders 
} from '../services/userGoogleDriveService';
import { isGoogleErrorInvalidGrant } from '../services/userGoogleAuthService';

export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { month, letter_type } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter is required' });
    }

    const letterType = (letter_type as 'incoming' | 'outgoing') || 'incoming';
    const folders = await getMonthlyFolders(userId, month, letterType);

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

    const { month, name, letter_type } = req.body;

    if (!month || !name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Month and name are required',
        missing_fields: {
          month: !month,
          name: !name || !name.trim(),
        }
      });
    }

    const letterType = (letter_type as 'incoming' | 'outgoing') || 'incoming';
    
    const result = await createCustomFolder(userId, month, name.trim(), letterType);

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