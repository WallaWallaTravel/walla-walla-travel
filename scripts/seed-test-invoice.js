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

async function seedTestData() {
  try {
    console.log('🌱 Seeding test invoice data...\n');
    
    // 1. Create a completed booking that's ready for final invoice
    const booking = await pool.query(`
      INSERT INTO bookings (
        booking_number,
        customer_name,
        customer_email,
        customer_phone,
        tour_date,
        start_time,
        end_time,
        duration_hours,
        party_size,
        pickup_location,
        status,
        base_price,
        deposit_amount,
        final_payment_amount,
        total_price,
        estimated_hours,
        actual_hours,
        hourly_rate,
        ready_for_final_invoice,
        created_at
      ) VALUES (
        'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-TEST',
        'John & Sarah Smith',
        'john.smith@example.com',
        '(509) 555-1234',
        CURRENT_DATE - INTERVAL '3 days',
        '10:00:00',
        '18:00:00',
        8.0,
        8,
        '123 Wine Country Ln, Walla Walla, WA',
        'completed',
        1125.00,
        450.00,
        675.00,
        1125.00,
        6.0,
        7.5,
        150.00,
        true,
        NOW() - INTERVAL '3 days'
      )
      RETURNING id, booking_number, customer_name, tour_date, actual_hours, hourly_rate;
    `);
    
    console.log('✅ Created test booking:');
    console.log('   ID:', booking.rows[0].id);
    console.log('   Number:', booking.rows[0].booking_number);
    console.log('   Customer:', booking.rows[0].customer_name);
    console.log('   Tour Date:', booking.rows[0].tour_date);
    console.log('   Actual Hours:', booking.rows[0].actual_hours);
    console.log('   Hourly Rate: $', booking.rows[0].hourly_rate);
    console.log('   Final Amount: $', booking.rows[0].actual_hours * booking.rows[0].hourly_rate);
    
    // 2. Check pending invoices
    const pending = await pool.query(`
      SELECT * FROM pending_final_invoices LIMIT 1;
    `);
    
    if (pending.rows.length > 0) {
      console.log('\n✅ Booking appears in pending_final_invoices view!');
      console.log('   Ready for admin approval');
    } else {
      console.log('\n⚠️  Booking not in pending view (might need 48 hours to pass)');
    }
    
    // 3. Create a deposit invoice for this booking
    const invoice = await pool.query(`
      INSERT INTO invoices (
        booking_id,
        invoice_type,
        subtotal,
        total_amount,
        status,
        sent_at
      ) VALUES (
        $1,
        'deposit',
        450.00,
        450.00,
        'paid',
        NOW() - INTERVAL '5 days'
      )
      RETURNING id, invoice_number, invoice_type, total_amount, status;
    `, [booking.rows[0].id]);
    
    console.log('\n✅ Created deposit invoice:');
    console.log('   Number:', invoice.rows[0].invoice_number);
    console.log('   Type:', invoice.rows[0].invoice_type);
    console.log('   Amount: $', invoice.rows[0].total_amount);
    console.log('   Status:', invoice.rows[0].status);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TEST DATA CREATED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📍 Test URLs:');
    console.log('   Admin Dashboard: http://localhost:3000/admin/invoices');
    console.log('   Payment Page: http://localhost:3000/payment/final/' + booking.rows[0].id);
    console.log('\n💡 The booking is ready for final invoice approval!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

seedTestData();

