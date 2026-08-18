#!/usr/bin/env tsx

/**
 * OAuth 2.0 Token Generator Script
 * This script helps you get a refresh token for Google OAuth 2.0
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('=== Google OAuth 2.0 Token Generator ===\n');

  // Check if credentials are provided
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || await question('Enter your Google OAuth Client ID: ');
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || await question('Enter your Google OAuth Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('Client ID and Client Secret are required');
    process.exit(1);
  }

  // Create OAuth2 client
  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob' // Out-of-band for desktop apps
  );

  // Get authorization URL
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  console.log('\n1. Open this URL in your browser:');
  console.log(authUrl);
  console.log('\n2. Sign in with your Google account');
  console.log('3. Authorize the application');
  console.log('4. Copy the authorization code\n');

  const code = await question('5. Paste the authorization code here: ');

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.error('No refresh token received. Make sure you selected "consent" prompt.');
      process.exit(1);
    }

    console.log('\n=== SUCCESS ===');
    console.log('Your refresh token:');
    console.log(tokens.refresh_token);
    console.log('\nAdd this to your .env file:');
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nAlso add these if not already present:');
    console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`);
  } catch (error: any) {
    console.error('Error getting tokens:', error.message);
    console.error('Make sure:');
    console.error('- The authorization code is correct');
    console.error('- The OAuth client ID and secret are correct');
    console.error('- You have enabled Google Drive and Sheets APIs');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  rl.close();
  process.exit(1);
});
