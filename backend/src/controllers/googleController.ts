import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createUser, findUserByEmail, findUserById, findUserByGoogleSub, updateUserGoogleTokens, clearUserGoogleTokens } from '../models/User';
import jwt from 'jsonwebtoken';
import { getOAuth2Client, generateGoogleAuthUrl, isGoogleErrorInvalidGrant } from '../services/userGoogleAuthService';
import { 
  initializeUserDriveStructure, 
  listDriveFolders, 
  getFolderDetails, 
  getStorageSettings, 
  updateStorageSettings 
} from '../services/userGoogleDriveService';
import { 
  ensureUserSpreadsheet,
  listUserSpreadsheets,
  createUserSpreadsheet,
  renameSpreadsheet as renameSpreadsheetService,
  trashSpreadsheet as trashSpreadsheetService,
  assignUserSpreadsheet
} from '../services/userGoogleSheetsService';

export const redirect = async (req: AuthRequest, res: Response) => {
  try {
    const state = (req.query.userId as string) || '';
    const authUrl = generateGoogleAuthUrl(state);
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';
    console.log(`[GoogleOAuth] /connect → redirectUri="${redirectUri}" state="${state}"`);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Google redirect error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
};

export const callback = async (req: AuthRequest, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    const { code, state } = req.query;

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';
    console.log(`[GoogleOAuth] /callback received → redirectUri="${redirectUri}" hasCode=${!!code} state="${state}"`);

    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=No authorization code received from Google`);
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);

    console.log('OAuth Callback - Tokens received:', {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    oauth2Client.setCredentials(tokens);

    // Fetch user profile from Google
    const userInfoResponse = await oauth2Client.request<any>({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    const userInfo = userInfoResponse.data;
    if (!userInfo || !userInfo.email) {
      return res.redirect(`${frontendUrl}/login?error=Google account has no email address`);
    }

    // Extract Google sub (stable identifier)
    const googleSub = userInfo.id || userInfo.sub;
    if (!googleSub) {
      console.warn('[GoogleCallback] No Google sub/id found in user info');
    }

    const isLinkingFlow = !!(state && !isNaN(parseInt(state as string)));
    let user: any = null;

    // If state contains userId (user was already logged in and linking from Profile)
    if (isLinkingFlow) {
      user = await findUserById(parseInt(state as string));
      console.log(`[GoogleCallback] Linking flow detected for existing user ID: ${state}`);

      // Safety check (§5): ensure this Google account is not already linked to a DIFFERENT user.
      // Allow re-linking by the same user (idempotent), but reject if it belongs to another account.
      if (googleSub) {
        const existingGoogleUser = await findUserByGoogleSub(googleSub);
        if (existingGoogleUser && existingGoogleUser.id !== user?.id) {
          console.warn(
            `[GoogleCallback] Conflict: Google sub ${googleSub} already linked to user ${existingGoogleUser.id}, ` +
            `but linking was requested for user ${state}`
          );
          return res.redirect(
            `${frontendUrl}/profile?google_link_error=${encodeURIComponent(
              'Akun Google ini sudah terhubung ke pengguna lain. Gunakan akun Google yang berbeda atau hubungi administrator.'
            )}`
          );
        }
      }
      // ── End conflict guard ────────────────────────────────────────────────
    }

    // Otherwise find user by Google sub first (more stable), then by email
    if (!user && googleSub) {
      user = await findUserByGoogleSub(googleSub);
    }

    if (!user) {
      user = await findUserByEmail(userInfo.email);
    }

    // If still not found, create new user (Flow A - direct Google sign in)
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      user = await createUser(
        userInfo.name || 'Google User',
        userInfo.email,
        randomPassword,
        googleSub,
        userInfo.name || null,
        userInfo.email || null
      );
    }

    // Update user Google tokens in database
    if (tokens.access_token) {
      await updateUserGoogleTokens(
        user.id,
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.expiry_date || null,
        googleSub || null,
        userInfo.name || null,
        userInfo.email || null,
        userInfo.picture || null
      );
    }

    // Auto-provision Google Drive structure and Google Sheets for this user
    let provisioningError = false;
    try {
      console.log(`[GoogleCallback] Provisioning Drive & Sheets for user ${user.id} (${user.email})...`);
      await initializeUserDriveStructure(user.id);
      await ensureUserSpreadsheet(user.id, 'incoming');
      await ensureUserSpreadsheet(user.id, 'outgoing');
      console.log(`[GoogleCallback] Drive & Sheets provisioned successfully for user ${user.id}`);
    } catch (initErr) {
      console.error(`[GoogleCallback] Error during Drive/Sheets auto-provisioning for user ${user.id}:`, initErr);
      provisioningError = true;
    }

    // Generate JWT token with updated user details
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    if (isLinkingFlow) {
      // Flow B: Linked from profile page
      const queryParams = new URLSearchParams({
        token,
        linked: '1',
        success: provisioningError 
          ? 'Google account connected! Drive setup had a minor issue - you can retry from your profile.'
          : 'Google account connected and provisioned successfully.',
        googleEmail: userInfo.email || '',
        googleName: userInfo.name || '',
      });
      return res.redirect(`${frontendUrl}/auth/google/callback?${queryParams.toString()}`);
    }

    // Flow A: Direct Google login
    const queryParams = new URLSearchParams({
      token,
      loginMethod: 'google',
      success: provisioningError
        ? 'Google login successful. Drive setup pending.'
        : 'Google login successful',
    });
    res.redirect(`${frontendUrl}/auth/google/callback?${queryParams.toString()}`);
  } catch (error: any) {
    console.error('Google callback error:', error);
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message || 'Google login failed')}`);
  }
};

