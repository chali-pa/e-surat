import { 
  createCustomFolder, 
  validateFolderOwnership, 
  initializeUserDriveStructure,
  getMonthlyFolders 
} from '../services/userGoogleDriveService';
import { createIncomingLetterRecord } from '../models/Surat';
import { findUserById, createUser } from '../models/User';
import pool from '../config/database';

async function testFolderFlow() {
  try {
    console.log('=== VERIFICATION TEST SUITE ===');
    
    // Find first user in DB
    const usersRes = await pool.query('SELECT * FROM users ORDER BY id ASC LIMIT 1');
    const user = usersRes.rows[0];
    if (!user) {
      console.error('No users found in database.');
      process.exit(1);
    }
    
    const userId = user.id;
    console.log(`[Diagnostic] User 1 ID: ${userId}, Email: ${user.email}`);

    // Create a second user for isolation testing if not exists
    const user2Res = await pool.query('SELECT * FROM users WHERE email = $1', ['testuser2@example.com']);
    let user2 = user2Res.rows[0];
    if (!user2) {
      console.log('Creating Test User 2 for user isolation test...');
      user2 = await createUser('Test User 2', 'testuser2@example.com', 'TestPassword123!');
    }
    const user2Id = user2.id;
    console.log(`[Diagnostic] User 2 ID: ${user2Id}, Email: ${user2.email}`);

    // Clean up old test folders
    await pool.query("DELETE FROM folders WHERE name IN ('TEST INCOMING FOLDER', 'TEST OUTGOING FOLDER')");

    // 1. Provisioning Test: Create esurat and esurat-keluar root folders
    console.log('\n--- Test 1: Provisioning Drive Roots ---');
    const provisionResult1 = await initializeUserDriveStructure(userId);
    console.log('User 1 Roots:', provisionResult1);
    if (!provisionResult1.incomingRootId || !provisionResult1.outgoingRootId) {
      throw new Error('Failed: Roots not provisioned.');
    }
    if (provisionResult1.incomingRootId === provisionResult1.outgoingRootId) {
      throw new Error('Failed: Incoming and Outgoing root folder IDs are identical.');
    }

    // Re-run provisioning for idempotency check
    console.log('Re-running provisioning (idempotency check)...');
    const provisionResult2 = await initializeUserDriveStructure(userId);
    if (provisionResult1.incomingRootId !== provisionResult2.incomingRootId || 
        provisionResult1.outgoingRootId !== provisionResult2.outgoingRootId) {
      throw new Error('Failed: Provisioning is not idempotent. Root IDs changed.');
    }
    console.log('Provisioning is idempotent and distinct!');

    // 2. Create custom folders under separate roots
    console.log('\n--- Test 2: Creating Custom Folders ---');
    const incomingFolder = await createCustomFolder(
      userId,
      '08-26',
      'TEST INCOMING FOLDER',
      'incoming',
      'pdf'
    );
    console.log('Created Incoming Custom Folder:', incomingFolder);

    const outgoingFolder = await createCustomFolder(
      userId,
      '08-26',
      'TEST OUTGOING FOLDER',
      'outgoing',
      'pdf'
    );
    console.log('Created Outgoing Custom Folder:', outgoingFolder);

    if (incomingFolder.folderId === outgoingFolder.folderId ||
        incomingFolder.googleDriveFolderId === outgoingFolder.googleDriveFolderId) {
      throw new Error('Failed: Incoming and Outgoing custom folders share IDs.');
    }

    // 3. Dropdown filtering: fetch folders per mail type
    console.log('\n--- Test 3: Dropdown List Isolation ---');
    const incomingList = await getMonthlyFolders(userId, '08-26', 'incoming');
    const outgoingList = await getMonthlyFolders(userId, '08-26', 'outgoing');

    console.log('Incoming dropdown folders:', incomingList.map(f => f.name));
    console.log('Outgoing dropdown folders:', outgoingList.map(f => f.name));

    const hasOutgoingInIncoming = incomingList.some(f => f.name === 'TEST OUTGOING FOLDER');
    const hasIncomingInOutgoing = outgoingList.some(f => f.name === 'TEST INCOMING FOLDER');

    if (hasOutgoingInIncoming || hasIncomingInOutgoing) {
      throw new Error('Failed: Dropdown lists are mixed up.');
    }
    console.log('Dropdown list separation validated successfully!');

    // 4. Ownership and Mail Type Validation Checks
    console.log('\n--- Test 4: Validation Checks ---');
    
    // Own incoming folder for incoming letter: Valid
    const check1 = await validateFolderOwnership(userId, incomingFolder.folderId, 'incoming');
    console.log('Own incoming folder + incoming letter:', check1);
    if (!check1.valid) throw new Error('Failed: Own incoming folder should be valid for incoming letter');

    // Own outgoing folder for outgoing letter: Valid
    const check2 = await validateFolderOwnership(userId, outgoingFolder.folderId, 'outgoing');
    console.log('Own outgoing folder + outgoing letter:', check2);
    if (!check2.valid) throw new Error('Failed: Own outgoing folder should be valid for outgoing letter');

    // Own incoming folder for outgoing letter: Rejected
    const check3 = await validateFolderOwnership(userId, incomingFolder.folderId, 'outgoing');
    console.log('Own incoming folder + outgoing letter (should fail):', check3);
    if (check3.valid) throw new Error('Failed: Own incoming folder should be rejected for outgoing letter');

    // Own outgoing folder for incoming letter: Rejected
    const check4 = await validateFolderOwnership(userId, outgoingFolder.folderId, 'incoming');
    console.log('Own outgoing folder + incoming letter (should fail):', check4);
    if (check4.valid) throw new Error('Failed: Own outgoing folder should be rejected for incoming letter');

    // 5. User Isolation Checks
    console.log('\n--- Test 5: User Isolation Validation ---');
    // User 2 trying to use User 1's folder: Rejected
    const check5 = await validateFolderOwnership(user2Id, incomingFolder.folderId, 'incoming');
    console.log("User 2 validating User 1's folder (should fail):", check5);
    if (check5.valid) throw new Error("Security Failed: User 2 accepted for User 1's folder.");

    // Clean up
    await pool.query("DELETE FROM folders WHERE name IN ('TEST INCOMING FOLDER', 'TEST OUTGOING FOLDER')");
    console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ Verification failed:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testFolderFlow();
