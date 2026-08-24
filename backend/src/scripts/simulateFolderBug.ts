import { createCustomFolder, validateFolderOwnership } from '../services/userGoogleDriveService';
import { createIncomingLetterRecord } from '../models/Surat';
import pool from '../config/database';

async function testFolderFlow() {
  try {
    console.log('=== VERIFICATION TEST SUITE ===');
    
    // Find first user in DB
    const usersRes = await pool.query('SELECT * FROM users LIMIT 1');
    const user = usersRes.rows[0];
    if (!user) {
      console.error('No users found in database.');
      process.exit(1);
    }
    
    const userId = user.id;
    console.log(`[Diagnostic] User ID: ${userId}, Email: ${user.email}`);

    // Clean up old test folder
    await pool.query("DELETE FROM folders WHERE name = 'DIAGNOSTIC TEST FOLDER'");
    
    // 1. Create custom folder
    console.log('\n--- Test 1: User creates a folder and immediately submits into it ---');
    const createResult = await createCustomFolder(
      userId,
      '08-26',
      'DIAGNOSTIC TEST FOLDER',
      'incoming',
      'pdf'
    );
    console.log('Created Folder ID:', createResult.folderId);

    const validResult = await validateFolderOwnership(userId, createResult.folderId, 'incoming');
    console.log('Validation result (own folder):', validResult);
    if (!validResult.valid) throw new Error('Failed: Own folder should be valid');

    // 2. Test saving letter with folder_id
    const suratRecord = await createIncomingLetterRecord({
      nomor_surat: 'TEST/VERIFY/001',
      nama_pengirim: 'Tester',
      nama_surat: 'Test Surat',
      tanggal_masuk: '2026-08-24',
      tanggal_buat: '2026-08-24',
      user_id: userId,
      folder_id: parseInt(createResult.folderId, 10),
    });
    const dbCheck = await pool.query('SELECT id, folder_id FROM surats WHERE id = $1', [suratRecord.id]);
    console.log('Letter DB record folder_id:', dbCheck.rows[0]?.folder_id);
    if (dbCheck.rows[0]?.folder_id !== parseInt(createResult.folderId, 10)) {
      throw new Error('Failed: folder_id was not saved on letter record');
    }
    await pool.query('DELETE FROM surats WHERE id = $1', [suratRecord.id]);

    // 3. Test submitting letter with no folder selected
    console.log('\n--- Test 2: Submit with no folder selected ---');
    const noFolderSurat = await createIncomingLetterRecord({
      nomor_surat: 'TEST/NOFOLDER/001',
      nama_pengirim: 'Tester',
      nama_surat: 'Test Surat',
      tanggal_masuk: '2026-08-24',
      tanggal_buat: '2026-08-24',
      user_id: userId,
    });
    const noFolderDbCheck = await pool.query('SELECT id, folder_id FROM surats WHERE id = $1', [noFolderSurat.id]);
    console.log('Letter without folder DB record folder_id:', noFolderDbCheck.rows[0]?.folder_id);
    if (noFolderDbCheck.rows[0]?.folder_id !== null) {
      throw new Error('Failed: folder_id should be null when no folder is selected');
    }
    await pool.query('DELETE FROM surats WHERE id = $1', [noFolderSurat.id]);

    // 4. Test security: Fabricated folder ID
    console.log('\n--- Test 3: Fabricated folder ID ---');
    const fakeResult = await validateFolderOwnership(userId, '999999', 'incoming');
    console.log('Validation result (fabricated ID):', fakeResult);
    if (fakeResult.valid) throw new Error('Security Failed: Fabricated folder ID was accepted');

    // 5. Test security: Another user's folder ID
    console.log('\n--- Test 4: Another user folder ID ---');
    const otherUserResult = await validateFolderOwnership(99999, createResult.folderId, 'incoming');
    console.log('Validation result (wrong user):', otherUserResult);
    if (otherUserResult.valid) throw new Error('Security Failed: Another user folder ID was accepted');

    // 6. Test security: Mismatched letter type
    console.log('\n--- Test 5: Mismatched letter_type ---');
    const wrongTypeResult = await validateFolderOwnership(userId, createResult.folderId, 'outgoing');
    console.log('Validation result (wrong letter_type):', wrongTypeResult);
    if (wrongTypeResult.valid) throw new Error('Security Failed: Mismatched letter_type was accepted');

    // Clean up test folder
    await pool.query("DELETE FROM folders WHERE name = 'DIAGNOSTIC TEST FOLDER'");
    console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ Verification failed:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testFolderFlow();