export const status = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isConnected = !!user.google_connected && (!!user.google_refresh_token || !!user.google_access_token);
    const isProvisioned = !!(user.drive_folder_id && user.drive_keluar_folder_id && user.sheet_masuk_id && user.sheet_keluar_id);

    res.json({
      success: true,
      connected: isConnected,
      provisioned: isProvisioned,
      email: user.email,
      googleName: user.google_name || user.name || null,
      googleEmail: user.google_email || user.email || null,
      googlePicture: user.google_picture || null,
      driveFolderId: user.drive_folder_id || null,
      driveKeluarFolderId: user.drive_keluar_folder_id || null,
      sheetMasukId: user.sheet_masuk_id || null,
      sheetKeluarId: user.sheet_keluar_id || null,
    });
  } catch (error) {
    console.error('Google status error:', error);
    res.status(500).json({ error: 'Failed to fetch Google status' });
  }
};

export const provision = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`[GoogleProvision] Manual provisioning requested for user ${userId}`);
    const driveResult = await initializeUserDriveStructure(userId);
    const sheetMasukId = await ensureUserSpreadsheet(userId, 'incoming');
    const sheetKeluarId = await ensureUserSpreadsheet(userId, 'outgoing');

    const user = await findUserById(userId);

    res.json({
      success: true,
      message: 'Google Drive folders and Sheets provisioned successfully.',
      driveFolderId: driveResult.incomingRootId,
      driveKeluarFolderId: driveResult.outgoingRootId,
      sheetMasukId,
      sheetKeluarId,
    });
  } catch (error: any) {
    console.error('[GoogleProvision] Provisioning error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to provision Google resources', details: error.message });
  }
};

export const disconnect = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await clearUserGoogleTokens(userId);
    res.json({ success: true, message: 'Google account disconnected successfully' });
  } catch (error) {
    console.error('Google disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Google account' });
  }
};

export const debug = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = userId ? await findUserById(userId) : null;

    res.json({
      success: true,
      user_id: userId || null,
      google_connected: user ? !!user.google_connected : false,
      google_name: user?.google_name || null,
      google_email: user?.google_email || null,
      has_refresh_token: user ? !!user.google_refresh_token : false,
      has_access_token: user ? !!user.google_access_token : false,
      drive_folder_id: user?.drive_folder_id || 'NOT CONFIGURED',
      drive_keluar_folder_id: user?.drive_keluar_folder_id || 'NOT CONFIGURED',
      sheet_masuk_id: user?.sheet_masuk_id || 'NOT CONFIGURED',
      sheet_keluar_id: user?.sheet_keluar_id || 'NOT CONFIGURED',
    });
  } catch (error) {
    console.error('Google debug error:', error);
    res.status(500).json({ error: 'Failed to debug Google configuration' });
  }
};

