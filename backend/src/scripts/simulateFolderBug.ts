import { createCustomFolder, validateFolderOwnership } from '../services/userGoogleDriveService';
import { findUserByEmail } from '../models/User';
import pool from '../config/database';

async function testFolderFlow() {
  try {
    console.log('=== SIMULATING FOLDER BUG FLOW ===');
    
    // Find the first user in DB
    const usersRes = await pool.query('SELECT * FROM users LIMIT 1');
    const user = usersRes.rows[0];
    if (!user) {
      console.error('No users found in database. Create a user first.');
      process.exit(1);
    }
    
    const userId = user.id;
    console.log(`Using user ID: ${userId}, Email: ${user.email}`);

    // Clean up previous test folders to keep it pristine
    await pool.query("DELETE FROM folders WHERE name = 'TEST BUG FOLDER'");
    
    // 1. Create custom folder
    console.log('\n--- Step 1: Creating custom folder ---');
    const createResult = await createCustomFolder(
      userId,
      '08-26', // month/year format
      'TEST BUG FOLDER',
      'incoming',
      'pdf'
    );
    console.log('Creation Result:', createResult);

    // 2. Validate custom folder
    console.log('\n--- Step 2: Validating custom folder ---');
    const validationResult = await validateFolderOwnership(
      userId,
      createResult.folderId, // This is string from folder.id
      'incoming'
    );
    console.log('Validation Result:', validationResult);
    
    if (validationResult.valid) {
      console.log('\n✅ TEST PASSED: Folder validated successfully!');
    } else {
      console.log('\n❌ TEST FAILED: Folder validation rejected!');
    }
    
    // Clean up
    await pool.query("DELETE FROM folders WHERE name = 'TEST BUG FOLDER'");
    process.exit(validationResult.valid ? 0 : 1);
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
}

testFolderFlow();
