require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateRestaurants() {
  const client = await pool.connect();
  
  try {
    console.log('🍽️  Updating restaurants...\n');

    // Delete old restaurants
    await client.query('DELETE FROM restaurants');
    console.log('✅ Cleared old restaurants');

    // Insert Wine Country Store and Memo's Tacos
    const result = await client.query(`
      INSERT INTO restaurants (
        name, 
        cuisine_type, 
        address, 
        phone, 
        email, 
        website, 
        accepts_pre_orders, 
        commission_rate, 
        is_partner, 
        is_active, 
        order_notification_method
      ) VALUES
      (
        'Wine Country Store',
        'Focaccia Sandwiches',
        '7 E Rose St, Walla Walla, WA 99362',
        '509-956-4010',
        'info@winecountrystore.com',
        'https://www.winecountrystore.com',
        TRUE,
        10.00,
        TRUE,
        TRUE,
        'email'
      ),
      (
        'Memo''s Tacos',
        'Mexican',
        'Walla Walla, WA',
        '509-XXX-XXXX',
        'info@memostacos.com',
        NULL,
        TRUE,
        10.00,
        TRUE,
        TRUE,
        'email'
      )
      RETURNING id, name;
    `);

    console.log('✅ Added new restaurants:');
    result.rows.forEach(row => {
      console.log(`   ${row.id}. ${row.name}`);
    });

    console.log('\n🎉 Restaurant update complete!');
    console.log('\nYou can now select:');
    console.log('  1. Wine Country Store (Focaccia Sandwiches)');
    console.log('  2. Memo\'s Tacos (Mexican)');

  } catch (error) {
    console.error('❌ Error updating restaurants:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateRestaurants();

