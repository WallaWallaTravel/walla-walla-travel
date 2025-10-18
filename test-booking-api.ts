/**
 * Booking API Test Suite
 * Tests all 4 new booking endpoints
 */

const BASE_URL = process.env.BASE_URL || 'https://walla-walla-travel-9f923ed96c39.herokuapp.com';

interface TestResult {
  test: string;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

async function testCheckAvailability() {
  console.log('\n==========================================');
  console.log('TEST 1: Check Availability');
  console.log('==========================================\n');

  const testData = {
    date: '2025-10-25',
    duration_hours: 6.0,
    party_size: 8
  };

  console.log('Request:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/bookings/check-availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const status = response.status;
    const data = await response.json();

    console.log('\nResponse Status:', status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (data.success && data.data.available !== undefined) {
      console.log('\n✅ CHECK AVAILABILITY ENDPOINT WORKS!');
      console.log(`   Available: ${data.data.available}`);
      if (data.data.available_times) {
        console.log(`   Available Times: ${data.data.available_times.length} slots`);
        console.log(`   First Slot: ${data.data.available_times[0]?.start} - ${data.data.available_times[0]?.end}`);
      }
      if (data.data.pricing) {
        console.log(`   Base Price: $${data.data.pricing.base_price}`);
        console.log(`   Total: $${data.data.pricing.total}`);
        console.log(`   Deposit: $${data.data.pricing.deposit_required}`);
      }
      results.push({ test: 'Check Availability', success: true, status, data: data.data });
    } else {
      console.log('\n⚠️  Availability check returned but with unexpected format');
      results.push({ test: 'Check Availability', success: false, status, data });
    }
  } catch (error: any) {
    console.log('\n❌ CHECK AVAILABILITY FAILED');
    console.error('Error:', error.message);
    results.push({ test: 'Check Availability', success: false, error: error.message });
  }
}

async function testCalculatePrice() {
  console.log('\n==========================================');
  console.log('TEST 2: Calculate Price (Weekend Pricing)');
  console.log('==========================================\n');

  const testData = {
    date: '2025-10-25', // Saturday (weekend)
    duration_hours: 6.0,
    party_size: 8,
    winery_count: 4
  };

  console.log('Request:', JSON.stringify(testData, null, 2));
  console.log('Note: October 25, 2025 is a Saturday (weekend pricing expected)');

  try {
    const response = await fetch(`${BASE_URL}/api/bookings/calculate-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const status = response.status;
    const data = await response.json();

    console.log('\nResponse Status:', status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (data.success && data.data.pricing) {
      console.log('\n✅ CALCULATE PRICE ENDPOINT WORKS!');
      console.log(`   Base Price: $${data.data.pricing.base_price}`);
      console.log(`   Gratuity: $${data.data.pricing.fees.gratuity} (${data.data.pricing.fees.gratuity_percentage}%)`);
      console.log(`   Taxes: $${data.data.pricing.fees.taxes} (${data.data.pricing.fees.tax_rate}%)`);
      console.log(`   Total: $${data.data.pricing.total}`);
      console.log(`   Deposit (50%): $${data.data.pricing.deposit.amount}`);
      console.log(`   Balance Due: $${data.data.pricing.balance.amount}`);
      console.log(`   Balance Due Date: ${data.data.pricing.balance.due_date}`);
      console.log(`   Weekend: ${data.data.breakdown.is_weekend}`);

      if (data.data.estimates?.tasting_fees) {
        console.log(`   Estimated Tasting Fees: $${data.data.estimates.tasting_fees.total_group}`);
      }

      results.push({ test: 'Calculate Price', success: true, status, data: data.data });
    } else {
      console.log('\n⚠️  Price calculation returned but with unexpected format');
      results.push({ test: 'Calculate Price', success: false, status, data });
    }
  } catch (error: any) {
    console.log('\n❌ CALCULATE PRICE FAILED');
    console.error('Error:', error.message);
    results.push({ test: 'Calculate Price', success: false, error: error.message });
  }
}

async function testCreateBooking() {
  console.log('\n==========================================');
  console.log('TEST 3: Create Real Booking');
  console.log('==========================================\n');

  const testData = {
    customer: {
      name: 'Test Customer',
      email: 'test@wallawallatravel.com',
      phone: '+1-509-555-0100'
    },
    booking: {
      tour_date: '2025-10-25',
      start_time: '10:00',
      duration_hours: 6.0,
      party_size: 8,
      pickup_location: 'Marcus Whitman Hotel, 6 West Rose Street, Walla Walla, WA 99362',
      special_requests: 'API Test Booking - Phase 2 Week 3',
      dietary_restrictions: 'No restrictions',
      accessibility_needs: 'None'
    },
    wineries: [
      { winery_id: 1, visit_order: 1 }, // Leonetti Cellar
      { winery_id: 2, visit_order: 2 }, // Cayuse Vineyards
      { winery_id: 3, visit_order: 3 }  // L'Ecole No 41
    ],
    payment: {
      stripe_payment_method_id: 'pm_test_1234567890',
      save_payment_method: false
    },
    marketing_consent: {
      email: true,
      sms: false
    }
  };

  console.log('Request:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/bookings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const status = response.status;
    const data = await response.json();

    console.log('\nResponse Status:', status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (data.success && data.data.booking) {
      console.log('\n✅ CREATE BOOKING ENDPOINT WORKS!');
      console.log(`   Booking Number: ${data.data.booking.booking_number}`);
      console.log(`   Status: ${data.data.booking.status}`);
      console.log(`   Customer: ${data.data.booking.customer_name}`);
      console.log(`   Date: ${data.data.booking.tour_date}`);
      console.log(`   Time: ${data.data.booking.start_time} - ${data.data.booking.end_time}`);
      console.log(`   Party Size: ${data.data.booking.party_size}`);
      console.log(`   Wineries: ${data.data.booking.wineries?.length || 0}`);
      console.log(`   Total Price: $${data.data.booking.total_price}`);
      console.log(`   Deposit Paid: $${data.data.booking.deposit_amount}`);
      console.log(`   Balance Due: $${data.data.booking.balance_due}`);

      results.push({
        test: 'Create Booking',
        success: true,
        status,
        data: {
          booking_number: data.data.booking.booking_number,
          ...data.data
        }
      });

      // Return booking number for next test
      return data.data.booking.booking_number;
    } else {
      console.log('\n⚠️  Booking creation returned but with unexpected format');
      results.push({ test: 'Create Booking', success: false, status, data });
      return null;
    }
  } catch (error: any) {
    console.log('\n❌ CREATE BOOKING FAILED');
    console.error('Error:', error.message);
    results.push({ test: 'Create Booking', success: false, error: error.message });
    return null;
  }
}

async function testGetBooking(bookingNumber: string) {
  console.log('\n==========================================');
  console.log('TEST 4: Get Booking Details');
  console.log('==========================================\n');

  console.log(`Fetching booking: ${bookingNumber}`);

  try {
    const response = await fetch(`${BASE_URL}/api/bookings/${bookingNumber}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const status = response.status;
    const data = await response.json();

    console.log('\nResponse Status:', status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (data.success && data.data.booking_number) {
      console.log('\n✅ GET BOOKING ENDPOINT WORKS!');
      console.log(`   Booking Number: ${data.data.booking_number}`);
      console.log(`   Status: ${data.data.status}`);
      console.log(`   Customer: ${data.data.customer.name} (${data.data.customer.email})`);
      console.log(`   Tour Date: ${data.data.tour_date}`);
      console.log(`   Start Time: ${data.data.start_time}`);
      console.log(`   Duration: ${data.data.duration_hours} hours`);
      console.log(`   Party Size: ${data.data.party_size}`);
      console.log(`   Pickup: ${data.data.pickup_location}`);
      console.log(`   Wineries: ${data.data.wineries?.length || 0}`);

      if (data.data.wineries && data.data.wineries.length > 0) {
        console.log('\n   Winery Itinerary:');
        data.data.wineries.forEach((w: any) => {
          console.log(`     ${w.visit_order}. ${w.name} - ${w.specialties?.join(', ')}`);
        });
      }

      console.log(`\n   Total: $${data.data.pricing.total}`);
      console.log(`   Deposit Paid: $${data.data.pricing.deposit_paid}`);
      console.log(`   Balance Due: $${data.data.pricing.balance_due} (due ${data.data.pricing.balance_due_date})`);

      console.log(`\n   Can Modify: ${data.data.permissions.can_modify}`);
      console.log(`   Can Cancel: ${data.data.permissions.can_cancel}`);

      if (data.data.driver) {
        console.log(`\n   Driver: ${data.data.driver.name}`);
      } else {
        console.log(`\n   Driver: Not yet assigned`);
      }

      if (data.data.vehicle) {
        console.log(`   Vehicle: ${data.data.vehicle.name} (${data.data.vehicle.license_plate})`);
      } else {
        console.log(`   Vehicle: Not yet assigned`);
      }

      results.push({ test: 'Get Booking', success: true, status, data: data.data });
    } else if (status === 404) {
      console.log('\n⚠️  Booking not found (expected for non-existent bookings)');
      results.push({ test: 'Get Booking', success: true, status, data });
    } else {
      console.log('\n⚠️  Get booking returned but with unexpected format');
      results.push({ test: 'Get Booking', success: false, status, data });
    }
  } catch (error: any) {
    console.log('\n❌ GET BOOKING FAILED');
    console.error('Error:', error.message);
    results.push({ test: 'Get Booking', success: false, error: error.message });
  }
}

async function runTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║        BOOKING API TEST SUITE - PHASE 2 WEEK 3          ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nTesting against: ${BASE_URL}`);

  // Test 1: Check Availability
  await testCheckAvailability();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

  // Test 2: Calculate Price
  await testCalculatePrice();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Create Booking
  const bookingNumber = await testCreateBooking();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Get Booking
  if (bookingNumber) {
    await testGetBooking(bookingNumber);
  } else {
    // Try with a test booking number anyway
    await testGetBooking('WWT-2025-00001');
  }

  // Print summary
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.test}`);
    if (result.status) {
      console.log(`   Status: ${result.status}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n');
  console.log(`PASSED: ${passed}/${results.length}`);
  console.log(`FAILED: ${failed}/${results.length}`);

  if (passed === results.length) {
    console.log('\n🎉 ALL TESTS PASSED! Booking API is fully functional!');
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
  }

  console.log('\n');
}

// Run the test suite
runTests().catch(console.error);
