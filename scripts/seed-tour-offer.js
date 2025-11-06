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

async function seedTourOffer() {
  try {
    console.log('🌱 Seeding test tour offer...\n');
    
    // Get the test booking
    const booking = await pool.query(`
      SELECT id, booking_number, customer_name, tour_date, start_time, estimated_hours, hourly_rate
      FROM bookings
      WHERE id = 37
      LIMIT 1
    `);
    
    if (booking.rows.length === 0) {
      console.log('❌ Test booking #37 not found. Run seed-test-invoice.js first.');
      return;
    }
    
    const bookingData = booking.rows[0];
    console.log('✅ Found booking:', bookingData.booking_number);
    
    // Get a driver (or create one if needed)
    let driver = await pool.query(`
      SELECT id, name, email FROM users WHERE role = 'driver' LIMIT 1
    `);
    
    if (driver.rows.length === 0) {
      // Create a test driver
      driver = await pool.query(`
        INSERT INTO users (name, email, phone, role, is_active, created_at)
        VALUES ('Mike Johnson', 'mike.driver@wallawallatravel.com', '(509) 555-7890', 'driver', true, NOW())
        RETURNING id, name, email
      `);
      console.log('✅ Created test driver:', driver.rows[0].name);
    } else {
      console.log('✅ Found driver:', driver.rows[0].name);
    }
    
    const driverData = driver.rows[0];
    
    // Get a vehicle
    const vehicle = await pool.query(`
      SELECT id, make, model FROM vehicles LIMIT 1
    `);
    
    const vehicleId = vehicle.rows.length > 0 ? vehicle.rows[0].id : null;
    if (vehicleId) {
      console.log('✅ Found vehicle:', vehicle.rows[0].make, vehicle.rows[0].model);
    }
    
    // Create tour offer
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    
    const offer = await pool.query(`
      INSERT INTO tour_offers (
        booking_id,
        driver_id,
        vehicle_id,
        offered_by,
        offered_at,
        expires_at,
        status,
        notes,
        created_at
      ) VALUES ($1, $2, $3, 1, NOW(), $4, 'pending', $5, NOW())
      RETURNING id
    `, [
      bookingData.id,
      driverData.id,
      vehicleId,
      expiresAt,
      'VIP client - please arrive 15 minutes early. Customer prefers classical music.'
    ]);
    
    console.log('\n✅ Created tour offer #', offer.rows[0].id);
    console.log('   Booking:', bookingData.booking_number);
    console.log('   Driver:', driverData.name);
    console.log('   Pay:', `$${(bookingData.estimated_hours * bookingData.hourly_rate).toFixed(2)}`);
    console.log('   Expires:', expiresAt.toLocaleString());
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TOUR OFFER CREATED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📍 Test URLs:');
    console.log('   Driver Portal: http://localhost:3000/driver-portal/offers');
    console.log('   Admin Create:  http://localhost:3000/admin/tour-offers');
    console.log('\n💡 Driver can now accept or decline this tour!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

seedTourOffer();

