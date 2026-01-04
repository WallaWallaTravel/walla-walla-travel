import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Test the /api/vehicles/assigned endpoint
async function testAssignedVehicle() {
  try {
    console.log('🔍 Testing /api/vehicles/assigned endpoint...\n');
    
    // First, login as Eric
    console.log('1. Logging in as Eric...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'eric@wallawallatravel.com',
        password: 'travel2024'
      }),
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    // Extract the session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('\n2. Session cookie:', setCookieHeader ? 'Present' : 'Missing');
    
    if (!setCookieHeader) {
      console.log('❌ No session cookie received');
      return;
    }
    
    // Now test the assigned vehicle endpoint
    console.log('\n3. Testing /api/vehicles/assigned...');
    const vehicleResponse = await fetch('http://localhost:3000/api/vehicles/assigned', {
      method: 'GET',
      headers: {
        'Cookie': setCookieHeader,
      },
    });
    
    const vehicleData = await vehicleResponse.json();
    
    console.log('\n📊 Response status:', vehicleResponse.status);
    console.log('Response data:', JSON.stringify(vehicleData, null, 2));
    
    if (vehicleData.success && vehicleData.data) {
      console.log('\n✅ Successfully retrieved assigned vehicle:');
      console.log('  Vehicle:', vehicleData.data.vehicle_number);
      console.log('  Make/Model:', vehicleData.data.make, vehicleData.data.model);
      console.log('  Assignment Type:', vehicleData.data.assignment_type);
    } else {
      console.log('\n❌ Failed to retrieve vehicle:', vehicleData.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error);
  }
}

testAssignedVehicle();