/**
 * PDF Itinerary Generator
 * Creates professional tour itineraries with maps, winery details, and QR codes
 * 
 * Note: This uses a simple HTML-to-PDF approach that works in Node.js
 * For production, consider using libraries like:
 * - @react-pdf/renderer (React-based)
 * - pdfkit (Node.js)
 * - puppeteer (HTML to PDF)
 */

interface Booking {
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  party_size: number;
  pickup_location: string;
  dropoff_location: string;
  special_requests?: string;
  driver_name?: string;
  vehicle_make?: string;
  vehicle_model?: string;
}

interface WineryStop {
  stop_order: number;
  winery_name: string;
  winery_address: string;
  winery_city: string;
  winery_phone?: string;
  winery_website?: string;
  arrival_time: string;
  departure_time: string;
  duration_minutes: number;
  notes?: string;
}

interface ItineraryData {
  booking: Booking;
  stops: WineryStop[];
}

/**
 * Generate HTML for PDF itinerary
 */
export function generateItineraryHTML(data: ItineraryData): string {
  const { booking, stops } = data;
  const tourDate = new Date(booking.tour_date);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tour Itinerary - ${booking.booking_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      padding: 40px;
    }
    
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 36px;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 18px;
      opacity: 0.9;
    }
    
    .section {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: bold;
      color: #7c3aed;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .info-item {
      padding: 12px;
      background: white;
      border-radius: 8px;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .stop {
      background: white;
      border: 2px solid #e5e7eb;
      border-left: 4px solid #7c3aed;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    
    .stop-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .stop-number {
      width: 40px;
      height: 40px;
      background: #7c3aed;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .stop-name {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .stop-details {
      margin-left: 52px;
    }
    
    .stop-detail {
      margin-bottom: 8px;
      display: flex;
      gap: 8px;
    }
    
    .stop-detail-label {
      font-weight: 600;
      color: #6b7280;
      min-width: 80px;
    }
    
    .stop-detail-value {
      color: #1f2937;
    }
    
    .map-placeholder {
      background: #e5e7eb;
      border: 2px dashed #9ca3af;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    
    .qr-section {
      text-align: center;
      padding: 24px;
      background: #f9fafb;
      border-radius: 12px;
      margin-top: 24px;
    }
    
    .qr-placeholder {
      width: 150px;
      height: 150px;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #9ca3af;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    
    .footer strong {
      color: #1f2937;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .header {
        background: #7c3aed;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>🍷 Your Wine Tour Itinerary</h1>
    <p>Walla Walla Travel • ${booking.booking_number}</p>
  </div>

  <!-- Tour Details -->
  <div class="section">
    <div class="section-title">📋 Tour Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Date</div>
        <div class="info-value">${tourDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Time</div>
        <div class="info-value">${booking.start_time} - ${booking.end_time}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Duration</div>
        <div class="info-value">${booking.duration_hours} hours</div>
      </div>
      <div class="info-item">
        <div class="info-label">Party Size</div>
        <div class="info-value">${booking.party_size} guests</div>
      </div>
    </div>
  </div>

  <!-- Guest Information -->
  <div class="section">
    <div class="section-title">👤 Guest Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Name</div>
        <div class="info-value">${booking.customer_name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">${booking.customer_email}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Phone</div>
        <div class="info-value">${booking.customer_phone}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Pickup Location</div>
        <div class="info-value">${booking.pickup_location}</div>
      </div>
    </div>
    ${booking.special_requests ? `
    <div class="info-item" style="margin-top: 16px;">
      <div class="info-label">Special Requests</div>
      <div class="info-value">${booking.special_requests}</div>
    </div>
    ` : ''}
  </div>

  <!-- Driver & Vehicle -->
  ${booking.driver_name ? `
  <div class="section">
    <div class="section-title">🚐 Your Driver & Vehicle</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Driver</div>
        <div class="info-value">${booking.driver_name}</div>
      </div>
      ${booking.vehicle_make ? `
      <div class="info-item">
        <div class="info-label">Vehicle</div>
        <div class="info-value">${booking.vehicle_make} ${booking.vehicle_model}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Winery Stops -->
  <div class="section">
    <div class="section-title">🍇 Your Winery Stops</div>
    ${stops.map(stop => `
    <div class="stop">
      <div class="stop-header">
        <div class="stop-number">${stop.stop_order}</div>
        <div class="stop-name">${stop.winery_name}</div>
      </div>
      <div class="stop-details">
        <div class="stop-detail">
          <span class="stop-detail-label">📍 Address:</span>
          <span class="stop-detail-value">${stop.winery_address}, ${stop.winery_city}</span>
        </div>
        <div class="stop-detail">
          <span class="stop-detail-label">⏰ Time:</span>
          <span class="stop-detail-value">${stop.arrival_time} - ${stop.departure_time} (${stop.duration_minutes} min)</span>
        </div>
        ${stop.winery_phone ? `
        <div class="stop-detail">
          <span class="stop-detail-label">📞 Phone:</span>
          <span class="stop-detail-value">${stop.winery_phone}</span>
        </div>
        ` : ''}
        ${stop.winery_website ? `
        <div class="stop-detail">
          <span class="stop-detail-label">🌐 Website:</span>
          <span class="stop-detail-value">${stop.winery_website}</span>
        </div>
        ` : ''}
        ${stop.notes ? `
        <div class="stop-detail">
          <span class="stop-detail-label">📝 Notes:</span>
          <span class="stop-detail-value">${stop.notes}</span>
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
  </div>

  <!-- Map Placeholder -->
  <div class="section">
    <div class="section-title">🗺️ Tour Route</div>
    <div class="map-placeholder">
      <p><strong>Interactive Map</strong></p>
      <p>Scan the QR code below to view your tour route on Google Maps</p>
    </div>
  </div>

  <!-- QR Code -->
  <div class="qr-section">
    <div class="qr-placeholder">
      <div>QR Code<br>Booking: ${booking.booking_number}</div>
    </div>
    <p><strong>Scan to access your digital itinerary</strong></p>
    <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
      View real-time updates, order lunch, and more
    </p>
  </div>

  <!-- Important Information -->
  <div class="section">
    <div class="section-title">ℹ️ Important Information</div>
    <ul style="list-style-position: inside; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Please arrive 10 minutes before your scheduled pickup time</li>
      <li style="margin-bottom: 8px;">Tasting fees at wineries are not included in tour price</li>
      <li style="margin-bottom: 8px;">Most wineries charge $15-25 per person for tastings</li>
      <li style="margin-bottom: 8px;">Feel free to purchase wine at any stop - we'll store it safely</li>
      <li style="margin-bottom: 8px;">Bring a valid ID - all guests must be 21+</li>
      <li style="margin-bottom: 8px;">Dress comfortably and bring layers (weather can change)</li>
      <li style="margin-bottom: 8px;">Water and snacks are provided in the vehicle</li>
      <li style="margin-bottom: 8px;">Your driver will contact you 24 hours before the tour</li>
    </ul>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>Walla Walla Travel</strong></p>
    <p>Walla Walla, Washington</p>
    <p style="margin-top: 8px;">
      📞 (509) 555-0199 • ✉️ info@wallawallatravel.com
    </p>
    <p style="margin-top: 16px; font-size: 12px;">
      Thank you for choosing Walla Walla Travel!<br>
      We look forward to showing you the best of wine country.
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate a simple text-based itinerary (fallback)
 */
export function generateItineraryText(data: ItineraryData): string {
  const { booking, stops } = data;
  const tourDate = new Date(booking.tour_date);

  return `
═══════════════════════════════════════════════════════════
  🍷 YOUR WINE TOUR ITINERARY
  Walla Walla Travel • ${booking.booking_number}
═══════════════════════════════════════════════════════════

📋 TOUR DETAILS
───────────────────────────────────────────────────────────
Date:     ${tourDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
Time:     ${booking.start_time} - ${booking.end_time}
Duration: ${booking.duration_hours} hours
Party:    ${booking.party_size} guests

👤 GUEST INFORMATION
───────────────────────────────────────────────────────────
Name:     ${booking.customer_name}
Email:    ${booking.customer_email}
Phone:    ${booking.customer_phone}
Pickup:   ${booking.pickup_location}
${booking.special_requests ? `\nSpecial Requests:\n${booking.special_requests}` : ''}

${booking.driver_name ? `
🚐 YOUR DRIVER & VEHICLE
───────────────────────────────────────────────────────────
Driver:   ${booking.driver_name}
${booking.vehicle_make ? `Vehicle:  ${booking.vehicle_make} ${booking.vehicle_model}` : ''}
` : ''}

🍇 YOUR WINERY STOPS
───────────────────────────────────────────────────────────
${stops.map(stop => `
Stop ${stop.stop_order}: ${stop.winery_name}
  📍 ${stop.winery_address}, ${stop.winery_city}
  ⏰ ${stop.arrival_time} - ${stop.departure_time} (${stop.duration_minutes} min)
  ${stop.winery_phone ? `📞 ${stop.winery_phone}` : ''}
  ${stop.winery_website ? `🌐 ${stop.winery_website}` : ''}
  ${stop.notes ? `📝 ${stop.notes}` : ''}
`).join('\n')}

ℹ️ IMPORTANT INFORMATION
───────────────────────────────────────────────────────────
• Please arrive 10 minutes before your scheduled pickup time
• Tasting fees at wineries are not included in tour price
• Most wineries charge $15-25 per person for tastings
• Feel free to purchase wine at any stop - we'll store it safely
• Bring a valid ID - all guests must be 21+
• Dress comfortably and bring layers (weather can change)
• Water and snacks are provided in the vehicle
• Your driver will contact you 24 hours before the tour

═══════════════════════════════════════════════════════════
  Walla Walla Travel
  Walla Walla, Washington
  📞 (509) 555-0199 • ✉️ info@wallawallatravel.com
  
  Thank you for choosing Walla Walla Travel!
  We look forward to showing you the best of wine country.
═══════════════════════════════════════════════════════════
  `;
}

