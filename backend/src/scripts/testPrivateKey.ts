#!/usr/bin/env tsx

/**
 * Private Key Test Script
 * This script tests if the private key can be loaded properly
 */

import dotenv from 'dotenv';
import { JWT } from 'google-auth-library';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🔍 Testing Private Key Loading...\n');

  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !email) {
    console.log('❌ Missing credentials');
    process.exit(1);
  }

  console.log('Email:', email);
  console.log('Key length:', privateKey.length);
  console.log('Has BEGIN marker:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
  console.log('Has END marker:', privateKey.includes('-----END PRIVATE KEY-----'));
  console.log('Has escaped newlines (\\n):', privateKey.includes('\\n'));
  console.log('Has literal newlines:', privateKey.includes('\n'));

  // Try different key processing approaches
  console.log('\n🔍 Testing different key formats...\n');

  // Test 1: Direct use
  console.log('Test 1: Direct use of key from .env');
  try {
    const auth = new JWT({
      email: email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('✅ Direct use: SUCCESS');
  } catch (error: any) {
    console.log('❌ Direct use: FAILED -', error.message);
  }

  // Test 2: Replace \n with actual newlines
  console.log('\nTest 2: Replace \\n with actual newlines');
  try {
    const key2 = privateKey.replace(/\\n/g, '\n');
    const auth = new JWT({
      email: email,
      key: key2,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('✅ Replace \\n: SUCCESS');
  } catch (error: any) {
    console.log('❌ Replace \\n: FAILED -', error.message);
  }

  // Test 3: Remove quotes if present
  console.log('\nTest 3: Remove surrounding quotes');
  try {
    let key3 = privateKey;
    if (key3.startsWith('"') && key3.endsWith('"')) {
      key3 = key3.slice(1, -1);
    }
    key3 = key3.replace(/\\n/g, '\n');
    const auth = new JWT({
      email: email,
      key: key3,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('✅ Remove quotes: SUCCESS');
  } catch (error: any) {
    console.log('❌ Remove quotes: FAILED -', error.message);
  }

  // Test 4: Full processing
  console.log('\nTest 4: Full processing (as used in services)');
  try {
    let key4 = privateKey;
    key4 = key4.replace(/\\n/g, '\n');
    key4 = key4.replace(/\\\\n/g, '\n');
    if (!key4.includes('-----BEGIN PRIVATE KEY-----')) {
      key4 = `-----BEGIN PRIVATE KEY-----\n${key4}\n-----END PRIVATE KEY-----`;
    }
    const auth = new JWT({
      email: email,
      key: key4,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('✅ Full processing: SUCCESS');
    console.log('   This is the format that will be used in the application');
  } catch (error: any) {
    console.log('❌ Full processing: FAILED -', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Test completed. Review the results above.');
  console.log('='.repeat(50));
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});