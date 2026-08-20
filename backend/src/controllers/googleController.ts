import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createUser, findUserByEmail, findUserById, findUserByGoogleSub, updateUserGoogleTokens, clearUserGoogleTokens } from '../models/User';
import jwt from 'jsonwebtoken';
import { getOAuth2Client, generateGoogleAuthUrl, isGoogleErrorInvalidGrant } from '../services/userGoogleAuthService';
import { initializeUserDriveStructure } from '../services/userGoogleDriveService';
import { ensureUserSpreadsheet } from '../services/userGoogleSheetsService';

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
        userInfo.email || null
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
