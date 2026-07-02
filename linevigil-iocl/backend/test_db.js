const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  console.log('Testing connection to:', process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));
  try {
    const client = await pool.connect();
    console.log('✅ SUCCESS: Connected to the database.');
    
    const res = await client.query('SELECT version()');
    console.log('Database version:', res.rows[0].version);
    
    const postgisRes = await client.query("SELECT PostGIS_full_version()");
    console.log('✅ SUCCESS: PostGIS is enabled:', postgisRes.rows[0].postgis_full_version);
    
    client.release();
  } catch (err) {
    console.error('❌ ERROR: Could not connect to the database.');
    console.error('Error Object:', JSON.stringify(err, null, 2));
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    
    if (err.message.includes('does not exist')) {
      console.log('\n💡 TIP: You need to create the database first. Run: CREATE DATABASE linevigil;');
    } else if (err.message.includes('password authentication failed')) {
      console.log('\n💡 TIP: Check your username and password in backend/.env');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.log('\n💡 TIP: Ensure PostgreSQL is running on port 5432.');
    }
  } finally {
    await pool.end();
  }
}

testConnection();
