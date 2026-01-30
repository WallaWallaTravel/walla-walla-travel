/**
 * Brand-Specific Email Configurations
 * Each brand has its own voice, colors, and contact information for emails
 */

export interface BrandEmailConfig {
  id: number;
  name: string;
  from_email: string;
  reply_to: string;
  phone: string;
  website: string;
  
  // Visual identity
  primary_color: string;
  secondary_color: string;
  
  // Email voice/tone
  tagline: string;
  closing: string;
  signature: string;
}

export const BRAND_EMAIL_CONFIGS: Record<number, BrandEmailConfig> = {
  // Walla Walla Travel - Premium but approachable
  1: {
    id: 1,
    name: 'Walla Walla Travel',
    from_email: 'bookings@wallawalla.travel',
    reply_to: 'info@wallawalla.travel',
    phone: '(509) 200-8000',
    website: 'wallawalla.travel',
    
    primary_color: '#7c3aed', // Purple
    secondary_color: '#5b21b6', // Dark purple
    
    tagline: 'Your Walla Walla wine country resource',
    closing: 'Looking forward to hosting your wine country experience',
    signature: 'The Walla Walla Travel Team'
  },
  
  // Herding Cats Wine Tours - Sophisticated, verbose, dry wit
  2: {
    id: 2,
    name: 'Herding Cats Wine Tours',
    from_email: 'tours@hctours.com',
    reply_to: 'tours@hctours.com',
    phone: '(509) 200-8000',
    website: 'herdingcatswine.com',
    
    primary_color: '#6B1F3A', // Deep burgundy
    secondary_color: '#3A3633', // Charcoal
    
    tagline: 'Mastering the art of group wine touring',
    closing: 'Anticipating the challenge with appropriate enthusiasm',
    signature: 'The Herding Cats Team'
  },
  
  // NW Touring & Concierge - Corporate, professional
  3: {
    id: 3,
    name: 'NW Touring & Concierge',
    from_email: 'reservations@nwtouring.com',
    reply_to: 'info@nwtouring.com',
    phone: '(509) 540-3600',
    website: 'nwtouring.com',
    
    primary_color: '#1e40af', // Professional blue
    secondary_color: '#1e3a8a', // Dark blue
    
    tagline: 'Premium wine tours & private transportation',
    closing: 'We appreciate your business',
    signature: 'NW Touring & Concierge'
  }
};

/**
 * Get brand config by ID (defaults to Walla Walla Travel)
 */
export function getBrandEmailConfig(brandId?: number): BrandEmailConfig {
  return BRAND_EMAIL_CONFIGS[brandId || 1] || BRAND_EMAIL_CONFIGS[1];
}

/**
 * Brand-specific reservation confirmation emails
 */
