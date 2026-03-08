# E2E Testing Skill — Walla Walla Travel

## Overview
Test WWT business workflows by driving a real Chrome browser against the live site.
Uses Claude Code Chrome integration (`/chrome` or `--chrome` flag).

## Critical Business Workflows

### 1. Quick Create Booking (the phone call test)
- Navigate to /admin/bookings/quick-create
- Fill: First Name "Test", Last Name "Customer", Email "test@wallawalla.travel", Phone "509-555-0100"
- Fill: Trip Date (tomorrow), Start Time "10:00 AM", Duration 6, Party Size 6
- Fill: Tour Type "Wine Tour", Pickup Location "Marcus Whitman Hotel"
- Verify: pricing calculator shows correct rate, tax 9.1%, 50% deposit
- Submit the form
- Verify: success response, redirects to booking detail or list
- Verify: booking appears in database via API call to /api/admin/bookings
- Verify: booking appears on calendar for the correct date
- Clean up: delete the test booking

### 2. Create Trip Proposal
- Navigate to /admin/trip-proposals/new (or the v2 form)
- Fill: customer details, trip type, dates
- Save as draft
- Verify: proposal appears in proposals list
- Navigate to the proposal detail page
- Add a day with 3 stops (pickup, winery, restaurant)
- Add 2 guests with email addresses
- Add a service line item
- Verify: pricing calculates correctly
- Share proposal (generate public link)
- Verify: public link loads without auth
- Clean up: delete the test proposal

### 3. Guest Registration + Deposit
- Navigate to a test proposal's public join link
- Fill: guest name, email, phone
- Verify: deposit amount displays if configured
- Submit registration
- Verify: guest appears in admin Guests tab
- Verify: confirmation email would be triggered (check email logs)

### 4. Driver Workflow
- Navigate to /time-clock/clock-in (as driver role)
- Select a vehicle
- Clock in
- Verify: active shift displays
- Navigate to driver tours — verify today's trips show
- Navigate to pre-trip inspection — verify form loads
- Submit inspection
- Clock out
- Verify: hours calculated correctly

### 5. Partner Request + Response
- Navigate to a proposal with stops
- Open a stop's vendor section
- Click "Send Request" — verify modal opens with pre-filled data
- Navigate to /partner-respond/[token] (use a test token if available)
- Verify: request details display
- Submit a "confirm" response
- Verify: stop status updates in admin view

### 6. Events System
- Navigate to /admin/events/new
- Create a test event with all required fields
- Verify: event appears in admin list
- Verify: event appears on public /events page
- Navigate to /admin/marketing/events-analytics
- Verify: analytics dashboard loads with all 5 tabs
- Clean up: delete the test event

### 7. Calendar Verification
- Navigate to /admin/calendar
- Verify: bookings show in green
- Verify: proposals show in amber
- Verify: shared tours show in sky blue
- Verify: driver names appear on booking chips
- Verify: date navigation works (next/prev month)
- Verify: filters work (by driver, by vehicle, by status)

## Running Tests
- Start Claude Code with `--chrome` flag or run `/chrome` to connect
- Say: "Run critical path test [number]" or "Run all critical path tests"
- Each test creates test data, verifies the workflow, and cleans up after itself
- Screenshots are taken at each verification step for visual confirmation

## Test Data Convention
- Test customers: name contains "Test", email uses @wallawalla.travel domain
- Test bookings: notes field contains "[E2E-TEST]" for easy identification and cleanup
- Always clean up test data after verification