export const listFolders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const parentId = (req.query.parentId as string) || undefined;
    const pageToken = (req.query.pageToken as string) || undefined;

    const result = await listDriveFolders(userId, parentId, pageToken);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('List folders error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to list folders', details: error.message });
  }
};

export const getFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const folderId = req.params.id;
    const details = await getFolderDetails(userId, folderId);
    res.json({ success: true, data: details });
  } catch (error: any) {
    console.error('Get folder error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to get folder details', details: error.message });
  }
};

export const getStorageSettingsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const settings = await getStorageSettings(userId);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Get storage settings error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to get storage settings', details: error.message });
  }
};

export const updateStorageSettingsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { letterType, folderId, folderName, useMonthlyOrganization, resetToDefault } = req.body;
    if (!letterType || !['incoming', 'outgoing'].includes(letterType)) {
      return res.status(400).json({ error: 'Invalid letterType. Must be incoming or outgoing.' });
    }
    if (!resetToDefault && !folderId) {
      return res.status(400).json({ error: 'folderId is required when not resetting to default.' });
    }

    const updated = await updateStorageSettings(userId, {
      letterType,
      folderId,
      folderName,
      useMonthlyOrganization,
      resetToDefault,
    });
    res.json({ success: true, message: 'Pengaturan penyimpanan berhasil diperbarui.', data: updated });
  } catch (error: any) {
    console.error('Update storage settings error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: error.message || 'Failed to update storage settings', details: error.message });
  }
};

export const listSpreadsheets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await listUserSpreadsheets(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('List spreadsheets error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: 'Failed to list spreadsheets', details: error.message });
  }
};

export const createSpreadsheet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, letterType } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Judul spreadsheet harus diisi.' });
    }

    const type = letterType === 'incoming' || letterType === 'outgoing' ? letterType : 'none';
    const result = await createUserSpreadsheet(userId, title.trim(), type);

    res.status(201).json({
      success: true,
      message: 'Spreadsheet berhasil dibuat di Google Drive & Google Sheets.',
      data: result,
    });
  } catch (error: any) {
    console.error('Create spreadsheet error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: error.message || 'Failed to create spreadsheet', details: error.message });
  }
};

export const renameSpreadsheet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { name } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Spreadsheet ID diperlukan.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Judul baru spreadsheet tidak boleh kosong.' });
    }

    const result = await renameSpreadsheetService(userId, id, name.trim());
    res.json({
      success: true,
      message: 'Nama spreadsheet berhasil diperbarui.',
      data: result,
    });
  } catch (error: any) {
    console.error('Rename spreadsheet error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: error.message || 'Failed to rename spreadsheet', details: error.message });
  }
};

export const trashSpreadsheet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const force = req.query.force === 'true';

    if (!id) {
      return res.status(400).json({ error: 'Spreadsheet ID diperlukan.' });
    }

    const result = await trashSpreadsheetService(userId, id, force);
    res.json({
      success: true,
      message: 'Spreadsheet berhasil dipindahkan ke kotak sampah Google Drive.',
      data: result,
    });
  } catch (error: any) {
    console.error('Trash spreadsheet error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(400).json({ error: error.message || 'Failed to delete spreadsheet', details: error.message });
  }
};

export const assignSpreadsheet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { letterType } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Spreadsheet ID diperlukan.' });
    }

    if (!letterType || !['incoming', 'outgoing'].includes(letterType)) {
      return res.status(400).json({ error: 'letterType harus bernilai "incoming" atau "outgoing".' });
    }

    await assignUserSpreadsheet(userId, id, letterType);
    res.json({
      success: true,
      message: `Spreadsheet berhasil dijadikan target sinkronisasi ${letterType === 'incoming' ? 'Surat Masuk' : 'Surat Keluar'}.`,
    });
  } catch (error: any) {
    console.error('Assign spreadsheet error:', error);
    if (isGoogleErrorInvalidGrant(error)) {
      return res.status(401).json({
        error_code: 'GOOGLE_RECONNECT_REQUIRED',
        error: 'Koneksi Google perlu diperbarui',
        message: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
      });
    }
    res.status(500).json({ error: error.message || 'Failed to assign spreadsheet', details: error.message });
  }
};


