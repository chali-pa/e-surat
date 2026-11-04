import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/database';
import { ensureUserGoogleColumns, findUserById, updateUserStorageSettings } from '../models/User';
import { ensureSuratColumns } from '../models/Surat';

async function runTests() {
  console.log('🧪 Starting Multi-Folder Storage & Database Verification Tests...\n');

  try {
    // 1. Column Migration Verification
    console.log('--- Test 1: Column Schema Migration ---');
    await ensureUserGoogleColumns();
    console.log('✅ ensureUserGoogleColumns() executed successfully.');
    await ensureSuratColumns();
    console.log('✅ ensureSuratColumns() executed successfully.');

    // Check columns in users table
    const userRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
    );
    const userFieldNames = userRes.rows.map((r: any) => r.column_name);
    const expectedUserFields = [
      'incoming_storage_folder_id',
      'incoming_storage_folder_name',
      'outgoing_storage_folder_id',
      'outgoing_storage_folder_name',
      'incoming_monthly_organization',
      'outgoing_monthly_organization'
    ];
    for (const field of expectedUserFields) {
      if (!userFieldNames.includes(field)) {
        throw new Error(`Missing expected field in users: ${field}`);
      }
    }
    console.log('✅ All 6 storage configuration columns verified in users table.');

    // Check columns in surats and surat_keluars tables
    const expectedSuratFields = [
      'drive_parent_folder_id',
      'original_file_name',
      'file_mime_type',
      'storage_destination'
    ];

    const suratRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'surats'"
    );
    const suratFieldNames = suratRes.rows.map((r: any) => r.column_name);
    for (const field of expectedSuratFields) {
      if (!suratFieldNames.includes(field)) {
        throw new Error(`Missing expected field in surats: ${field}`);
      }
    }
    console.log('✅ All 4 audit tracking columns verified in surats table.');

    const suratKeluarRes = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'surat_keluars'"
    );
    const suratKeluarFieldNames = suratKeluarRes.rows.map((r: any) => r.column_name);
    for (const field of expectedSuratFields) {
      if (!suratKeluarFieldNames.includes(field)) {
        throw new Error(`Missing expected field in surat_keluars: ${field}`);
      }
    }
    console.log('✅ All 4 audit tracking columns verified in surat_keluars table.');

    // 2. User Storage Settings Persistence Test
    console.log('\n--- Test 2: User Storage Settings Model Persistence ---');
    const usersRes = await pool.query('SELECT id, email FROM users LIMIT 1');
    if (usersRes.rows.length === 0) {
      console.log('⚠️ No users found in database to test storage settings updates, skipping User persistence test.');
    } else {
      const testUser = usersRes.rows[0];
      console.log(`Using test user: ID ${testUser.id} (${testUser.email})`);

      // Update storage settings to custom folder
      await updateUserStorageSettings(testUser.id, {
        incoming_storage_folder_id: 'test_folder_incoming_123',
        incoming_storage_folder_name: 'Archive Masuk 2026',
        incoming_monthly_organization: true,
        outgoing_storage_folder_id: 'test_folder_outgoing_456',
        outgoing_storage_folder_name: 'Surat Keluar Utama',
        outgoing_monthly_organization: false,
      });

      const updatedUser = await findUserById(testUser.id);
      if (
        updatedUser?.incoming_storage_folder_id !== 'test_folder_incoming_123' ||
        updatedUser?.incoming_storage_folder_name !== 'Archive Masuk 2026' ||
        !updatedUser?.incoming_monthly_organization ||
        updatedUser?.outgoing_storage_folder_id !== 'test_folder_outgoing_456' ||
        updatedUser?.outgoing_storage_folder_name !== 'Surat Keluar Utama' ||
        updatedUser?.outgoing_monthly_organization !== false
      ) {
        throw new Error(`User storage settings persistence mismatch: ${JSON.stringify(updatedUser)}`);
      }
      console.log('✅ Storage settings successfully persisted and verified from DB.');

      // Reset storage settings to default (null)
      await updateUserStorageSettings(testUser.id, {
        incoming_storage_folder_id: null,
        incoming_storage_folder_name: null,
        incoming_monthly_organization: false,
        outgoing_storage_folder_id: null,
        outgoing_storage_folder_name: null,
        outgoing_monthly_organization: false,
      });

      const resetUser = await findUserById(testUser.id);
      if (resetUser?.incoming_storage_folder_id !== null || resetUser?.outgoing_storage_folder_id !== null) {
        throw new Error(`Failed to reset storage settings: ${JSON.stringify(resetUser)}`);
      }
      console.log('✅ Storage settings successfully reset back to default.');
    }

    console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
