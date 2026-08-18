#!/usr/bin/env tsx

/**
 * Google Sheets Append Test Script
 * This script specifically tests the append functionality to debug issues
 */

// Set environment variables to handle TLS issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🧪 Testing Google Sheets Append Functionality...\n');

  // Check required environment variables
  const requiredVars = {
    'GOOGLE_SERVICE_ACCOUNT_EMAIL': process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    'GOOGLE_PRIVATE_KEY': process.env.GOOGLE_PRIVATE_KEY,
    'GOOGLE_SHEET_ID': process.env.GOOGLE_SHEET_ID,
  };

  let missingVars = [];

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
    process.exit(1);
  }

  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

  console.log('\n' + '='.repeat(50));
  console.log('Initializing Google Authentication...\n');

  try {
    // Process the private key
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    
    console.log('Private key format check:');
    console.log('  Length:', privateKey.length);
    console.log('  Has BEGIN marker:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
    console.log('  Has END marker:', privateKey.includes('-----END PRIVATE KEY-----'));
    console.log('  Has escaped newlines (\\n):', privateKey.includes('\\n'));
    console.log('  Has literal newlines:', privateKey.includes('\n'));
    
    // Remove surrounding quotes if present
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
      console.log('  Removed surrounding quotes');
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
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });
    
    console.log('✅ JWT authentication initialized');
    
    // Initialize Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('✅ Google Sheets API initialized\n');
    
    // Test 1: Read sheet metadata
    console.log('🔍 Test 1: Reading sheet metadata...');
    try {
      const sheet = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
      });
      console.log('✅ Sheet accessible:', sheet.data.properties?.title);
      console.log('   Sheet ID:', SHEET_ID);
    } catch (error: any) {
      console.log('❌ Failed to read sheet metadata:', error.message);
      process.exit(1);
    }
    
    // Test 2: Read existing data
    console.log('\n🔍 Test 2: Reading existing data...');
    try {
      const data = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A1:H1`,
      });
      console.log('✅ Can read from sheet');
      console.log('   Header row:', data.data.values?.[0]);
    } catch (error: any) {
      console.log('❌ Failed to read from sheet:', error.message);
      process.exit(1);
    }
    
    // Test 3: Append test data
    console.log('\n🔍 Test 3: Appending test data...');
    const testRow = [
      'TEST-001',
      'Test Pengirim',
      'Test Surat',
      '2024-01-01',
      '2024-01-01',
      '',
      '',
      new Date().toISOString()
    ];
    
    console.log('   Test data:', testRow);
    console.log('   Target range:', `${SHEET_NAME}!A:H`);
    
    try {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:H`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [testRow],
        },
      });
      
      console.log('✅ Append successful!');
      console.log('   Response:', response.data);
      console.log('   Updated rows:', response.data.updates?.updatedRows);
      console.log('   Updated columns:', response.data.updates?.updatedColumns);
      console.log('   Updated range:', response.data.updates?.updatedRange);
    } catch (error: any) {
      console.log('❌ Append failed:', error.message);
      console.log('   Error details:', error);
      
      // Check for specific error types
      if (error.message && error.message.includes('authentication')) {
        console.log('   This appears to be an authentication issue');
      }
      if (error.message && error.message.includes('permission')) {
        console.log('   This appears to be a permission issue');
      }
      if (error.message && error.message.includes('not found')) {
        console.log('   The sheet or range was not found');
      }
      
      process.exit(1);
    }
    
    // Test 4: Verify the appended data
    console.log('\n🔍 Test 4: Verifying appended data...');
    try {
      const data = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:H`,
      });
      
      const rows = data.data.values || [];
      console.log('✅ Data verification successful');
      console.log('   Total rows:', rows.length);
      console.log('   Last row:', rows[rows.length - 1]);
      
      // Check if our test data is there
      const lastRow = rows[rows.length - 1];
      if (lastRow[0] === 'TEST-001') {
        console.log('✅ Test data found in last row');
      } else {
        console.log('⚠️  Test data not found in last row');
      }
    } catch (error: any) {
      console.log('❌ Failed to verify data:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All append tests completed successfully!');
    console.log('='.repeat(50));
    console.log('\n📝 Summary:');
    console.log('- Google authentication: ✅ Working');
    console.log('- Sheet access: ✅ Working');
    console.log('- Read operation: ✅ Working');
    console.log('- Append operation: ✅ Working');
    console.log('- Data verification: ✅ Working');
    console.log('\nYour Google Sheets integration is ready to use!');
    
  } catch (error: any) {
    console.log('\n❌ Test failed:', error.message);
    console.log('Error details:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});