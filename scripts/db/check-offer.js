import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkOffer() {
  try {
    const result = await pool.query(`
      SELECT 
        tour_offers.id,
        tour_offers.driver_id,
        users.name as driver_name,
        tour_offers.status,
        bookings.booking_number
      FROM tour_offers
      JOIN users ON tour_offers.driver_id = users.id
      JOIN bookings ON tour_offers.booking_id = bookings.id
      ORDER BY tour_offers.id DESC
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Tour Offer Found:');
      console.log('   ID:', result.rows[0].id);
      console.log('   Driver ID:', result.rows[0].driver_id);
      console.log('   Driver Name:', result.rows[0].driver_name);
      console.log('   Status:', result.rows[0].status);
      console.log('   Booking:', result.rows[0].booking_number);
      console.log('\n📍 Test URL:');
      console.log(`   http://localhost:3000/api/driver/offers?driver_id=${result.rows[0].driver_id}`);
    } else {
      console.log('❌ No tour offers found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkOffer();
