#!/usr/bin/env tsx

/**
 * Google Configuration Checker
 * This script checks if Google credentials are properly configured
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function main() {
  console.log('🔍 Checking Google API Configuration...\n');

  // Check required environment variables
  const requiredVars = {
    'GOOGLE_SERVICE_ACCOUNT_EMAIL': process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    'GOOGLE_PRIVATE_KEY': process.env.GOOGLE_PRIVATE_KEY,
    'GOOGLE_DRIVE_FOLDER_ID': process.env.GOOGLE_DRIVE_FOLDER_ID,
    'GOOGLE_SHEET_ID': process.env.GOOGLE_SHEET_ID,
    'GOOGLE_SHEET_KELUAR_ID': process.env.GOOGLE_SHEET_KELUAR_ID,
  };

  let allConfigured = true;

  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      console.log(`❌ ${key}: NOT CONFIGURED`);
      allConfigured = false;
    } else {
      // Mask sensitive values
      const displayValue = key.includes('PRIVATE_KEY') 
        ? '***CONFIGURED***' 
        : value;
      console.log(`✅ ${key}: ${displayValue}`);
    }
  });

  console.log('\n' + '='.repeat(50));

  if (allConfigured) {
    console.log('✅ All required Google credentials are configured!');
    console.log('\nNext steps:');
    console.log('1. Make sure you have shared the Google Drive folder with the service account email');
    console.log('2. Make sure you have shared the Google Sheets with the service account email');
    console.log('3. Verify the service account has "Editor" permissions');
    console.log('4. Start the server: npm run dev');
  } else {
    console.log('❌ Some Google credentials are missing!');
    console.log('\nPlease configure the missing variables in your .env file');
    console.log('See GOOGLE_SETUP.md for detailed instructions');
  }

  console.log('='.repeat(50));

  process.exit(allConfigured ? 0 : 1);
}

main();
