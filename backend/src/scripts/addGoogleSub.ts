import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Adding google_sub column to users table...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../../migrations/add_google_sub.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(sql);
    
    console.log('✅ Google sub migration completed successfully!');
    console.log('Added: google_sub column, index, and unique constraint');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();