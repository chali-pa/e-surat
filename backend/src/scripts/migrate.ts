import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read and execute init.sql
    const initPath = path.join(__dirname, '../../migrations/init.sql');
    const initSql = fs.readFileSync(initPath, 'utf8');
    await pool.query(initSql);
    
    // Read and execute add_email_logs.sql
    const emailLogsPath = path.join(__dirname, '../../migrations/add_email_logs.sql');
    if (fs.existsSync(emailLogsPath)) {
      const emailLogsSql = fs.readFileSync(emailLogsPath, 'utf8');
      await pool.query(emailLogsSql);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('Tables created/updated: users, surats, surat_keluars, email_logs');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
