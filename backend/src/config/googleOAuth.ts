import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

/**
 * ⚠️ LEGACY Google OAuth 2.0 Configuration
 * 
 * DEPRECATED: This module uses a global OAuth token approach.
 * The application now uses per-user OAuth via userGoogleAuthService.ts
 * Each user has their own OAuth tokens stored in the database.
 * 
 * This file is kept for backward compatibility but should not be used
 * in new code. Please use userGoogleAuthService.ts instead.
 */

// Check if OAuth credentials are configured
export const isOAuthConfigured = !!(
  process.env.GOOGLE_OAUTH_CLIENT_ID &&
  process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN
);

// Initialize OAuth 2.0 client
let oauth2Client: OAuth2Client | null = null;
let drive: any = null;
let sheets: any = null;

/**
 * Initialize OAuth 2.0 services
 * ⚠️ DEPRECATED: Use userGoogleAuthService.ts for per-user OAuth
 */
export function initializeOAuthServices(): void {
  if (!isOAuthConfigured) {
    console.warn('⚠️ Legacy OAuth 2.0 not configured. The application now uses per-user OAuth via userGoogleAuthService.ts');
    return;
  }

  if (oauth2Client && drive && sheets) {
    // Already initialized
    return;
  }

  try {
    console.log('⚠️ Initializing LEGACY Google OAuth 2.0 services (not recommended for multi-user apps)');

    oauth2Client = new OAuth2Client(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob' // Out-of-band for desktop apps
    );

    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    });

    // Auto-refresh token when expired
    oauth2Client.on('tokens', (tokens: any) => {
      if (tokens.refresh_token) {
        console.log('New refresh token received, update your .env file');
        // In production, you'd want to save this to a secure database
      }
    });

    // Initialize Google APIs
    drive = google.drive({ version: 'v3', auth: oauth2Client });
    sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    console.log('⚠️ Legacy Google OAuth 2.0 services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google OAuth 2.0 services:', error);
    throw error;
  }
}

/**
 * Get Google Drive instance
 * ⚠️ DEPRECATED: Use userGoogleDriveService.ts for per-user operations
 */
export function getOAuthDrive(): any {
  if (!drive) {
    initializeOAuthServices();
  }
  return drive;
}

/**
 * Get Google Sheets instance
 * ⚠️ DEPRECATED: Use userGoogleSheetsService.ts for per-user operations
 */
export function getOAuthSheets(): any {
  if (!sheets) {
    initializeOAuthServices();
  }
  return sheets;
}

/**
 * Get OAuth 2.0 client instance
 * ⚠️ DEPRECATED: Use userGoogleAuthService.ts for per-user OAuth
 */
export function getOAuthClient(): OAuth2Client | null {
  if (!oauth2Client) {
    initializeOAuthServices();
  }
  return oauth2Client;
}

/**
 * Refresh access token
 * ⚠️ DEPRECATED: Use userGoogleAuthService.ts for per-user token management
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!oauth2Client) {
    initializeOAuthServices();
  }

  try {
    const { credentials } = await oauth2Client!.refreshAccessToken();
    return credentials.access_token || null;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    return null;
  }
};