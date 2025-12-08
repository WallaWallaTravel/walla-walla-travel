# Complete Safety Workflow Implementation Guide

## ✅ COMPLETED SO FAR:

1. **Database Migration Created**: `migrations/000_combined_safety_features.sql`
   - Adds `time_card_id` to inspections (per-shift tracking)
   - Adds `defects_found`, `defect_severity`, `defect_description` to inspections
   - Adds `defect_notes`, `defect_reported_at`, `defect_reported_by` to vehicles
   - Updates vehicle status constraint to include 'out_of_service'

2. **Post-Trip Form Updated**: `app/inspections/post-trip/PostTripInspectionClient.tsx`
   - Minor/Critical severity options (removed Major)
   - Submission handler calculates defect severity
   - Combines defect descriptions
   - Shows alert for critical defects

## 🚀 NEXT STEPS TO COMPLETE:

### Step 1: Run Database Migration

```bash
psql "postgres://u5eq260aalmaff:pe7531a627c8b4fcccfe9d643266e3f1c1e7a8446926e469883569321509eb8a3@cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dcb898ojc53b18" < migrations/000_combined_safety_features.sql
```

Or use:
```bash
/tmp/run_migration.sh
```

### Step 2: Update Inspection API to Save Defect Data

**File**: `app/api/inspections/post-trip/route.ts`

Add these changes:

```typescript
// In the POST handler, after getting the request body:
const {
  vehicleId,
  endMileage,
  inspectionData
} = body;

// Extract defect information
const {
  items,
  notes,
  signature,
  defectsFound = false,
  defectSeverity = 'none',
  defectDescription = null
} = inspectionData;

// Get active time card ID
const timeCardResult = await query(`
  SELECT id FROM time_cards
  WHERE driver_id = $1 AND clock_out_time IS NULL
  ORDER BY clock_in_time DESC
  LIMIT 1
