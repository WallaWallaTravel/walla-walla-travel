## Booking API Endpoints
**Phase 2 Week 3 - Core Booking Functionality**

### Overview

Four core API endpoints that enable online tour bookings:

1. **Check Availability** - Real-time availability checking
2. **Calculate Price** - Detailed pricing breakdown
3. **Create Booking** - Complete booking creation with payment
4. **Get Booking** - Retrieve booking details by booking number

---

## 1. POST /api/bookings/check-availability

Check if tours are available for a specific date and return available time slots.

### Request Body

```json
{
  "date": "2025-11-15",
  "duration_hours": 6.0,
  "party_size": 8,
  "vehicle_type": "sprinter" // optional: sprinter, luxury_sedan, suv
}
```

### Response

```json
{
  "success": true,
  "data": {
    "available": true,
    "available_times": [
      { "start": "09:00", "end": "15:00" },
      { "start": "10:00", "end": "16:00" },
      { "start": "11:00", "end": "17:00" }
    ],
    "suggested_vehicle": {
      "id": 1,
      "type": "sprinter",
      "capacity": 14,
      "name": "Mercedes-Benz Sprinter"
    },
    "pricing": {
      "base_price": 800.00,
      "estimated_gratuity": 120.00,
      "taxes": 72.00,
      "total": 992.00,
      "deposit_required": 496.00
    }
  }
}
```

### Business Logic

- Checks availability_rules for blackout dates
- Enforces capacity limits (max concurrent bookings)
- Applies buffer time between bookings (default 2 hours)
- Selects appropriate vehicle based on party size
- Calculates pricing with weekend premium

---

## 2. POST /api/bookings/calculate-price

Calculate detailed pricing breakdown for booking parameters.

### Request Body

```json
{
  "date": "2025-11-15",
  "duration_hours": 6.0,
  "party_size": 8,
  "vehicle_type": "sprinter",
  "winery_count": 4
}
```

### Response

```json
{
  "success": true,
  "data": {
    "pricing": {
      "base_price": 800.00,
      "subtotal": 800.00,
      "fees": {
        "gratuity": 120.00,
        "gratuity_percentage": 15,
        "taxes": 72.00,
        "tax_rate": 9
      },
      "total": 992.00,
      "deposit": {
        "amount": 496.00,
        "percentage": 50,
        "due_at": "booking_confirmation"
      },
      "balance": {
        "amount": 496.00,
        "due_date": "2025-11-13",
        "due_description": "48 hours before tour"
      }
    },
    "estimates": {
      "tasting_fees": {
        "per_winery": 20.00,
        "total_per_person": 80.00,
        "total_group": 640.00,
        "note": "Tasting fees paid directly to wineries"
      }
    },
    "policies": {
      "cancellation": {
        "72_hours_plus": "Full refund minus processing fee",
        "72_to_24_hours": "50% refund",
        "less_than_24_hours": "No refund"
      }
    }
  }
}
```

---

## 3. POST /api/bookings/create

Create a new booking with payment processing.

### Request Body

```json
{
  "customer": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+1-509-555-0123"
  },
  "booking": {
    "tour_date": "2025-11-15",
    "start_time": "10:00",
    "duration_hours": 6.0,
    "party_size": 8,
    "pickup_location": "Marcus Whitman Hotel, 6 West Rose Street, Walla Walla, WA 99362",
    "dropoff_location": "Same as pickup",
    "special_requests": "Celebrating anniversary",
    "dietary_restrictions": "Vegetarian",
    "accessibility_needs": "Wheelchair accessible"
  },
  "wineries": [
    { "winery_id": 1, "visit_order": 1 },
    { "winery_id": 2, "visit_order": 2 },
    { "winery_id": 3, "visit_order": 3 },
    { "winery_id": 4, "visit_order": 4 }
  ],
  "payment": {
    "stripe_payment_method_id": "pm_1234567890",
    "save_payment_method": true
  },
  "marketing_consent": {
    "email": true,
    "sms": false
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 1,
      "booking_number": "WWT-2025-00001",
      "status": "confirmed",
      "tour_date": "2025-11-15",
      "start_time": "10:00",
      "end_time": "16:00",
      "customer_name": "John Smith",
      "total_price": 992.00,
      "deposit_paid": true,
      "deposit_amount": 496.00,
      "balance_due": 496.00,
      "wineries": [...]
    },
    "payment": {
      "deposit_amount": 496.00,
      "payment_status": "succeeded"
    },
    "next_steps": [
      "Check your email for booking confirmation and itinerary",
      "Final payment of $496.00 will be processed 48 hours before tour",
      "You'll receive a reminder 72 hours before your tour"
    ]
  },
  "message": "Booking confirmed! We're excited to show you Walla Walla wine country."
}
```

