#!/usr/bin/env tsx

/**
 * Service Account Permissions Checker Script
 * This script checks if the service account has proper permissions
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  console.log('=== Service Account Permissions Checker ===\n');

  // Check which authentication method is configured
  const useOAuth = !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );

  const useServiceAccount = !!(
    process.env.GOOGLE_CREDENTIALS_PATH ||
    (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
  );

  console.log(`Authentication method: ${useOAuth ? 'OAuth 2.0' : useServiceAccount ? 'Service Account' : 'None'}`);

  if (useOAuth) {
    console.log('Using OAuth 2.0 - checking personal account permissions...');
    await checkOAuthPermissions();
  } else if (useServiceAccount) {
    console.log('Using Service Account - checking service account permissions...');
    await checkServiceAccountPermissions();
  } else {
    console.error('No Google credentials configured');
    process.exit(1);
  }
}

async function checkServiceAccountPermissions() {
  let auth: JWT;
  let credentials: any = null;

  // Try to load from JSON file first
  if (process.env.GOOGLE_CREDENTIALS_PATH) {
    const credentialsPath = path.resolve(process.cwd(), process.env.GOOGLE_CREDENTIALS_PATH);
    if (fs.existsSync(credentialsPath)) {
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      credentials = JSON.parse(credentialsContent);
      console.log('✅ Loaded credentials from JSON file');
      console.log('   Service Account:', credentials.client_email);
    }
  }

  if (credentials) {
    auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    console.log('Using environment variables');
    auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });
  } else {
    console.error('No service account credentials found');
    process.exit(1);
  }

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  // Check Drive folder permissions
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    console.log('\n📁 Checking Google Drive folder permissions...');
    try {
      const folder = await drive.files.get({
        fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        fields: 'id,name,permissions',
      });
      console.log('✅ Folder accessible:', folder.data.name);
      
      // Check permissions
      const permissions = await drive.permissions.list({
        fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        fields: 'permissions(id,emailAddress,role,type)',
      });
      
      const serviceAccountEmail = credentials?.client_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const hasPermission = permissions.data.permissions?.some(
        (p: any) => p.emailAddress === serviceAccountEmail && 
        (p.role === 'writer' || p.role === 'editor' || p.role === 'organizer' || p.role === 'fileOrganizer' || p.role === 'contentManager')
      );
      
      if (hasPermission) {
        console.log('✅ Service account has proper permissions on folder');
      } else {
        console.log('❌ Service account does NOT have proper permissions on folder');
        console.log('   Required role: writer, editor, organizer, fileOrganizer, or contentManager');
        console.log('   Service account email:', serviceAccountEmail);
        console.log('\n   To fix this:');
        console.log('   1. Open Google Drive');
        console.log('   2. Right-click the folder and select "Share"');
        console.log(`   3. Add: ${serviceAccountEmail}`);
        console.log('   4. Set role to "Editor" or "Content Manager"');
      }
    } catch (error: any) {
      console.error('❌ Cannot access folder:', error.message);
      console.log('   Make sure the folder ID is correct and the service account has access');
    }
  } else {
    console.log('⚠️  GOOGLE_DRIVE_FOLDER_ID not configured');
  }

  // Check Sheets permissions
  if (process.env.GOOGLE_SHEET_ID) {
    console.log('\n📊 Checking Google Sheet (Surat Masuk) permissions...');
    try {
      const sheet = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
      });
      console.log('✅ Sheet accessible:', sheet.data.properties?.title);
    } catch (error: any) {
      console.error('❌ Cannot access sheet:', error.message);
      console.log('   Make sure the sheet ID is correct and the service account has Editor access');
    }
  }

  if (process.env.GOOGLE_SHEET_KELUAR_ID) {
    console.log('\n📊 Checking Google Sheet (Surat Keluar) permissions...');
    try {
      const sheet = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_KELUAR_ID,
      });
      console.log('✅ Sheet accessible:', sheet.data.properties?.title);
    } catch (error: any) {
      console.error('❌ Cannot access sheet:', error.message);
      console.log('   Make sure the sheet ID is correct and the service account has Editor access');
    }
  }
}

async function checkOAuthPermissions() {
  const { OAuth2Client } = await import('google-auth-library');
  
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  // Check Drive folder permissions
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    console.log('\n📁 Checking Google Drive folder access...');
    try {
      const folder = await drive.files.get({
        fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        fields: 'id,name',
      });
      console.log('✅ Folder accessible:', folder.data.name);
    } catch (error: any) {
      console.error('❌ Cannot access folder:', error.message);
      console.log('   Make sure the folder ID is correct and you have access');
    }
  } else {
    console.log('⚠️  GOOGLE_DRIVE_FOLDER_ID not configured');
  }

  // Check Sheets permissions
  if (process.env.GOOGLE_SHEET_ID) {
    console.log('\n📊 Checking Google Sheet (Surat Masuk) access...');
    try {
      const sheet = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
      });
      console.log('✅ Sheet accessible:', sheet.data.properties?.title);
    } catch (error: any) {
      console.error('❌ Cannot access sheet:', error.message);
      console.log('   Make sure the sheet ID is correct and you have Editor access');
    }
  }

  if (process.env.GOOGLE_SHEET_KELUAR_ID) {
    console.log('\n📊 Checking Google Sheet (Surat Keluar) access...');
    try {
      const sheet = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_KELUAR_ID,
      });
      console.log('✅ Sheet accessible:', sheet.data.properties?.title);
    } catch (error: any) {
      console.error('❌ Cannot access sheet:', error.message);
      console.log('   Make sure the sheet ID is correct and you have Editor access');
    }
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
