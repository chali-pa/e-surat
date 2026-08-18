import dotenv from 'dotenv';

dotenv.config();

console.log('=== Private Key Debug Tool ===\n');

const privateKey = process.env.GOOGLE_PRIVATE_KEY;

if (!privateKey) {
  console.error('❌ GOOGLE_PRIVATE_KEY not found');
  process.exit(1);
}

console.log('Raw key length:', privateKey.length);
console.log('First 50 chars:', privateKey.substring(0, 50));
console.log('Last 50 chars:', privateKey.substring(privateKey.length - 50));

// Check for various encoding issues
console.log('\n=== Encoding Analysis ===');
console.log('Has \\n (backslash-n):', privateKey.includes('\\n'));
console.log('Has \n (newline):', privateKey.includes('\n'));
console.log('Has \\r (backslash-r):', privateKey.includes('\\r'));
console.log('Has \r (carriage return):', privateKey.includes('\r'));
console.log('Has \\t (backslash-t):', privateKey.includes('\\t'));
console.log('Has \t (tab):', privateKey.includes('\t'));

// Check for quotes
console.log('\n=== Quote Analysis ===');
console.log('Starts with ":', privateKey.startsWith('"'));
console.log('Ends with ":', privateKey.endsWith('"'));
console.log('Starts with \':', privateKey.startsWith("'"));
console.log('Ends with \':', privateKey.endsWith("'"));

// Try different processing approaches
console.log('\n=== Processing Attempts ===');

// Attempt 1: Remove quotes if present
let key1 = privateKey;
if (key1.startsWith('"') && key1.endsWith('"')) {
  key1 = key1.slice(1, -1);
}
console.log('Attempt 1 (remove quotes):', key1.length);

// Attempt 2: Replace escaped newlines
let key2 = key1.replace(/\\n/g, '\n');
console.log('Attempt 2 (replace \\n):', key2.length);

// Attempt 3: Replace double-escaped newlines
let key3 = key2.replace(/\\\\n/g, '\n');
console.log('Attempt 3 (replace \\\\n):', key3.length);

// Attempt 4: Ensure PEM format
let key4 = key3;
if (!key4.includes('-----BEGIN PRIVATE KEY-----')) {
  key4 = `-----BEGIN PRIVATE KEY-----\n${key4}\n-----END PRIVATE KEY-----`;
}
console.log('Attempt 4 (ensure PEM):', key4.length);

// Show the processed key
console.log('\n=== Processed Key Sample ===');
console.log(key4.substring(0, 100));
console.log('...');
console.log(key4.substring(key4.length - 100));

// Try to validate with Google Auth
console.log('\n=== Google Auth Validation ===');
try {
  const { JWT } = require('google-auth-library');
  
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: key4,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  console.log('✅ JWT created successfully with processed key');
  
  // Try to get a token
  auth.authorize().then(() => {
    console.log('✅ Authentication successful!');
  }).catch((err: any) => {
    console.log('❌ Authentication failed:', err.message);
    console.log('Error code:', err.code);
  });
  
} catch (error: any) {
  console.log('❌ JWT creation failed:', error.message);
  console.log('Error code:', error.code);
  console.log('Error stack:', error.stack);
}
