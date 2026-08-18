import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

function main() {
  console.log('=== Google Service Account Key Fixer ===\n');

  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!privateKey) {
    console.error('❌ GOOGLE_PRIVATE_KEY not found in .env file');
    console.log('Please add your Google Service Account private key to the .env file');
    process.exit(1);
  }

  console.log('Current private key format check:');
  console.log('Length:', privateKey.length);
  console.log('Has BEGIN marker:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
  console.log('Has END marker:', privateKey.includes('-----END PRIVATE KEY-----'));
  console.log('Has escaped newlines (\\n):', privateKey.includes('\\n'));
  console.log('Has literal newlines:', privateKey.includes('\n'));

  // Fix the key
  let fixedKey = privateKey;

  // Handle different escape formats
  fixedKey = fixedKey.replace(/\\n/g, '\n');
  fixedKey = fixedKey.replace(/\\\\n/g, '\n');

  // Ensure proper PEM format
  if (!fixedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    fixedKey = `-----BEGIN PRIVATE KEY-----\n${fixedKey}\n-----END PRIVATE KEY-----`;
  }

  console.log('\n=== Fixed Key Format ===');
  console.log('Has BEGIN marker:', fixedKey.includes('-----BEGIN PRIVATE KEY-----'));
  console.log('Has END marker:', fixedKey.includes('-----END PRIVATE KEY-----'));
  console.log('Has proper newlines:', fixedKey.includes('\n'));

  // Create a backup of the original .env
  const envPath = path.join(process.cwd(), '.env');
  const backupPath = path.join(process.cwd(), '.env.backup');

  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath);
    console.log(`\n✅ Backup created at: ${backupPath}`);
  }

  // Update the .env file with the fixed key
  const envContent = fs.readFileSync(envPath, 'utf8');
  const updatedContent = envContent.replace(
    /GOOGLE_PRIVATE_KEY=.*/,
    `GOOGLE_PRIVATE_KEY="${fixedKey.replace(/\n/g, '\\n')}"`
  );

  fs.writeFileSync(envPath, updatedContent);
  console.log('✅ .env file updated with fixed private key format');
  console.log('\n=== Instructions ===');
  console.log('1. The .env file has been updated with the corrected private key format');
  console.log('2. A backup has been saved as .env.backup');
  console.log('3. Restart your backend server: npm run dev');
  console.log('4. Try creating a surat again');
  console.log('\nIf the issue persists, check:');
  console.log('- Your Google Service Account has proper permissions for Drive and Sheets');
  console.log('- The Sheet IDs in your .env file are correct');
  console.log('- The Drive folder ID in your .env file is correct');
}

main();
