import pkg from 'pg';
const { Pool } = pkg;

const testConnection = async () => {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'syncd_db',
    password: 'Blu3Ski3s',
    port: 5432,
    ssl: false
  });

  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Connection successful:', result.rows[0]);
    await pool.end();
  } catch (err) {
    console.error('Connection error:', err);
  }
};

testConnection();
