require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updatePhone() {
  const client = await pool.connect();
  
  try {
    await client.query(
      "UPDATE restaurants SET phone = $1 WHERE name = $2",
      ['(509) 386-0473', "Memo's Tacos"]
    );
    
    console.log("✅ Updated Memo's Tacos phone number to: (509) 386-0473");
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

updatePhone();

