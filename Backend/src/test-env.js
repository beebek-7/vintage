import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Environment Variables:');
console.log('DB_USER:', typeof process.env.DB_USER, process.env.DB_USER);
console.log('DB_PASSWORD:', typeof process.env.DB_PASSWORD, '(hidden)');
console.log('DB_HOST:', typeof process.env.DB_HOST, process.env.DB_HOST);
console.log('DB_PORT:', typeof process.env.DB_PORT, process.env.DB_PORT);
console.log('DB_NAME:', typeof process.env.DB_NAME, process.env.DB_NAME);
