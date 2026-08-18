import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runGoogleOAuthMigration() {
  try {
    console.log('Starting Google OAuth database migration...');
    const migrationPath = path.join(__dirname, '../../migrations/add_user_google_oauth_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(sql);
    
    console.log('✅ Google OAuth Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runGoogleOAuthMigration();
