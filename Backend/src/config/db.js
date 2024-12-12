import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pkg;

// Create the configuration object
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'syncd_db',
  password: String(process.env.DB_PASSWORD), // Ensure it's a string
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: false
};

console.log('Database Config:', {
  ...dbConfig,
  password: '(hidden)'
});

const pool = new Pool(dbConfig);

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

export default pool;