export const brandReservationTemplates = {
  
  /**
   * Walla Walla Travel - Friendly and professional
   */
  1: (data: {
    customer_name: string;
    reservation_number: string;
    party_size: number;
    preferred_date: string;
    event_type: string;
    deposit_amount: number;
    payment_method: string;
    consultation_hours: number;
    confirmation_url: string;
  }) => {
    const brand = getBrandEmailConfig(1);
    return {
      subject: `Your Wine Tour Reservation is Confirmed! [${data.reservation_number}]`,
      
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.secondary_color} 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🍷 Date Reserved!</h1>
      <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">${brand.tagline}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">
        Hi ${data.customer_name},
      </p>
      
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0; line-height: 1.6;">
        Great news! Your <strong>${data.deposit_amount === 250 ? '$250' : '$350'} deposit</strong> has reserved your preferred date for a wine country experience.
      </p>
      
      <!-- Reservation Details -->
      <div style="background: #f9fafb; border-left: 4px solid ${brand.primary_color}; padding: 20px; margin: 30px 0;">
        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #111827;">Reservation Details</h2>
        <table style="width: 100%; font-size: 14px; color: #374151;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Reservation #:</td>
            <td style="padding: 8px 0;">${data.reservation_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Party Size:</td>
            <td style="padding: 8px 0;">${data.party_size} guests</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Preferred Date:</td>
            <td style="padding: 8px 0;">${data.preferred_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Event Type:</td>
            <td style="padding: 8px 0;">${data.event_type.replace('_', ' ')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Deposit:</td>
            <td style="padding: 8px 0;">$${data.deposit_amount} (${data.payment_method})</td>
          </tr>
        </table>
      </div>
      
      <h3 style="font-size: 18px; color: #111827; margin: 30px 0 15px 0;">What Happens Next?</h3>
      
      <div style="margin: 20px 0;">
        <div style="display: flex; align-items: start; margin-bottom: 15px;">
          <div style="background: ${brand.primary_color}; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; font-weight: bold;">1</div>
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Ryan will call you within ${data.consultation_hours} hours</strong> to discuss your group's preferences and customize your perfect itinerary.</p>
          </div>
        </div>
        
        <div style="display: flex; align-items: start; margin-bottom: 15px;">
          <div style="background: ${brand.primary_color}; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; font-weight: bold;">2</div>
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Together we'll design your perfect day</strong> - wineries, lunch, timing, everything tailored to your group.</p>
          </div>
        </div>
        
        <div style="display: flex; align-items: start;">
          <div style="background: ${brand.primary_color}; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; font-weight: bold;">3</div>
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 14px; color: #111827;"><strong>Final payment is due 48 hours after tour concludes</strong> to accurately reflect final service time, lunch costs, and any added services.</p>
          </div>
        </div>
      </div>
      
      ${data.payment_method === 'check' ? `
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 30px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #92400e;">📬 Check Payment Instructions</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #78350f;">
          Please mail your $${data.deposit_amount} deposit check to:
        </p>
        <p style="margin: 0; font-size: 14px; color: #78350f; font-weight: 600;">
          ${brand.name}<br/>
          [Address Line 1]<br/>
          [City, State ZIP]
        </p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #78350f; font-style: italic;">
          Include reservation #${data.reservation_number} in the memo line
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; color: #111827; margin: 30px 0 20px 0; line-height: 1.6;">
        ${brand.closing},
      </p>
      
      <p style="font-size: 16px; color: #111827; margin: 0; font-weight: 600;">
        ${brand.signature}
      </p>
      
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
        Questions? We're here to help!
      </p>
      <p style="margin: 0; font-size: 14px; color: #111827;">
        <strong>${brand.phone}</strong> • <a href="mailto:${brand.reply_to}" style="color: ${brand.primary_color};">${brand.reply_to}</a>
      </p>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af;">
        ${brand.name} • ${brand.website}
      </p>
    </div>
    
  </div>
</body>
</html>
      `,
      
      text: `
Your Wine Tour Reservation is Confirmed! [${data.reservation_number}]

Hi ${data.customer_name},

Great news! Your $${data.deposit_amount} deposit has reserved your preferred date for a wine country experience.

RESERVATION DETAILS
-------------------
Reservation #: ${data.reservation_number}
Party Size: ${data.party_size} guests
Preferred Date: ${data.preferred_date}
Event Type: ${data.event_type.replace('_', ' ')}
Deposit: $${data.deposit_amount} (${data.payment_method})

WHAT HAPPENS NEXT?
------------------
1. Ryan will call you within ${data.consultation_hours} hours to discuss your group's preferences and customize your perfect itinerary.

2. Together we'll design your perfect day - wineries, lunch, timing, everything tailored to your group.

3. Final payment is due 48 hours after tour concludes to accurately reflect final service time, lunch costs, and any added services.

${data.payment_method === 'check' ? `
CHECK PAYMENT INSTRUCTIONS
-------------------------
Please mail your $${data.deposit_amount} deposit check to:

${brand.name}
[Address Line 1]
[City, State ZIP]

Include reservation #${data.reservation_number} in the memo line
` : ''}

${brand.closing},

${brand.signature}

---
Questions? ${brand.phone} • ${brand.reply_to}
${brand.name} • ${brand.website}
      `
    };
  },
  
  /**
   * Herding Cats Wine Tours - Sophisticated, verbose, dry wit
   */
  2: (data: {
    customer_name: string;
    reservation_number: string;
    party_size: number;
    preferred_date: string;
    event_type: string;
    deposit_amount: number;
    payment_method: string;
    consultation_hours: number;
    confirmation_url: string;
  }) => {
    const brand = getBrandEmailConfig(2);
    return {
      subject: `Your Reservation is Confirmed | Herding Cats Wine Tours`,
      
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background-color: #F5F1E8;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.secondary_color} 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #F5F1E8; margin: 0; font-size: 26px; font-weight: normal; letter-spacing: 0.5px;">HERDING CATS WINE TOURS</h1>
      <p style="color: #B8926A; margin: 15px 0 0 0; font-size: 14px; font-style: italic;">${brand.tagline}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px; line-height: 1.8; color: #1A1614;">
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">
        Dear ${data.customer_name},
      </p>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">
        Your reservation for ${data.preferred_date} has been secured. We approach the challenge with appropriate enthusiasm and documented experience managing similar complexities.
      </p>
      
      <!-- Reservation Particulars -->
      <div style="background: #F5F1E8; border-left: 3px solid ${brand.primary_color}; padding: 25px; margin: 30px 0;">
        <h2 style="margin: 0 0 20px 0; font-size: 16px; color: #1A1614; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Reservation Particulars</h2>
        <table style="width: 100%; font-size: 14px; color: #3A3633;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; width: 45%;">Reference Number:</td>
            <td style="padding: 8px 0;">${data.reservation_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Party Composition:</td>
            <td style="padding: 8px 0;">${data.party_size} individuals of presumably varied preferences</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Preferred Date:</td>
            <td style="padding: 8px 0;">${data.preferred_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Deposit Secured:</td>
            <td style="padding: 8px 0;">$${data.deposit_amount} via ${data.payment_method}</td>
          </tr>
        </table>
      </div>
      
      <h3 style="font-size: 16px; color: #1A1614; margin: 30px 0 15px 0; font-weight: 600;">What to Anticipate</h3>
      
      <p style="font-size: 15px; margin: 0 0 15px 0;">
        Our senior sommelier-guide will contact you within ${data.consultation_hours} hours to discuss:
      </p>
      
      <ul style="font-size: 15px; margin: 0 0 20px 20px; padding: 0;">
        <li style="margin-bottom: 10px;">Your group's collective palate preferences (if discernible)</li>
        <li style="margin-bottom: 10px;">Individual peculiarities requiring accommodation</li>
        <li style="margin-bottom: 10px;">Specific estates you've contemplated visiting</li>
        <li style="margin-bottom: 10px;">Dietary restrictions demanding attention</li>
      </ul>
      
      <h3 style="font-size: 16px; color: #1A1614; margin: 30px 0 15px 0; font-weight: 600;">On Punctuality</h3>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">
        Like our feline namesakes, we appreciate precision. Your confirmation email will specify pickup time and location. We maintain schedules with accuracy typically associated with Swiss watchmakers, not tour operators.
      </p>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">
        Unlike actual cats, we expect punctuality as professional courtesy rather than lifestyle suggestion.
      </p>
      
      <h3 style="font-size: 16px; color: #1A1614; margin: 30px 0 15px 0; font-weight: 600;">Financial Arrangements</h3>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">
        Final remuneration becomes due forty-eight hours following tour conclusion, accurately reflecting service duration, lunch expenditures, and any supplementary arrangements.
      </p>
      
      ${data.payment_method === 'check' ? `
      <div style="background: #FEF3E8; border: 1px solid #B8926A; padding: 20px; margin: 30px 0;">
        <h3 style="margin: 0 0 15px 0; font-size: 15px; color: #6B1F3A;">Remittance Instructions</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #3A3633;">
          Please forward deposit check ($${data.deposit_amount}) to:
        </p>
        <p style="margin: 0; font-size: 14px; color: #1A1614; font-weight: 600;">
          ${brand.name}<br/>
          [Address]<br/>
          [City, State ZIP]
        </p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #6B7280; font-style: italic;">
          Reference: ${data.reservation_number}
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 15px; margin: 40px 0 20px 0;">
        ${brand.closing},
      </p>
      
      <p style="font-size: 15px; margin: 0; font-weight: 600;">
        ${brand.signature}
      </p>
      
      <p style="font-size: 13px; margin: 15px 0 0 0; color: #6B7280; font-style: italic;">
        P.S. Actual cats herded to date: zero. Metaphorical cats (your party): ${data.party_size}. We've prepared accordingly.
      </p>
      
    </div>
    
    <!-- Footer -->
    <div style="background: #F5F1E8; padding: 30px; text-align: center; border-top: 1px solid #B8926A;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #3A3633;">
        Questions or Concerns
      </p>
      <p style="margin: 0; font-size: 14px; color: #1A1614;">
        <strong>${brand.phone}</strong> • <a href="mailto:${brand.reply_to}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.reply_to}</a>
      </p>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #6B7280;">
        ${brand.name}<br/>
        ${brand.website}
      </p>
    </div>
    
  </div>
</body>
</html>
      `,
      
      text: `
HERDING CATS WINE TOURS
${brand.tagline}

Dear ${data.customer_name},

Your reservation for ${data.preferred_date} has been secured. We approach the challenge with appropriate enthusiasm and documented experience managing similar complexities.

RESERVATION PARTICULARS
Reference Number: ${data.reservation_number}
Party Composition: ${data.party_size} individuals of presumably varied preferences
Preferred Date: ${data.preferred_date}
Deposit Secured: $${data.deposit_amount} via ${data.payment_method}

WHAT TO ANTICIPATE

Our senior sommelier-guide will contact you within ${data.consultation_hours} hours to discuss:
- Your group's collective palate preferences (if discernible)
- Individual peculiarities requiring accommodation
- Specific estates you've contemplated visiting
- Dietary restrictions demanding attention

ON PUNCTUALITY

Like our feline namesakes, we appreciate precision. Your confirmation email will specify pickup time and location. Unlike actual cats, we expect punctuality as professional courtesy.

FINANCIAL ARRANGEMENTS

Final remuneration becomes due forty-eight hours following tour conclusion, accurately reflecting service duration, lunch expenditures, and any supplementary arrangements.

${data.payment_method === 'check' ? `
REMITTANCE INSTRUCTIONS
Please forward deposit check ($${data.deposit_amount}) to:
${brand.name}
[Address]
[City, State ZIP]
Reference: ${data.reservation_number}
` : ''}

${brand.closing},

${brand.signature}

P.S. Actual cats herded to date: zero. Metaphorical cats (your party): ${data.party_size}. We've prepared accordingly.

---
${brand.phone} • ${brand.reply_to}
${brand.name} • ${brand.website}
      `
    };
  },
  
  /**
   * NW Touring & Concierge - Professional, corporate
   */
  3: (data: {
    customer_name: string;
    reservation_number: string;
    party_size: number;
    preferred_date: string;
    event_type: string;
    deposit_amount: number;
    payment_method: string;
    consultation_hours: number;
    confirmation_url: string;
  }) => {
    const brand = getBrandEmailConfig(3);
    return {
      subject: `Reservation Confirmed - ${data.reservation_number} | NW Touring & Concierge`,
      
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.secondary_color} 100%); padding: 35px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">NW TOURING & CONCIERGE</h1>
      <p style="color: #bfdbfe; margin: 12px 0 0 0; font-size: 14px;">${brand.tagline}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      
      <p style="font-size: 15px; color: #111827; margin: 0 0 20px 0;">
        Dear ${data.customer_name},
      </p>
      
      <p style="font-size: 15px; color: #111827; margin: 0 0 20px 0; line-height: 1.6;">
        Thank you for choosing NW Touring & Concierge. Your reservation has been confirmed and your deposit of <strong>$${data.deposit_amount}</strong> has been received.
      </p>
      
      <!-- Reservation Summary -->
      <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px; margin: 30px 0;">
        <h2 style="margin: 0 0 18px 0; font-size: 17px; color: #111827; font-weight: 600;">Reservation Summary</h2>
        <table style="width: 100%; font-size: 14px; color: #374151;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; width: 40%;">Confirmation Number:</td>
            <td style="padding: 8px 0;">${data.reservation_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Party Size:</td>
            <td style="padding: 8px 0;">${data.party_size} passengers</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Service Date:</td>
            <td style="padding: 8px 0;">${data.preferred_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Service Type:</td>
            <td style="padding: 8px 0;">${data.event_type.replace('_', ' ').toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Deposit Paid:</td>
            <td style="padding: 8px 0;">$${data.deposit_amount} (${data.payment_method.toUpperCase()})</td>
          </tr>
        </table>
      </div>
      
      <h3 style="font-size: 17px; color: #111827; margin: 30px 0 15px 0; font-weight: 600;">Next Steps</h3>
      
      <div style="margin: 20px 0;">
        <div style="border-left: 3px solid ${brand.primary_color}; padding-left: 15px; margin-bottom: 20px;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #111827; font-weight: 600;">Service Coordination</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Our operations team will contact you within ${data.consultation_hours} hours to finalize service details and confirm your itinerary.</p>
        </div>
        
        <div style="border-left: 3px solid ${brand.primary_color}; padding-left: 15px; margin-bottom: 20px;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #111827; font-weight: 600;">Final Payment</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Balance due 48 hours after service completion to reflect actual time and any additional services requested.</p>
        </div>
        
        <div style="border-left: 3px solid ${brand.primary_color}; padding-left: 15px;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #111827; font-weight: 600;">Service Confirmation</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">You will receive detailed service confirmation 48 hours prior to your scheduled date.</p>
        </div>
      </div>
      
      ${data.payment_method === 'check' ? `
      <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 6px; padding: 20px; margin: 30px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af;">Payment Instructions</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e3a8a;">
          Please remit deposit payment of $${data.deposit_amount} to:
        </p>
        <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 600;">
          ${brand.name}<br/>
          [Business Address]<br/>
          [City, State ZIP]
        </p>
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #6b7280;">
          Reference Number: ${data.reservation_number}
        </p>
      </div>
      ` : ''}
      
      <p style="font-size: 15px; color: #111827; margin: 30px 0 20px 0;">
        ${brand.closing},
      </p>
      
      <p style="font-size: 15px; color: #111827; margin: 0; font-weight: 600;">
        ${brand.signature}
      </p>
      
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
        24/7 Service & Support
      </p>
      <p style="margin: 0; font-size: 14px; color: #111827;">
        <strong>${brand.phone}</strong> • <a href="mailto:${brand.reply_to}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.reply_to}</a>
      </p>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8;">
        ${brand.name}<br/>
        ${brand.website}<br/>
        Licensed & Insured • DOT Compliant
      </p>
    </div>
    
  </div>
</body>
</html>
      `,
      
      text: `
NW TOURING & CONCIERGE
${brand.tagline}

Dear ${data.customer_name},

Thank you for choosing NW Touring & Concierge. Your reservation has been confirmed and your deposit of $${data.deposit_amount} has been received.

RESERVATION SUMMARY
-------------------
Confirmation Number: ${data.reservation_number}
Party Size: ${data.party_size} passengers
Service Date: ${data.preferred_date}
Service Type: ${data.event_type.replace('_', ' ').toUpperCase()}
Deposit Paid: $${data.deposit_amount} (${data.payment_method.toUpperCase()})

NEXT STEPS
----------
• Service Coordination: Our operations team will contact you within ${data.consultation_hours} hours to finalize service details.
• Final Payment: Balance due 48 hours after service completion.
• Service Confirmation: Detailed confirmation sent 48 hours before scheduled date.

${data.payment_method === 'check' ? `
PAYMENT INSTRUCTIONS
-------------------
Please remit deposit payment of $${data.deposit_amount} to:
${brand.name}
[Business Address]
[City, State ZIP]
Reference: ${data.reservation_number}
` : ''}

${brand.closing},

${brand.signature}

---
24/7 Service & Support
${brand.phone} • ${brand.reply_to}
${brand.name} • ${brand.website}
Licensed & Insured • DOT Compliant
      `
    };
  }
};


