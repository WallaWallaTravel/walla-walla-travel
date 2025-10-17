import dotenv from 'dotenv';
import { query } from '../lib/db.ts';

dotenv.config({ path: '.env.local' });

async function checkEricVehicle() {
  try {
    console.log('🔍 Checking Eric\'s vehicle assignment...\n');
    
    // Check Eric's user info
    const userResult = await query(
      'SELECT * FROM users WHERE id = 2'
    );
    console.log('👤 Eric\'s user info:');
    console.log('  ID:', userResult.rows[0].id);
    console.log('  Name:', userResult.rows[0].name);
    console.log('  Email:', userResult.rows[0].email);
    console.log('');
    
    // Check if Eric has any time cards with vehicle assignments
    const timeCardResult = await query(
      `SELECT tc.*, v.vehicle_number, v.make, v.model 
       FROM time_cards tc 
       LEFT JOIN vehicles v ON tc.vehicle_id = v.id 
       WHERE tc.driver_id = 2 
       ORDER BY tc.clock_in_time DESC 
       LIMIT 5`
    );
    console.log('📅 Eric\'s recent time cards:');
    if (timeCardResult.rowCount > 0) {
      timeCardResult.rows.forEach(row => {
        const date = row.clock_in_time ? new Date(row.clock_in_time).toLocaleDateString() : 'N/A';
        console.log(`  - ${date}: Vehicle ${row.vehicle_id || 'None'} (${row.vehicle_number || 'Not assigned'})`);
      });
    } else {
      console.log('  No time cards found');
    }
    console.log('');
    
    // Check vehicles table structure
    const vehicleSchema = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicles' ORDER BY ordinal_position"
    );
    console.log('📋 Vehicles table columns:');
    const columns = vehicleSchema.rows.map(r => r.column_name);
    console.log('  ' + columns.join(', '));
    console.log('');
    
    // Check if there's an assigned_driver_id column
    const hasAssignedDriver = columns.includes('assigned_driver_id');
    
    // Check all vehicles
    const vehiclesResult = await query(
      'SELECT * FROM vehicles ORDER BY id'
    );
    console.log('🚐 All vehicles in database:');
    vehiclesResult.rows.forEach(v => {
      let assignedInfo = '';
      if (hasAssignedDriver && v.assigned_driver_id) {
        assignedInfo = `, Assigned to driver: ${v.assigned_driver_id}`;
      }
      console.log(`  - ID: ${v.id}, Number: ${v.vehicle_number}, Status: ${v.status}${assignedInfo}`);
    });
    console.log('');
    
    // Check if we need to assign a vehicle to Eric
    if (hasAssignedDriver) {
      const ericVehicle = await query(
        'SELECT * FROM vehicles WHERE assigned_driver_id = 2'
      );
      if (ericVehicle.rowCount > 0) {
        console.log('✅ Eric has vehicle assigned:', ericVehicle.rows[0].vehicle_number);
      } else {
        console.log('❌ Eric has NO vehicle assigned');
        console.log('\n📝 To assign Sprinter 1 to Eric, run:');
        console.log('   UPDATE vehicles SET assigned_driver_id = 2 WHERE vehicle_number = \'Sprinter 1\';');
      }
    } else {
      console.log('⚠️  No assigned_driver_id column in vehicles table');
      console.log('   Vehicle assignments may be handled differently in this system');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkEricVehicle();