# 📡 API Reference

**Complete API documentation for Walla Walla Travel system**

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Response Format](#response-format)
5. [Bookings API](#bookings-api)
6. [Proposals API](#proposals-api)
7. [Customers API](#customers-api)
8. [Reservations API](#reservations-api)
9. [Payments API](#payments-api)
10. [Error Codes](#error-codes)

---

## 🎯 OVERVIEW

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://wallawalla.travel/api/v1
```

### RESTful Design

All resources follow standard REST conventions:

```
GET    /[resource]       - List resources (paginated)
POST   /[resource]       - Create new resource
GET    /[resource]/:id   - Get single resource
PATCH  /[resource]/:id   - Update resource
DELETE /[resource]/:id   - Delete/cancel resource
```

### Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 50, max: 100) |
| `offset` | number | Pagination offset (default: 0) |
| `include` | string | Comma-separated relations to include |
| `status` | string | Filter by status |
| `startDate` | string | Filter by date range (YYYY-MM-DD) |
| `endDate` | string | Filter by date range (YYYY-MM-DD) |

---

## 🔐 AUTHENTICATION

### Current State
Most endpoints are currently open (pre-launch).

### Future Implementation
```bash
# Include JWT token in Authorization header
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/bookings
```

---

## 🚦 RATE LIMITING

### Limits

| Tier | Requests/Minute | Use Case |
|------|-----------------|----------|
| Public | 100 | Unauthenticated requests |
| Authenticated | 1000 | Logged-in users |
| Admin | Unlimited | Internal operations |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

### Exceeded Response

```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 60
  }
}
```

---

## 📋 RESPONSE FORMAT

### Success Response

```json
{
  "success": true,
  "data": {
    // Resource data here
  }
}
```

### List Response

```json
{
  "success": true,
  "data": [/* items */],
  "meta": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND",
    "details": {
      // Additional error context
    }
  }
}
```

---

## 🗓️ BOOKINGS API

### List Bookings

```http
GET /api/v1/bookings
```

**Query Parameters:**
- `status` - confirmed | pending | completed | cancelled
- `customerId` - Filter by customer ID
- `startDate` - Tour date range start (YYYY-MM-DD)
- `endDate` - Tour date range end (YYYY-MM-DD)
- `include` - wineries | driver | vehicle (comma-separated)
- `limit` - Max results (default: 50)
- `offset` - Pagination offset

**Example:**
```bash
curl "http://localhost:3000/api/v1/bookings?status=confirmed&include=wineries,driver&limit=20"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "bookingNumber": "WWT-2025-001234",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "partySize": 6,
      "tourDate": "2025-12-15",
      "status": "confirmed",
      "totalPrice": 850.00,
      "wineries": [
        {
          "id": 5,
          "name": "L'Ecole No 41",
          "tastingFee": 25.00
        }
      ],
      "driver": {
        "id": 2,
        "name": "Ryan Smith"
      },
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

---

### Create Booking

```http
POST /api/v1/bookings
```

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1-509-555-0100",
  "partySize": 6,
  "tourDate": "2025-12-15",
  "pickupTime": "10:00",
  "pickupLocation": "123 Main St, Walla Walla, WA",
  "dropoffLocation": "123 Main St, Walla Walla, WA",
  "duration": 6.0,
  "wineryIds": [5, 12, 23],
  "lunchRestaurantId": 3,
  "specialRequests": "Wheelchair accessible",
  "brandId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "bookingNumber": "WWT-2025-001456",
    "status": "pending",
    ...
  }
}
```

---

### Get Single Booking

```http
GET /api/v1/bookings/:id
```

**Parameters:**
- `:id` - Booking ID or booking number

**Example:**
```bash
# By ID
curl http://localhost:3000/api/v1/bookings/123

# By booking number
curl http://localhost:3000/api/v1/bookings/WWT-2025-001234
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "bookingNumber": "WWT-2025-001234",
    "customer": {
      "id": 45,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-509-555-0100"
    },
    "wineries": [...],
    "driver": {...},
    "vehicle": {...},
    "payments": [...]
  }
}
```

---

### Update Booking

```http
PATCH /api/v1/bookings/:id
```

**Request Body (partial update):**
```json
{
  "partySize": 8,
  "pickupTime": "10:30",
  "specialRequests": "Updated request"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "partySize": 8,
    ...
  }
}
```

---

### Cancel Booking

```http
DELETE /api/v1/bookings/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully"
}
```

---

## 📝 PROPOSALS API

### List Proposals

```http
GET /api/v1/proposals
```

**Query Parameters:**
- `status` - draft | sent | accepted | declined
- `customerId` - Filter by customer
- `limit` - Max results
- `offset` - Pagination

**Example:**
```bash
curl "http://localhost:3000/api/v1/proposals?status=sent"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 78,
      "proposalNumber": "PROP-2025-000078",
      "customerName": "Jane Smith",
      "status": "sent",
      "totalAmount": 1200.00,
      "validUntil": "2025-12-01",
      "createdAt": "2025-11-10T14:00:00Z"
    }
  ]
}
```

---

### Create Proposal

```http
POST /api/v1/proposals
```

**Request Body:**
```json
{
  "customerName": "Jane Smith",
  "customerEmail": "jane@example.com",
  "customerPhone": "+1-509-555-0200",
  "proposalDate": "2025-11-10",
  "validUntil": "2025-12-01",
  "items": [
    {
      "description": "Wine tour (6 hours, 8 guests)",
      "quantity": 1,
      "unitPrice": 1000.00,
      "amount": 1000.00
    },
    {
      "description": "Lunch at Saffron",
      "quantity": 8,
      "unitPrice": 25.00,
      "amount": 200.00
    }
  ],
  "notes": "Custom itinerary for corporate event",
  "brandId": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 79,
    "proposalNumber": "PROP-2025-000079",
    "subtotal": 1200.00,
    "tax": 96.00,
    "total": 1296.00,
    ...
  }
}
```

---

### Get Single Proposal

```http
GET /api/v1/proposals/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 78,
    "proposalNumber": "PROP-2025-000078",
    "items": [...],
    "customer": {...}
  }
}
```

---

### Update Proposal

```http
PATCH /api/v1/proposals/:id
```

**Request Body:**
```json
{
  "status": "accepted",
  "notes": "Client approved proposal"
}
```

---

### Decline Proposal

```http
DELETE /api/v1/proposals/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Proposal declined"
}
```

---

## 👤 CUSTOMERS API

### Get Customer by Email

```http
GET /api/customers/by-email/:email
```

**Example:**
```bash
curl http://localhost:3000/api/customers/by-email/john@example.com
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 45,
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+1-509-555-0100",
    "totalBookings": 3,
    "lifetimeValue": 2400.00
  }
}
```

---

### Get Customer History

```http
GET /api/customers/:id/history
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {...},
    "bookings": [...],
    "reservations": [...],
    "totalSpent": 2400.00
  }
}
```

---

## 📅 RESERVATIONS API

### Create Reservation (Reserve & Refine)

```http
POST /api/booking/reserve
```

**Request Body:**
```json
{
  "customerName": "Sarah Johnson",
  "customerEmail": "sarah@example.com",
  "customerPhone": "+1-509-555-0300",
  "partySize": 6,
  "preferredDate": "2025-12-20",
  "alternateDate": "2025-12-21",
  "eventType": "Birthday celebration",
  "specialRequests": "Sparkling wine focus",
  "depositAmount": 250.00,
  "paymentMethod": "card",
  "stripePaymentIntentId": "pi_xxx",
  "brandId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 89,
    "reservationNumber": "RES-2025-000089",
    "status": "pending",
    "consultationDeadline": "2025-11-13T10:00:00Z"
  }
}
```

---

### List Reservations

```http
GET /api/reservations
```

**Query Parameters:**
- `status` - pending | contacted | confirmed | cancelled
- `customerId` - Filter by customer

---

## 💳 PAYMENTS API

### Create Payment

```http
POST /api/payments
```

**Request Body:**
```json
{
  "bookingId": 123,
  "customerId": 45,
  "amount": 850.00,
  "paymentMethod": "card",
  "stripePaymentIntentId": "pi_xxx"
}
```

---

### Get Payments by Booking

```http
GET /api/payments/booking/:bookingId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 567,
      "amount": 250.00,
      "paymentMethod": "card",
      "paymentStatus": "completed",
      "transactionDate": "2025-11-01T10:00:00Z"
    },
    {
      "id": 678,
      "amount": 600.00,
      "paymentMethod": "check",
      "paymentStatus": "completed",
      "transactionDate": "2025-11-10T14:00:00Z"
    }
  ]
}
```

---

## ❌ ERROR CODES

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |

---

## 📚 RELATED DOCUMENTATION

- **[Architecture](./ARCHITECTURE.md)** - System architecture reference
- **[Getting Started](./GETTING_STARTED.md)** - Usage guide and examples

---

**END OF API REFERENCE**

*Build amazing things with our API!* 🚀


