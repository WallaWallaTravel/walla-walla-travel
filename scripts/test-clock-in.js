import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Test the /api/workflow/clock endpoint
async function testClockIn() {
  try {
    console.log('🔍 Testing /api/workflow/clock endpoint...\n');
    
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
    console.log('Login response:', loginData.success ? 'Success' : 'Failed');
    
    // Extract the session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.log('❌ No session cookie received');
      return;
    }
    
    // First try to clock out in case already clocked in
    console.log('\n2. Attempting to clock out first (in case already clocked in)...');
    await fetch('http://localhost:3000/api/workflow/clock', {
      method: 'POST',
      headers: {
        'Cookie': setCookieHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'clock_out',
        signature: 'Eric Critchlow (cleanup)'
      })
    });
    
    // Now test clock in
    console.log('\n3. Testing Clock In...');
    const clockInResponse = await fetch('http://localhost:3000/api/workflow/clock', {
      method: 'POST',
      headers: {
        'Cookie': setCookieHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'clock_in',
        vehicleId: 1, // Sprinter 1
        startMileage: 50000,
        location: {
          latitude: 46.0654,
          longitude: -118.3430
        }
      })
    });
    
    const clockInData = await clockInResponse.json();
    
    console.log('Clock In Response status:', clockInResponse.status);
    console.log('Response:', JSON.stringify(clockInData, null, 2));
    
    if (clockInData.success) {
      console.log('\n✅ Successfully clocked in!');
      console.log('  Time card ID:', clockInData.data.id);
      console.log('  Clock in time:', clockInData.data.clock_in_time);
      
      // Now test clock out
      console.log('\n4. Testing Clock Out...');
      const clockOutResponse = await fetch('http://localhost:3000/api/workflow/clock', {
        method: 'POST',
        headers: {
          'Cookie': setCookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clock_out',
          endMileage: 50050,
          signature: 'Eric Critchlow',
          location: {
            latitude: 46.0654,
            longitude: -118.3430
          }
        })
      });
      
      const clockOutData = await clockOutResponse.json();
      
      console.log('Clock Out Response status:', clockOutResponse.status);
      console.log('Response:', JSON.stringify(clockOutData, null, 2));
      
      if (clockOutData.success) {
        console.log('\n✅ Successfully clocked out!');
        console.log('  Total hours:', clockOutData.data.on_duty_hours);
      } else {
        console.log('\n❌ Clock out failed:', clockOutData.error);
      }
    } else {
      console.log('\n❌ Clock in failed:', clockInData.error);
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error);
  }
}

testClockIn();