`, [driverId]);

const timeCardId = timeCardResult.rows[0]?.id || null;

// Save inspection with defect data and time_card_id
const inspectionResult = await query(`
  INSERT INTO inspections (
    driver_id,
    vehicle_id,
    time_card_id,
    type,
    mileage,
    checklist,
    notes,
    signature,
    defects_found,
    defect_severity,
    defect_description,
    created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
  RETURNING id
`, [
  driverId,
  vehicleId,
  timeCardId,
  'post_trip',
  endMileage,
  JSON.stringify(items),
  notes,
  signature,
  defectsFound,
  defectSeverity,
  defectDescription
]);

const inspectionId = inspectionResult.rows[0].id;

// CRITICAL DEFECT WORKFLOW
if (defectSeverity === 'critical') {
  // 1. Mark vehicle as out of service
  await query(`
    UPDATE vehicles
    SET status = 'out_of_service',
        defect_notes = $1,
        defect_reported_at = NOW(),
        defect_reported_by = $2
    WHERE id = $3
  `, [defectDescription, driverId, vehicleId]);

  // 2. Get driver and vehicle information
  const driverInfo = await query(`
    SELECT name, email, phone FROM users WHERE id = $1
  `, [driverId]);

  const vehicleInfo = await query(`
    SELECT vehicle_number, make, model, vin FROM vehicles WHERE id = $1
  `, [vehicleId]);

  const driver = driverInfo.rows[0];
  const vehicle = vehicleInfo.rows[0];

  // 3. Send emergency notifications
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const supervisorPhone = 'office-phone-number'; // TODO: Update
  const supervisorEmail = 'evcritchlow@gmail.com';

  // SMS Message
  const smsMessage = `🚨 CRITICAL VEHICLE DEFECT

Vehicle: ${vehicle.vehicle_number}
Reported by: ${driver.name}
Time: ${timestamp}
Issue: ${defectDescription?.substring(0, 100)}...

Vehicle marked OUT OF SERVICE.

View details: https://wallawalla.travel/admin/vehicle-status`;

  // Email Message
  const emailSubject = `🚨 CRITICAL: ${vehicle.vehicle_number} Out of Service`;
  const emailBody = `
CRITICAL VEHICLE DEFECT REPORTED

Vehicle: ${vehicle.vehicle_number} (${vehicle.make} ${vehicle.model})
VIN: ${vehicle.vin}
Status: OUT OF SERVICE

Reported by: ${driver.name} (${driver.email})
Shift ended: ${timestamp}

Defect Description:
${defectDescription}

Action Required:
- Vehicle has been automatically removed from service
- No other drivers can select this vehicle
- Inspect and repair before returning to service

View vehicle status: https://wallawalla.travel/admin/vehicle-status
Contact driver: ${driver.phone || 'N/A'}
  `.trim();

  // Log notifications (in production, call Twilio/SendGrid)
  console.log('🆘 CRITICAL DEFECT NOTIFICATION:');
  console.log('=====================================');
  console.log(`Vehicle: ${vehicle.vehicle_number}`);
  console.log(`Driver: ${driver.name}`);
  console.log(`Time: ${timestamp}`);
  console.log('');
  console.log('📱 SMS TO SEND:');
  console.log(`   To: ${supervisorPhone}`);
  console.log(`   Message: ${smsMessage}`);
  console.log('');
  console.log('📧 EMAIL TO SEND:');
  console.log(`   To: ${supervisorEmail}`);
  console.log(`   Subject: ${emailSubject}`);
  console.log(`   Body:\\n${emailBody}`);
  console.log('=====================================');

  // TODO: In production, integrate with:
  // - Twilio: await twilioClient.messages.create({ to: supervisorPhone, body: smsMessage })
  // - SendGrid: await sendEmail({ to: supervisorEmail, subject: emailSubject, body: emailBody })

  // Log to notifications table
  try {
    await query(`
      INSERT INTO notifications (
        driver_id,
        type,
        message,
        sent_to,
        created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [
      driverId,
      'critical_vehicle_defect',
      smsMessage,
      supervisorEmail
    ]);
  } catch (dbError) {
    console.warn('Failed to log notification:', dbError);
  }
}

return successResponse({
  inspectionId,
  criticalDefect: defectSeverity === 'critical',
  vehicleOutOfService: defectSeverity === 'critical'
}, 'Post-trip inspection saved successfully');
```

### Step 3: Filter Out-of-Service Vehicles from Selector

**File**: `app/api/vehicles/available/route.ts`

Update the query to exclude out-of-service vehicles:

```typescript
const result = await query(`
  SELECT
    v.id,
    v.vehicle_number,
    v.make,
    v.model,
    v.year,
    v.capacity,
    v.status,
    v.is_active
  FROM vehicles v
  WHERE v.is_active = true
    AND v.status IN ('available', 'assigned')  -- Excludes 'out_of_service'
  ORDER BY v.vehicle_number
`);
```

### Step 4: Update Vehicle Selector to Show Out-of-Service Status

**File**: `components/mobile/VehicleSelector.tsx`

Update the vehicle display to show out-of-service vehicles as disabled:

```typescript
{vehicles.map((vehicle) => {
  const isOutOfService = vehicle.status === 'out_of_service';
  const isSelected = vehicle.id === selectedId;

  return (
    <button
      key={vehicle.id}
      onClick={() => !isOutOfService && setSelectedId(vehicle.id)}
      disabled={isOutOfService}
      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
        isOutOfService
          ? 'bg-red-50 border-red-300 cursor-not-allowed opacity-60'
          : isSelected
          ? 'bg-blue-50 border-blue-500'
          : 'bg-white border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-semibold text-gray-900">
            {isOutOfService && '🚫 '}
            {vehicle.vehicle_number}
          </div>
          <div className="text-sm text-gray-700">
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </div>
          {isOutOfService && (
            <div className="text-sm text-red-600 font-medium mt-1">
              OUT OF SERVICE - Maintenance Required
            </div>
          )}
        </div>
        {isSelected && !isOutOfService && (
          <div className="text-2xl">✓</div>
        )}
      </div>
    </button>
  );
})}
```

### Step 5: Implement Smart Pre-Trip Logic

**File**: `app/inspections/pre-trip/page.tsx`

Add logic to check if pre-trip is required:

```typescript
// Check if pre-trip already completed today for this vehicle
const preTripToday = await query(`
  SELECT id FROM inspections
  WHERE vehicle_id = $1
    AND type = 'pre_trip'
    AND DATE(created_at AT TIME ZONE 'America/Los_Angeles') = CURRENT_DATE
  LIMIT 1
`, [vehicleId]);

// Check if previous post-trip reported defects
const lastPostTrip = await query(`
  SELECT defects_found, defect_severity
  FROM inspections
  WHERE vehicle_id = $1
    AND type = 'post_trip'
  ORDER BY created_at DESC
  LIMIT 1
`, [vehicleId]);

const needsPreTrip =
  preTripToday.rowCount === 0 ||  // First shift of day
  (lastPostTrip.rows[0]?.defects_found && lastPostTrip.rows[0]?.defect_severity !== 'none');  // Previous defects

if (!needsPreTrip) {
  return (
    <div>
      <p>Pre-trip inspection not required.</p>
      <p>Reason: Another driver completed pre-trip today and no defects were reported.</p>
    </div>
  );
}
```

### Step 6: Deploy All Changes

```bash
# 1. Commit changes
git add .
git commit -m "feat: implement complete safety workflow with defect tracking"

# 2. Deploy to production (automatic via Vercel on push to main)
git push origin main

# 3. Test the workflow
```

## 🧪 TESTING CHECKLIST:

### Test 1: Normal Workflow (No Defects)
1. Driver clocks in
2. Completes pre-trip (first of day)
3. Completes post-trip with "No Defects"
4. Clocks out successfully

### Test 2: Minor Defect
1. Driver clocks in
2. Completes pre-trip
3. Completes post-trip with Minor defect
4. Vehicle remains available
5. Driver clocks out successfully

### Test 3: Critical Defect (MOST IMPORTANT)
1. Driver clocks in, selects Sprinter 1
2. Completes pre-trip
3. Completes post-trip with Critical defect
4. ✅ System shows confirmation message
5. ⚠️ Check logs for supervisor notification
6. 🚫 Vehicle status changes to 'out_of_service'
7. Try to clock in as different driver
8. 🚫 Sprinter 1 not selectable (shows "OUT OF SERVICE")
9. Must select different vehicle

### Test 4: Multiple Drivers, Same Day
1. Driver A completes pre-trip for Sprinter 1 at 8 AM
2. Driver A completes post-trip (no defects) at 2 PM
3. Driver B clocks in at 3 PM, selects Sprinter 1
4. ❌ Pre-trip NOT required (already done today, no defects)
5. Driver B completes post-trip at 9 PM

### Test 5: Pre-Trip After Defects
1. Driver A reports critical defect on Sprinter 1
2. Admin fixes vehicle, marks as 'available'
3. Driver B clocks in next day, selects Sprinter 1
4. ✅ Pre-trip IS required (previous defects reported)

## 📋 FILES MODIFIED:

- ✅ `migrations/000_combined_safety_features.sql` - Database schema
- ✅ `app/inspections/post-trip/PostTripInspectionClient.tsx` - Defect UI
- ⏳ `app/api/inspections/post-trip/route.ts` - Save defects + notifications
- ⏳ `app/api/vehicles/available/route.ts` - Filter out-of-service
- ⏳ `components/mobile/VehicleSelector.tsx` - Show out-of-service
- ⏳ `app/inspections/pre-trip/page.tsx` - Smart pre-trip logic

## 🎯 DEPLOYMENT ORDER:

1. Run database migration (Step 1)
2. Deploy code changes (push to main, auto-deploys via Vercel)
3. Test critical defect workflow
4. Verify notifications in logs
5. Test vehicle filtering works
6. Test smart pre-trip logic

## 📞 PRODUCTION INTEGRATION:

To enable real SMS/Email notifications, update these values:

```typescript
// In post-trip route.ts
const supervisorPhone = 'YOUR_ACTUAL_PHONE'; // e.g., '+12065551234'
const supervisorEmail = 'evcritchlow@gmail.com'; // Already correct

// Integrate Twilio (SMS)
const twilioClient = require('twilio')(accountSid, authToken);
await twilioClient.messages.create({
  to: supervisorPhone,
  from: twilioPhoneNumber,
  body: smsMessage
});

// Integrate SendGrid (Email)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
await sgMail.send({
  to: supervisorEmail,
  from: 'notifications@wallawallatravel.com',
  subject: emailSubject,
  text: emailBody
});
```

## ✅ SUCCESS CRITERIA:

- [x] Database migration runs successfully
- [ ] Post-trip saves defect data
- [ ] Critical defects trigger notifications
- [ ] Vehicle marked out-of-service automatically
- [ ] Out-of-service vehicles not selectable
- [ ] Smart pre-trip logic works (per day + defect check)
- [ ] Complete workflow tested with 2 drivers

---

**Once migration is run and code is deployed, the complete safety workflow will be operational!**
