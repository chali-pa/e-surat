#!/usr/bin/env tsx

/**
 * Google Connection Test Script
 * This script tests the connection to Google Drive and Sheets
 */

// Set environment variables to handle TLS issues with Node.js v24
// process.env.NODE_OPTIONS = '--openssl-legacy-provider';

import dotenv from 'dotenv';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🧪 Testing Google API Connection...\n');

  // Check if using JSON file or environment variables
  const usingJsonFile = !!process.env.GOOGLE_CREDENTIALS_PATH;
  console.log(`📁 Credential method: ${usingJsonFile ? 'JSON File' : 'Environment Variables'}`);

  if (usingJsonFile) {
    console.log(`✅ GOOGLE_CREDENTIALS_PATH: ${process.env.GOOGLE_CREDENTIALS_PATH}`);
    
    // Check if file exists
    const credentialsPath = path.resolve(process.cwd(), process.env.GOOGLE_CREDENTIALS_PATH!);
    if (fs.existsSync(credentialsPath)) {
      console.log('✅ Credentials file exists');
    } else {
      console.log('❌ Credentials file not found:', credentialsPath);
      process.exit(1);
    }
  } else {
    // Check required environment variables
    const requiredVars = {
      'GOOGLE_SERVICE_ACCOUNT_EMAIL': process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      'GOOGLE_PRIVATE_KEY': process.env.GOOGLE_PRIVATE_KEY,
    };

    let missingVars: string[] = [];

    Object.entries(requiredVars).forEach(([key, value]) => {
      if (!value) {
        console.log(`❌ ${key}: NOT CONFIGURED`);
        missingVars.push(key);
      } else {
        const displayValue = key.includes('PRIVATE_KEY') 
          ? '***CONFIGURED***' 
          : value;
        console.log(`✅ ${key}: ${displayValue}`);
      }
    });

    if (missingVars.length > 0) {
      console.log('\n❌ Missing required environment variables!');
      console.log('Please configure the following variables in your .env file:');
      missingVars.forEach(v => console.log(`  - ${v}`));
      process.exit(1);
    }
  }

  // Check other required environment variables
  const otherVars = {
    'GOOGLE_DRIVE_FOLDER_ID': process.env.GOOGLE_DRIVE_FOLDER_ID,
    'GOOGLE_SHEET_ID': process.env.GOOGLE_SHEET_ID,
    'GOOGLE_SHEET_KELUAR_ID': process.env.GOOGLE_SHEET_KELUAR_ID,
  };

  Object.entries(otherVars).forEach(([key, value]) => {
    if (!value) {
      console.log(`❌ ${key}: NOT CONFIGURED`);
    } else {
      console.log(`✅ ${key}: ${value}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('Initializing Google Authentication...\n');

  try {
    let auth: JWT;
    
    if (usingJsonFile) {
      // Load from JSON file
      const credentialsPath = path.resolve(process.cwd(), process.env.GOOGLE_CREDENTIALS_PATH!);
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsContent);
      
      console.log('✅ Loaded credentials from JSON file');
      console.log('  Service Account:', credentials.client_email);
      
      auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });
    } else {
      // Process the private key from environment variables
      let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
      
      console.log('Private key format check:');
      console.log('  Length:', privateKey.length);
      console.log('  Has BEGIN marker:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
      console.log('  Has END marker:', privateKey.includes('-----END PRIVATE KEY-----'));
      console.log('  Has escaped newlines (\\n):', privateKey.includes('\\n'));
      console.log('  Has literal newlines:', privateKey.includes('\n'));
      
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
      privateKey = privateKey.replace(/\\\\n/g, '\n');
      
      // Ensure proper PEM format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
      
      console.log('\n✅ Private key formatted successfully');
      
      // Initialize JWT auth
      auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: privateKey,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });
    }
    
    console.log('✅ JWT authentication initialized');
    
    // Initialize Google APIs
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('✅ Google APIs initialized\n');
    
    // Test Drive connection
    console.log('🔍 Testing Google Drive connection...');
    try {
      if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
        const folder = await drive.files.get({
          fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
          fields: 'id,name',
        });
        console.log('✅ Drive folder accessible:', folder.data.name);
      } else {
        console.log('⚠️  GOOGLE_DRIVE_FOLDER_ID not set, skipping Drive test');
      }
    } catch (driveError: any) {
      console.log('❌ Drive connection failed:', driveError.message);
      console.log('   Make sure the service account has access to the Drive folder');
    }
    
    // Test Sheets connection
    console.log('\n🔍 Testing Google Sheets connection...');
    
    // Test incoming sheet
    try {
      if (process.env.GOOGLE_SHEET_ID) {
        const sheet = await sheets.spreadsheets.get({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
        });
        console.log('✅ Incoming sheet accessible:', sheet.data.properties?.title);
        
        // Test reading data
        const data = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'Sheet1!A1:H1',
        });
        console.log('✅ Can read from sheet');
        
        // Test writing data (append a test row)
        const testRow = ['TEST', 'TEST', 'TEST', 'TEST', 'TEST', '', '', new Date().toISOString()];
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'Sheet1!A:H',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [testRow],
          },
        });
        console.log('✅ Can write to sheet');
      } else {
        console.log('⚠️  GOOGLE_SHEET_ID not set, skipping sheet test');
      }
    } catch (sheetError: any) {
      console.log('❌ Sheet connection failed:', sheetError.message);
      console.log('   Make sure the service account has Editor access to the sheet');
    }
    
    // Test outgoing sheet
    console.log('\n🔍 Testing Google Sheets (Keluar) connection...');
    try {
      if (process.env.GOOGLE_SHEET_KELUAR_ID) {
        const sheet = await sheets.spreadsheets.get({
          spreadsheetId: process.env.GOOGLE_SHEET_KELUAR_ID,
        });
        console.log('✅ Outgoing sheet accessible:', sheet.data.properties?.title);
      } else {
        console.log('⚠️  GOOGLE_SHEET_KELUAR_ID not set, skipping outgoing sheet test');
      }
    } catch (sheetKeluarError: any) {
      console.log('❌ Outgoing sheet connection failed:', sheetKeluarError.message);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Google connection test completed!');
    console.log('='.repeat(50));
    
  } catch (error: any) {
    console.log('\n❌ Authentication failed:', error.message);
    console.log('Please check your Google Service Account credentials');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});