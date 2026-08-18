import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { findUserById, updateUserGoogleTokens, clearUserGoogleTokens } from '../models/User';

export class GoogleReconnectRequiredError extends Error {
  public code = 'GOOGLE_RECONNECT_REQUIRED';
  constructor(message = 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.') {
    super(message);
    this.name = 'GoogleReconnectRequiredError';
  }
}

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];

export function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client ID and Secret are not configured in environment variables.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function generateGoogleAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: OAUTH_SCOPES,
    include_granted_scopes: true,
    state: state || '',
  });
}

export async function getOAuth2ClientForUser(userId: number): Promise<OAuth2Client> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  if (!user.google_refresh_token && !user.google_access_token) {
    console.warn(`[GoogleOAuth] User ${userId} (${user.email}) has no Google credentials.`);
    throw new GoogleReconnectRequiredError();
  }

  const oauth2Client = getOAuth2Client();
  const expiresAt = user.google_token_expires_at ? Number(user.google_token_expires_at) : 0;

  oauth2Client.setCredentials({
    access_token: user.google_access_token || undefined,
    refresh_token: user.google_refresh_token || undefined,
    expiry_date: expiresAt || undefined,
  });

  // Listen to tokens event for unexpected background refreshes
  oauth2Client.on('tokens', async (tokens) => {
    try {
      console.log(`[GoogleOAuth] Received new tokens event for user ${userId}`);
      if (tokens.access_token) {
        await updateUserGoogleTokens(
          userId,
          tokens.access_token,
          tokens.refresh_token || null,
          tokens.expiry_date || null
        );
      }
    } catch (err) {
      console.error(`[GoogleOAuth] Failed to save updated tokens for user ${userId}:`, err);
    }
  });

  // Check if access token is missing, expired, or will expire in less than 60 seconds
  const now = Date.now();
  const isExpired = !user.google_access_token || (expiresAt > 0 && expiresAt - now < 60000);

  if (isExpired && user.google_refresh_token) {
    console.log(`[GoogleOAuth] Access token expired for user ${userId} (${user.email}). Refreshing using refresh token...`);
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log(`[GoogleOAuth] Access token successfully refreshed for user ${userId}`);
      
      const newAccessToken = credentials.access_token;
      const newExpiryDate = credentials.expiry_date || Date.now() + 3600 * 1000;
      const newRefreshToken = credentials.refresh_token || user.google_refresh_token;

      if (newAccessToken) {
        await updateUserGoogleTokens(userId, newAccessToken, newRefreshToken, newExpiryDate);
        oauth2Client.setCredentials({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expiry_date: newExpiryDate,
        });
      }
    } catch (error: any) {
      console.error(`[GoogleOAuth] Token refresh failed for user ${userId}:`, error?.message || error);

      const errorMessage = (error?.message || '').toLowerCase();
      const isInvalidGrant =
        errorMessage.includes('invalid_grant') ||
        errorMessage.includes('expired or revoked') ||
        errorMessage.includes('invalid_token') ||
        error?.code === 400 ||
        error?.code === 401;

      if (isInvalidGrant) {
        console.warn(`[GoogleOAuth] Refresh token revoked or expired for user ${userId}. Marking connection as invalid.`);
        await clearUserGoogleTokens(userId);
        throw new GoogleReconnectRequiredError();
      }

      throw error;
    }
  } else if (!user.google_access_token && !user.google_refresh_token) {
    throw new GoogleReconnectRequiredError();
  }

  return oauth2Client;
}

export function isGoogleErrorInvalidGrant(error: any): boolean {
  if (error instanceof GoogleReconnectRequiredError) return true;
  if (!error) return false;
  const msg = (error.message || error.toString() || '').toLowerCase();
  return (
    msg.includes('invalid_grant') ||
    msg.includes('refresh token is expired or revoked') ||
    msg.includes('google oauth authentication failed') ||
    msg.includes('reconnect your google account')
  );
}