### Business Logic

1. **Customer Management**: Find or create customer record
2. **Booking Number**: Generate unique WWT-YYYY-NNNNN format
3. **Pricing Calculation**: Apply rules from pricing_rules table
4. **Transaction Safety**: All database operations in transaction
5. **Winery Itinerary**: Create booking_wineries records
6. **Payment Recording**: Log deposit payment
7. **Timeline Tracking**: Create booking_timeline event
8. **Customer Stats**: Update total bookings and spend

### Validation Rules

- Party size: 1-14 passengers
- Duration: 4.0, 6.0, or 8.0 hours only
- Wineries: 2-6 wineries per tour
- Winery count must match duration:
  - 4 hours: 2-3 wineries
  - 6 hours: 3-4 wineries
  - 8 hours: 4-6 wineries
- No duplicate wineries
- Sequential visit orders (1, 2, 3, etc.)

---

## 4. GET /api/bookings/[bookingNumber]

Retrieve complete booking details by booking number.

### URL Parameter

- `bookingNumber`: Format WWT-YYYY-NNNNN (e.g., WWT-2025-00001)

### Response

```json
{
  "success": true,
  "data": {
    "booking_number": "WWT-2025-00001",
    "status": "confirmed",
    "tour_date": "2025-11-15",
    "customer": {
      "name": "John Smith",
      "email": "john@example.com",
      "vip_status": false
    },
    "party_size": 8,
    "pickup_location": "Marcus Whitman Hotel",
    "wineries": [
      {
        "name": "Leonetti Cellar",
        "visit_order": 1,
        "tasting_fee": 20.00,
        "specialties": ["Cabernet Sauvignon", "Merlot"]
      }
    ],
    "driver": {
      "name": "Eric Critchlow",
      "phone": "+1-509-555-0199"
    },
    "vehicle": {
      "name": "Mercedes-Benz Sprinter",
      "license_plate": "ABC123",
      "capacity": 14
    },
    "pricing": {
      "total": 992.00,
      "deposit_paid": 496.00,
      "balance_due": 496.00,
      "balance_due_date": "2025-11-13"
    },
    "payments": [...],
    "timeline": [...],
    "permissions": {
      "can_modify": true,
      "can_cancel": true,
      "cancellation_deadline": "2025-11-12T00:00:00Z"
    }
  }
}
```

### Included Data

- Complete booking details
- Customer information
- Winery itinerary with visit orders
- Driver assignment (if assigned)
- Vehicle assignment (if assigned)
- Payment history
- Event timeline (last 20 events)
- Modification permissions

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_email"
    }
  ],
  "timestamp": "2025-10-17T10:30:00Z"
}
```

### Common Error Codes

- `400` - Validation error (invalid input)
- `404` - Booking not found
- `429` - Rate limit exceeded
- `500` - Server error

---

## Testing

### Local Development

```bash
# Start development server
npm run dev

# Test endpoints
./test-booking-endpoints.sh
```

### Manual Testing with cURL

```bash
# Check availability
curl -X POST http://localhost:3000/api/bookings/check-availability \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-11-15","duration_hours":6.0,"party_size":8}'

# Calculate price
curl -X POST http://localhost:3000/api/bookings/calculate-price \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-11-15","duration_hours":6.0,"party_size":8,"winery_count":4}'

# Get booking
curl http://localhost:3000/api/bookings/WWT-2025-00001
```

---

## Database Tables Used

- `bookings` - Main booking records
- `customers` - Customer profiles
- `booking_wineries` - Tour itinerary
- `wineries` - Winery database
- `pricing_rules` - Dynamic pricing
- `availability_rules` - Capacity and blackout dates
- `payments` - Payment history
- `booking_timeline` - Event tracking
- `vehicles` - Fleet management
- `users` - Driver assignments

---

## Next Steps

### Phase 2 Week 4-6: Payment Integration

- [ ] Integrate Stripe payment processing
- [ ] Handle payment webhooks
- [ ] Implement deposit collection
- [ ] Schedule final payments
- [ ] Process refunds

### Phase 2 Week 7-8: Notifications

- [ ] SendGrid email templates
- [ ] Booking confirmation emails
- [ ] Reminder emails (72 hours before)
- [ ] Twilio SMS notifications
- [ ] Driver assignment notifications

### Phase 2 Week 9-10: Admin Dashboard

- [ ] Calendar view (daily/weekly/monthly)
- [ ] Driver/vehicle assignment UI
- [ ] Manual booking creation
- [ ] Booking management interface

---

**Implementation Status**: ✅ COMPLETE
**Created**: October 17, 2025
**Developer**: Phase 2 Week 3 - Booking API Foundation
