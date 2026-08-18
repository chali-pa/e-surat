import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

/**
 * ⚠️ LEGACY Centralized Google Service Configuration
 * 
 * DEPRECATED: This module uses a service account approach.
 * The application now uses per-user OAuth via userGoogleAuthService.ts
 * Each user has their own Google OAuth credentials stored in the database.
 * 
 * This file is kept for backward compatibility and for utility scripts only.
 * The main application should use userGoogleAuthService.ts, userGoogleDriveService.ts,
 * and userGoogleSheetsService.ts for all Google operations.
 */

// Initialize Google Auth with Service Account
let auth: JWT | null = null;
let drive: any = null;
let sheets: any = null;

/**
 * Load Google credentials from JSON file
 * This is the recommended approach as it avoids encoding issues
 */
function loadCredentialsFromFile(): any {
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
  
  if (!credentialsPath) {
    return null;
  }

  try {
    const fullPath = path.resolve(process.cwd(), credentialsPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`Google credentials file not found: ${fullPath}`);
      return null;
    }

    const credentialsContent = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(credentialsContent);
  } catch (error) {
    console.error('Error loading Google credentials from file:', error);
    return null;
  }
}

/**
 * Initialize Google services authentication
 * ⚠️ DEPRECATED: Use userGoogleAuthService.ts for per-user OAuth
 * This function is kept for utility scripts only
 */
export function initializeGoogleServices(): void {
  if (!isGoogleConfigured) {
    console.warn('⚠️ Legacy Google services not configured. The application now uses per-user OAuth via userGoogleAuthService.ts');
    return;
  }

  if (auth && drive && sheets) {
    // Already initialized
    return;
  }

  try {
    console.log('⚠️ Initializing LEGACY Google services with service account (not recommended for multi-user apps)');
    const credentials = loadCredentialsFromFile();
    
    if (credentials) {
      console.log('Loading Google credentials from JSON file');
      auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });
      
      // Add clock skew tolerance to handle time synchronization issues
      // This helps prevent "invalid_grant: Invalid JWT Signature" errors
      (auth as any).clockSkewSeconds = 300; // 5 minutes tolerance
    } else {
      // Fallback to environment variables
      console.log('Loading Google credentials from environment variables');
      
      // Process the private key to handle different formats
      let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
      
      // Remove leading quote if present
      if (privateKey.startsWith('"')) {
        privateKey = privateKey.slice(1);
      }
      // Remove trailing quote if present
      if (privateKey.endsWith('"')) {
        privateKey = privateKey.slice(0, -1);
      }
      // Remove leading single quote if present
      if (privateKey.startsWith("'")) {
        privateKey = privateKey.slice(1);
      }
      // Remove trailing single quote if present
      if (privateKey.endsWith("'")) {
        privateKey = privateKey.slice(0, -1);
      }
      
      // Handle escaped newlines from environment variables
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // Handle literal \n strings (double-escaped)
      privateKey = privateKey.replace(/\\\\n/g, '\n');
      
      // Ensure proper PEM format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
      
      auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: privateKey,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });
      
      // Add clock skew tolerance to handle time synchronization issues
      // This helps prevent "invalid_grant: Invalid JWT Signature" errors
      (auth as any).clockSkewSeconds = 300; // 5 minutes tolerance
    }

    // Configure Google APIs with custom options to handle OpenSSL issues
    const googleConfig = {
      version: 'v3' as const,
      auth: auth,
    };

    drive = google.drive(googleConfig);
    sheets = google.sheets({ version: 'v4', auth });
    
    console.log('⚠️ Legacy Google services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google services:', error);
    throw error;
  }
}

/**
 * Get Google Drive instance
 * ⚠️ DEPRECATED: Use userGoogleDriveService.ts for per-user operations
 */
export function getDrive(): any {
  if (!drive) {
    initializeGoogleServices();
  }
  return drive;
}

/**
 * Get Google Sheets instance
 * ⚠️ DEPRECATED: Use userGoogleSheetsService.ts for per-user operations
 */
export function getSheets(): any {
  if (!sheets) {
    initializeGoogleServices();
  }
  return sheets;
}

/**
 * Get JWT auth instance
 * ⚠️ DEPRECATED: Use userGoogleAuthService.ts for per-user OAuth
 */
export function getAuth(): JWT | null {
  if (!auth) {
    initializeGoogleServices();
  }
  return auth;
}

// Helper function to extract ID from Google Drive/Sheet URL if present
function extractIdFromUrl(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    // Extract folders ID
    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (folderMatch && folderMatch[1]) {
      return folderMatch[1];
    }
    // Extract spreadsheets ID
    const sheetMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetMatch && sheetMatch[1]) {
      return sheetMatch[1];
    }
    // Extract open?id= ID or file/d/ID/view
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/) || trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
  }
  return trimmed;
}

// Environment variables
export const DRIVE_FOLDER_ID = extractIdFromUrl(process.env.GOOGLE_DRIVE_FOLDER_ID);
export const USE_SHARED_DRIVE = process.env.GOOGLE_USE_SHARED_DRIVE === 'true';
// SHARED_DRIVE_ID is the root Drive ID (different from a folder inside the drive).
// Set GOOGLE_SHARED_DRIVE_ID in .env if the folder in GOOGLE_DRIVE_FOLDER_ID lives
// inside a shared (Team) drive. When set, all uploads will include `driveId` in
// metadata and `supportsAllDrives=true` so the service account can write there.
export const SHARED_DRIVE_ID = extractIdFromUrl(process.env.GOOGLE_SHARED_DRIVE_ID) || null;
export const SHEET_ID = extractIdFromUrl(process.env.GOOGLE_SHEET_ID);
export const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';
export const SHEET_KELUAR_ID = extractIdFromUrl(process.env.GOOGLE_SHEET_KELUAR_ID);
export const SHEET_KELUAR_NAME = process.env.GOOGLE_SHEET_KELUAR_NAME || 'Sheet1';

/**
 * Service Account is preferred over OAuth when both are configured.
 * This avoids using stale/expired OAuth refresh tokens that can trigger
 * "invalid_grant" errors during file uploads.
 */
export const isServiceAccountConfigured = !!(
  process.env.GOOGLE_CREDENTIALS_PATH ||
  (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
);

export const isOAuthConfigured = !!(
  process.env.GOOGLE_OAUTH_CLIENT_ID &&
  process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN
);

export const isGoogleConfigured = isServiceAccountConfigured || isOAuthConfigured;

export function resolveGoogleAuthMode(options?: {
  serviceAccountConfigured?: boolean;
  oauthConfigured?: boolean;
  preferOAuth?: boolean | string;
}): 'service-account' | 'oauth' {
  const hasServiceAccount = options?.serviceAccountConfigured ?? isServiceAccountConfigured;
  const hasOAuth = options?.oauthConfigured ?? isOAuthConfigured;
  const preferOAuth = options?.preferOAuth ?? process.env.GOOGLE_USE_OAUTH;
  const shouldPreferOAuth = preferOAuth === 'true' || preferOAuth === true;

  // Service account is the default and safest option for Drive/Sheets writes.
  // OAuth refresh tokens can expire or be revoked and cause "invalid_grant"
  // errors. We keep service-account precedence unless the app explicitly
  // disables it and there is no service account available.
  if (hasServiceAccount) {
    return 'service-account';
  }

  if (hasOAuth && shouldPreferOAuth) {
    return 'oauth';
  }

  if (hasOAuth) {
    return 'oauth';
  }

  return 'service-account';
}

export const useOAuth = resolveGoogleAuthMode() === 'oauth';