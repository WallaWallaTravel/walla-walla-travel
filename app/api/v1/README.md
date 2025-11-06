# API v1 Documentation

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Status:** ✅ Active

---

## 📋 **Overview**

This is version 1 of the Walla Walla Travel API. All endpoints follow RESTful conventions and return JSON responses.

---

## 🔑 **Authentication**

Currently, most endpoints are public. Admin and driver endpoints require authentication (to be implemented).

---

## 📊 **Response Format**

All v1 API responses follow this structure:

```json
{
  "version": "v1",
  "data": { ... },
  "count": 10  // For list endpoints
}
```

### **Headers:**
- `X-API-Version: v1` - Indicates the API version

---

## 🛣️ **Endpoints**

### **Bookings**

#### `GET /api/v1/bookings/[booking_id]`
Get a specific booking by ID.

**Response:**
```json
{
  "version": "v1",
  "data": {
    "id": 1,
    "booking_number": "WWT-2025-001",
    "customer_name": "John Doe",
    "tour_date": "2025-11-15",
    "party_size": 4,
    "status": "confirmed"
  }
}
```

---

### **Restaurants**

#### `GET /api/v1/restaurants`
Get list of active restaurants.

**Response:**
```json
{
  "version": "v1",
  "data": [
    {
      "id": 34,
      "name": "Wine Country Store",
      "cuisine_type": "Deli, Sandwiches",
      "phone": "509-525-0000"
    }
  ],
  "count": 2
}
```

---

### **Itinerary**

#### `GET /api/v1/itinerary/[booking_id]`
Get itinerary stops for a booking.

**Response:**
```json
{
  "version": "v1",
  "data": [
    {
      "id": 1,
      "stop_order": 1,
      "winery_name": "L'Ecole No 41",
      "arrival_time": "10:00:00",
      "departure_time": "11:30:00"
    }
  ],
  "count": 4
}
```

---

## ⚠️ **Error Responses**

All errors follow this format:

```json
{
  "message": "Booking not found",
  "errorId": "err_abc123"
}
```

### **Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## 🔄 **Versioning**

This API uses URL-based versioning. To use v1, prefix all endpoints with `/api/v1/`.

**Example:**
```
GET /api/v1/bookings/123
```

---

## 📈 **Rate Limiting**

Currently no rate limiting is implemented. This will be added in a future version.

---

## 🚀 **Changelog**

### **v1.0.0** (October 31, 2025)
- Initial release
- Bookings endpoint
- Restaurants endpoint
- Itinerary endpoint
- Standardized error handling
- Type-safe responses

---

## 📚 **Examples**

### **Fetch a Booking (JavaScript)**
```javascript
const response = await fetch('/api/v1/bookings/123');
const { data } = await response.json();
console.log(data.booking_number);
```

### **Fetch Restaurants (cURL)**
```bash
curl -X GET https://example.com/api/v1/restaurants \
  -H "Accept: application/json"
```

---

## 🔮 **Future Endpoints**

Coming in future versions:
- `POST /api/v1/bookings` - Create booking
- `PATCH /api/v1/bookings/[id]` - Update booking
- `GET /api/v1/drivers` - List drivers
- `GET /api/v1/vehicles` - List vehicles

---

## 💬 **Support**

For API support, contact: dev@wallawallatravel.com

---

**Last Updated:** October 31, 2025

