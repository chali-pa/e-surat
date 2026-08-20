import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runFoldersMonthMigration() {
  try {
    console.log('Starting Folders Month format index migration...');
    const migrationPath = path.join(__dirname, '../../migrations/update_folders_month_format.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(sql);
    
    console.log('✅ Folders Month Index Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runFoldersMonthMigration();
