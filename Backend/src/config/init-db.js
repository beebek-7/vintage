import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Connect to the database
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Drop all tables in correct order
      await client.query(`
        DROP TABLE IF EXISTS email_notifications CASCADE;
        DROP TABLE IF EXISTS user_preferences CASCADE;
        DROP TABLE IF EXISTS user_event_subscriptions CASCADE;
        DROP TABLE IF EXISTS event_tags CASCADE;
        DROP TABLE IF EXISTS task_tags CASCADE;
        DROP TABLE IF EXISTS tasks CASCADE;
        DROP TABLE IF EXISTS unt_events CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
      `);
      console.log('Existing tables dropped successfully');

      // Execute the entire schema as one statement
      await client.query(schema);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('Database tables created successfully');
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase(); 