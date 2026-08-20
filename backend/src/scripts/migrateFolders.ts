import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runFolderMigration() {
  try {
    console.log('Starting folder management migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../../migrations/add_folder_management.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing folder management SQL...');
    await pool.query(sql);
    
    console.log('✅ Folder management migration completed successfully!');
    console.log('Added: folders table, folder_id columns, documentation_folder_id column');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Folder management migration failed:', error);
    process.exit(1);
  }
}

runFolderMigration();
