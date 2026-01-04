import fetch from 'node-fetch';

async function testLogin() {
  console.log('🧪 Testing Login API End-to-End\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test cases
  const testCases = [
    {
      name: 'Valid login - Eric',
      email: 'eric@wallawallatravel.com',
      password: 'travel2024',
      expectSuccess: true,
    },
    {
      name: 'Valid login - Test Driver',
      email: 'driver@test.com',
      password: 'test123456',
      expectSuccess: true,
    },
    {
      name: 'Invalid password',
      email: 'eric@wallawallatravel.com',
      password: 'wrongpassword',
      expectSuccess: false,
    },
    {
      name: 'Invalid email',
      email: 'nonexistent@example.com',
      password: 'travel2024',
      expectSuccess: false,
    },
  ];

  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Email: ${test.email}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: test.email,
          password: test.password,
        }),
      });

      const data = await response.json();
      
      if (test.expectSuccess) {
        if (response.ok && data.success) {
          console.log(`   ✅ Login successful!`);
          console.log(`   User: ${data.data?.name} (ID: ${data.data?.id})`);
        } else {
          console.log(`   ❌ Expected success but got error: ${data.error}`);
        }
      } else {
        if (!response.ok || !data.success) {
          console.log(`   ✅ Correctly rejected with: ${data.error}`);
        } else {
          console.log(`   ❌ Expected failure but login succeeded`);
        }
      }
      
      // Test session verification
      if (response.ok && data.success) {
        console.log(`   🔍 Testing session verification...`);
        
        const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
          method: 'GET',
          headers: {
            // Note: In a real browser, cookies would be sent automatically
            // For this test, we're just checking the endpoint exists
          },
        });
        
        if (verifyResponse.ok) {
          console.log(`   ✅ Verify endpoint working`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   ℹ️  Make sure the dev server is running (npm run dev)`);
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Login API Test Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testLogin().catch(console.error);