import pool from '../config/database';

async function runMigration() {
  try {
    console.log('Starting migration...');

    // Update surats table
    console.log('Updating surats table...');
    await pool.query(`
      ALTER TABLE surats RENAME COLUMN pengirim TO nama_pengirim
    `);
    console.log('✓ Renamed pengirim to nama_pengirim');

    await pool.query(`
      ALTER TABLE surats RENAME COLUMN perihal TO nama_surat
    `);
    console.log('✓ Renamed perihal to nama_surat');

    await pool.query(`
      ALTER TABLE surats RENAME COLUMN tanggal_terima TO tanggal_masuk
    `);
    console.log('✓ Renamed tanggal_terima to tanggal_masuk');

    await pool.query(`
      ALTER TABLE surats ADD COLUMN IF NOT EXISTS tanggal_buat DATE
    `);
    console.log('✓ Added tanggal_buat column');

    // Update users table
    console.log('Updating users table...');
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS drive_folder_id TEXT
    `);
    console.log('✓ Added drive_folder_id column');

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_masuk_id TEXT
    `);
    console.log('✓ Added sheet_masuk_id column');

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sheet_keluar_id TEXT
    `);
    console.log('✓ Added sheet_keluar_id column');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
