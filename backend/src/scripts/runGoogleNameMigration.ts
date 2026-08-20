import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runGoogleNameMigration() {
  try {
    console.log('Starting Google Name/Email migration...');
    const migrationPath = path.join(__dirname, '../../migrations/add_google_name.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(sql);
    
    console.log('✅ Google Name/Email Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runGoogleNameMigration();
