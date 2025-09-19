const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('Config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD ? '***' : 'NOT SET'
    });
    
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');
    
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].pg_version);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Failed to connect to database:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error detail:', error.detail);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Suggestion: PostgreSQL server might not be running');
    } else if (error.code === '3D000') {
      console.log('💡 Suggestion: Database "PolarNet" does not exist');
    } else if (error.code === '28P01') {
      console.log('💡 Suggestion: Authentication failed - check username/password');
    }
  }
}

testConnection();
