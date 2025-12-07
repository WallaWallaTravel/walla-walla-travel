# Booking Form → Itinerary Builder Fix

**Issue:** After filling in the new booking form, users were seeing "No itinerary found for this booking" instead of the itinerary builder.

**Date Fixed:** November 14, 2025

---

## Root Cause

The booking form was creating an itinerary but **not checking if the creation was successful** before redirecting to the itinerary builder. If the itinerary creation failed silently, users would be redirected to a page that couldn't load the non-existent itinerary.

---

## Changes Made

### 1. Enhanced Booking Form Error Handling

**File:** `/app/bookings/new/page.tsx`

**Changes:**
```typescript
// Before: No error checking
await fetch(`/api/itineraries/${bookingId}`, { method: 'POST', ... });
router.push(`/itinerary-builder/${bookingId}`);

// After: Proper error handling
const itineraryResponse = await fetch(`/api/itineraries/${bookingId}`, { 
  method: 'POST', 
  ... 
});

if (!itineraryResponse.ok) {
  const errorData = await itineraryResponse.json();
  console.error('Itinerary creation error:', errorData);
  throw new Error(errorData.error || 'Failed to create itinerary');
}

const itineraryData = await itineraryResponse.json();
console.log('Itinerary created:', itineraryData);

router.push(`/itinerary-builder/${bookingId}`);
```

**Benefits:**
- ✅ Catches itinerary creation failures
- ✅ Shows clear error message to user
- ✅ Logs error details to console for debugging
- ✅ Prevents redirect if creation fails

### 2. Improved Itinerary Builder Error Handling

**File:** `/app/itinerary-builder/[booking_id]/page.tsx`

**Changes:**

#### A) Enhanced Error Logging
```typescript
// Added detailed logging when itinerary fetch fails
if (itineraryRes.ok) {
  // ... load itinerary
} else {
  const errorData = await itineraryRes.json().catch(() => ({ error: 'Unknown error' }));
  console.error('Failed to load itinerary:', errorData);
  console.error('Booking ID:', bookingId);
  console.error('Response status:', itineraryRes.status);
}
```

#### B) Better "Not Found" UI
```typescript
// Before: Generic error message
<div>No itinerary found for this booking</div>

// After: Helpful UI with recovery options
<div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
  <div className="text-6xl mb-4">📋</div>
  <h2 className="text-2xl font-bold text-gray-900 mb-2">No Itinerary Found</h2>
  <p className="text-gray-700 mb-6">
    There is no itinerary associated with booking #{bookingId}. 
    This might be because the itinerary wasn't created yet or there was an error during creation.
  </p>
  <div className="flex gap-3 justify-center">
    <button onClick={() => router.push('/admin/bookings')}>
      ← Back to Bookings
    </button>
    <button onClick={createItinerary}>
      Create Itinerary Now
    </button>
  </div>
</div>
```

**Benefits:**
- ✅ Clear explanation of the problem
- ✅ Shows booking ID for reference
- ✅ "Back to Bookings" button for easy navigation
- ✅ "Create Itinerary Now" button to recover from failure
- ✅ Detailed console logs for debugging

---

## Debugging

If the issue persists, check the browser console for detailed error logs:

### Expected Console Output (Success)
```
Booking created successfully!
Itinerary created: { success: true, data: {...} }
Navigating to: /itinerary-builder/123
```

### Console Output (Failure)
```
Error creating booking: Error: Failed to create itinerary
Itinerary creation error: { error: "Itinerary already exists for this booking" }
```

### Common Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `Itinerary already exists for this booking` | Trying to create a duplicate itinerary | Click "Back to Bookings" and navigate to existing itinerary |
| `Failed to load itinerary` with 404 status | Itinerary was not created | Click "Create Itinerary Now" button |
| `null value in column "pickup_time"` | Missing required field | Ensure `pickup_time` defaults to '10:00' |
| `relation "itineraries" does not exist` | Database migration not run | Run migration `024-add-pickup-dropoff-drive-times.sql` |

---

## Testing the Fix

### Test Case 1: Normal Flow
1. Go to `/bookings/new`
2. Fill in all required fields
3. Submit form
4. Should see alert: "Booking created successfully!"
5. Should redirect to itinerary builder
6. Should see pickup/dropoff sections with tour stops

### Test Case 2: Duplicate Prevention
1. Create a booking successfully
2. Try to access `/bookings/new` again
3. Submit the same booking again (if you want to test)
4. Should see error: "Itinerary already exists for this booking"
5. Should stay on form page with error message

### Test Case 3: Recovery from Failure
1. If you somehow end up on the "No Itinerary Found" page
2. Click "Create Itinerary Now" button
3. Should see alert: "Itinerary created! Reloading..."
4. Page should reload and show itinerary builder

---

## Files Modified

1. `/app/bookings/new/page.tsx`
   - Added error handling for itinerary creation
   - Added console logging for debugging
   - Added default value for `pickup_time` ('10:00')

2. `/app/itinerary-builder/[booking_id]/page.tsx`
   - Enhanced error logging in `loadData()`
   - Improved "not found" UI with recovery options
   - Added "Create Itinerary Now" functionality

---

## Related Migrations

Ensure these migrations have been run:

1. `migrations/create-wineries-system.sql` - Creates `itineraries` table
2. `migrations/024-add-pickup-dropoff-drive-times.sql` - Adds pickup/dropoff drive time fields

---

## API Endpoints Involved

### POST `/api/bookings`
- Creates a new booking
- Returns: `{ success: true, booking: { id: number, ... } }`

### POST `/api/itineraries/[booking_id]`
- Creates a new itinerary for a booking
- Checks for duplicates (returns 400 if exists)
- Returns: `{ success: true, data: { id: number, ... } }`

### GET `/api/itineraries/[booking_id]`
- Fetches itinerary with stops
- Returns: `{ success: true, data: { ..., stops: [] } }`
- Returns 404 if not found

---

## Next Steps

If you continue to see "No itinerary found" errors:

1. **Check browser console** for detailed error logs
2. **Verify database** has `itineraries` table with correct schema
3. **Check migrations** - all 24 migrations should be run
4. **Test API directly** using curl or Postman:
   ```bash
   # Test booking creation
   curl -X POST http://localhost:3000/api/bookings \
     -H "Content-Type: application/json" \
     -d '{"customer_name":"Test User",...}'
   
   # Test itinerary creation
   curl -X POST http://localhost:3000/api/itineraries/123 \
     -H "Content-Type: application/json" \
     -d '{"pickup_location":"TBD",...}'
   ```

---

**Status:** ✅ Fixed and tested
**Severity:** High (blocking core workflow)
**Impact:** All new bookings





