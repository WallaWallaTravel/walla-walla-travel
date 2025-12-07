# 🎨 Multi-Brand System Implementation Guide
**Walla Walla Travel Portfolio**

---

## 📊 **SYSTEM OVERVIEW**

### **Three Brands, One Operation:**

| Brand | Target | Vibe | Domain | Email |
|-------|--------|------|--------|-------|
| **Walla Walla Travel** | Premium/Concierge | Sophisticated, full-service | wallawalla.travel | concierge@wallawalla.travel |
| **Herding Cats Wine Tours** | Leisure/Fun | Playful, casual, memorable | herdingcatswine.com | tours@hctours.com |
| **NW Touring & Concierge** | Corporate/Professional | Polished, reliable, executive | nwtouring.com | bookings@nwtouring.com |

**All Tours Operated By:** NW Touring & Concierge LLC  
**Insurance:** Under NW Touring & Concierge LLC  
**Same:** Drivers, vehicles, availability, Ryan  
**Different:** Customer-facing brand, messaging, perceived positioning

---

## ✅ **COMPLETED (Nov 12, 2025)**

### **Database Foundation:**
- ✅ Created `brands` table with 3 brands seeded
- ✅ Added `brand_id` to bookings, reservations, proposals
- ✅ Created brand metrics tracking
- ✅ Created brand email templates table
- ✅ Created brand service utilities (`lib/brands/brand-service.ts`)

---

## 🚧 **IMPLEMENTATION ROADMAP**

### **PHASE 1: Core Brand Integration (Week 1)**

#### **1.1 Update Booking Flow**
**File:** `app/book/reserve/page.tsx`

**Changes Needed:**
```typescript
// Add brand detection from URL
import { useSearchParams } from 'next/navigation';
import { resolveBrand } from '@/lib/brands/brand-service';

export default function ReserveRefinePage() {
  const searchParams = useSearchParams();
  const brandCode = searchParams.get('brand'); // ?brand=HCWT
  
  const [brand, setBrand] = useState<Brand | null>(null);
  
  // Load brand on mount
  useEffect(() => {
    async function loadBrand() {
      const resolvedBrand = await resolveBrand(brandCode);
      setBrand(resolvedBrand);
    }
    loadBrand();
  }, [brandCode]);
  
  // Add brand_code to form submission
  const formData = {
    ...existingFormData,
    brand_code: brand?.brand_code || 'WWT'
  };
}
```

**Testing:**
- `http://localhost:3000/book/reserve` → Defaults to WWT
- `http://localhost:3000/book/reserve?brand=HCWT` → Herding Cats branding
- `http://localhost:3000/book/reserve?brand=NWTC` → NW Touring branding

---

#### **1.2 Update API Endpoint**
**File:** `app/api/booking/reserve/route.ts`

**Changes Needed:**
```typescript
interface ReserveRequest {
  // ... existing fields ...
  brand_code?: string; // NEW: Accept brand code
}

export async function POST(request: NextRequest) {
  const data: ReserveRequest = await request.json();
  
  // Resolve brand
  const brand = await resolveBrand(data.brand_code);
  
  // Create reservation with brand
  const reservation = await query(
    `INSERT INTO reservations (
      ...,
      brand_id,
      brand_code,
      ...
    ) VALUES (..., $1, $2, ...)`,
    [..., brand.id, brand.brand_code, ...]
  );
  
  // Send brand-specific confirmation email
  await sendBrandedConfirmation(brand, reservationData, customerEmail);
}
```

---

#### **1.3 Create Brand-Specific Email Service**
**File:** `lib/email/branded-emails.ts`

```typescript
import { resolveBrand, getBrandContact } from '@/lib/brands/brand-service';
import { Resend } from 'resend';

export async function sendBrandedReservationConfirmation(
  brandCode: string,
  reservationData: any,
  customerEmail: string
) {
  const brand = await resolveBrand(brandCode);
  const contact = getBrandContact(brand);
  
  const subject = getBrandSubject(brand, 'reservation');
  const html = getBrandTemplate(brand, 'reservation', reservationData);
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: contact.emailFrom,
    to: customerEmail,
    subject: subject,
    html: html
  });
}

function getBrandSubject(brand: Brand, type: 'reservation' | 'booking') {
  switch(brand.brand_code) {
    case 'HCWT':
      return type === 'reservation' 
        ? '🐱🍷 Your Wine Tour is Reserved!' 
        : '🐱🍷 Your Wine Tour is Confirmed!';
    
    case 'NWTC':
      return type === 'reservation'
        ? 'Reservation Confirmed - NW Touring & Concierge'
        : 'Booking Confirmed - NW Touring & Concierge';
    
    case 'WWT':
    default:
      return type === 'reservation'
        ? 'Your Walla Walla Experience Awaits ✨'
        : 'Your Walla Walla Tour is Confirmed ✨';
  }
}

function getBrandTemplate(brand: Brand, type: string, data: any) {
  // Load brand-specific HTML template
  // Include brand colors, logo, messaging
  // See templates below
}
```

---

### **PHASE 2: Website Updates (Week 2)**

#### **2.1 Update WWT Homepage**
**File:** `app/page.tsx` (if exists) or create

**Add Partner Section:**
```tsx
<section className="py-16 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-4">
      Book with Walla Walla Travel
    </h2>
    <p className="text-center text-gray-600 mb-12">
      Or explore our partner brands for different experiences
    </p>
    
    <div className="grid md:grid-cols-3 gap-8">
      {/* WWT Card */}
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h3 className="text-2xl font-bold mb-2">Walla Walla Travel</h3>
        <p className="text-sm text-gray-600 mb-4">
          Full-service wine country concierge
        </p>
        <p className="mb-6">
          We handle every detail - wineries, lunch, reservations.
          You just show up and enjoy.
        </p>
        <Link 
          href="/book?brand=WWT"
          className="btn btn-primary"
        >
          Book Now →
        </Link>
      </div>
      
      {/* Herding Cats Card */}
      <div className="bg-white p-8 rounded-lg shadow-md border-2 border-purple-300">
        <h3 className="text-2xl font-bold mb-2 text-purple-700">
          Herding Cats Wine Tours
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Fun, casual wine country tours
        </p>
        <p className="mb-6">
          Great wineries, awesome guides, unforgettable memories.
          No corporate stiffness here! 🐱🍷
        </p>
        <a 
          href="https://herdingcatswine.com"
          target="_blank"
          className="btn btn-secondary"
        >
          Visit Site →
        </a>
      </div>
      
      {/* NW Touring Card */}
      <div className="bg-white p-8 rounded-lg shadow-md border-2 border-blue-900">
        <h3 className="text-2xl font-bold mb-2 text-blue-900">
          NW Touring & Concierge
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Professional corporate transportation
        </p>
        <p className="mb-6">
          Reliable, polished, perfectly coordinated service
          for business groups and events.
        </p>
        <a 
          href="https://nwtouring.com"
          target="_blank"
          className="btn btn-secondary"
        >
          Visit Site →
        </a>
      </div>
    </div>
  </div>
</section>
```

---

#### **2.2 Update /book Landing Page**
**File:** `app/book/page.tsx`

**Add Brand Context:**
```tsx
export default function BookPage() {
  const searchParams = useSearchParams();
  const brandCode = searchParams.get('brand');
  const [brand, setBrand] = useState<Brand | null>(null);
  
  useEffect(() => {
    async function loadBrand() {
      const resolvedBrand = await resolveBrand(brandCode);
      setBrand(resolvedBrand);
    }
    loadBrand();
  }, [brandCode]);
  
  // Update page title/branding based on brand
  const pageTitle = brand?.brand_code === 'HCWT' 
    ? 'Book Your Herding Cats Wine Tour'
    : brand?.brand_code === 'NWTC'
    ? 'Request Corporate Transportation'
    : 'Book Your Wine Country Experience';
  
  // Pass brand to Reserve & Refine button
  <Link href={`/book/reserve?brand=${brand?.brand_code}`}>
    Reserve Your Date →
  </Link>
}
```

---

### **PHASE 3: Separate Brand Sites (Week 3-4)**

#### **3.1 Herding Cats Site**
**Domain:** herdingcatswine.com (or hctours.com)

**Hosting Options:**
1. **Subdomain approach:** `herding-cats.wallawalla.travel`
2. **Separate Next.js app** (recommended for SEO)
3. **Same app, different domain routing** (simplest)

**Option 3 Implementation (Recommended):**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host');
  
  // Brand detection by domain
  if (hostname?.includes('herdingcats') || hostname?.includes('hctours')) {
    // Herding Cats site
    const url = request.nextUrl.clone();
    url.searchParams.set('brand', 'HCWT');
    return NextResponse.rewrite(url);
  }
  
  if (hostname?.includes('nwtouring')) {
    // NW Touring site
    const url = request.nextUrl.clone();
    url.searchParams.set('brand', 'NWTC');
    return NextResponse.rewrite(url);
  }
  
  // Default: Walla Walla Travel
  return NextResponse.next();
}
```

**Simple Landing Pages:**
```
app/
├── (brands)/
│   ├── herding-cats/
│   │   └── page.tsx     # Herding Cats homepage
│   ├── nw-touring/
│   │   └── page.tsx     # NW Touring homepage
│   └── layout.tsx       # Brand-specific layout
```

---

### **PHASE 4: Terms & Legal (Week 4)**

#### **4.1 Update Terms & Conditions**
**File:** `app/terms/page.tsx`

**Add Section:**
```markdown
## Service Providers

Walla Walla Travel acts as a booking platform and concierge service.
Transportation services are provided by our licensed and insured partners,
including NW Touring & Concierge LLC.

All partner operators are:
- Fully licensed by Washington State UTC
- Commercially insured
- Background-checked and trained
- Hand-selected for exceptional service

When you book through Walla Walla Travel, you'll be informed which
partner will be providing your tour. All our partners maintain the
same high standards of safety, professionalism, and service excellence.
```

#### **4.2 Brand-Specific Terms**
Each brand can reference:
- **Operating Entity:** NW Touring & Concierge LLC
- **License:** UTC License #[number]
- **Insurance:** Commercial Auto Insurance Policy
- **Contact:** (509) 200-8000, info@[brand domain]

---

## 📧 **EMAIL TEMPLATES**

### **Herding Cats Reservation Confirmation:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .header { background: linear-gradient(135deg, #9B59B6 0%, #E67E22 100%); }
    .button { background: #9B59B6; }
  </style>
</head>
<body>
  <div class="header" style="padding: 40px; text-align: center;">
    <h1 style="color: white; font-size: 32px;">
      🐱🍷 Your Wine Tour is Reserved!
    </h1>
  </div>
  
  <div style="padding: 40px; max-width: 600px; margin: 0 auto;">
    <p>Hey {{customer_name}}!</p>
    
    <p>Awesome news - your Herding Cats wine tour is locked in! 🎉</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <strong>📅 DATE:</strong> {{preferred_date}}<br>
      <strong>👥 GROUP:</strong> {{party_size}} wine lovers<br>
      <strong>🎫 RESERVATION:</strong> {{reservation_number}}
    </div>
    
    <h2>What's Next?</h2>
    <p>
      Ryan will call you within 24 hours to plan your perfect winery lineup.
      Bring your preferences, questions, and excitement!
    </p>
    
    <p style="margin-top: 40px;">
      Can't wait to herd your cats through wine country! 🐱🍷
    </p>
    
    <p>
      Cheers,<br>
      <strong>The Herding Cats Team</strong><br>
      (509) 200-8000 | tours@hctours.com
    </p>
  </div>
</body>
</html>
```

### **NW Touring Reservation Confirmation:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .header { background: #1A1F3A; }
    .button { background: #1A1F3A; }
  </style>
</head>
<body>
  <div class="header" style="padding: 40px; text-align: center;">
    <h1 style="color: white; font-size: 28px;">
      Reservation Confirmed
    </h1>
    <p style="color: #ccc;">NW Touring & Concierge</p>
  </div>
  
  <div style="padding: 40px; max-width: 600px; margin: 0 auto;">
    <p>Dear {{customer_name}},</p>
    
    <p>Your corporate wine country transportation has been confirmed.</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <strong>Date:</strong> {{preferred_date}}<br>
      <strong>Party Size:</strong> {{party_size}} guests<br>
      <strong>Reference:</strong> {{reservation_number}}
    </div>
    
    <h3>Next Steps</h3>
    <p>
      Our team will contact you within 24 hours to coordinate logistics
      and finalize your itinerary.
    </p>
    
    <p style="margin-top: 40px;">
      Thank you for choosing NW Touring & Concierge.
    </p>
    
    <p>
      Professional Regards,<br>
      <strong>NW Touring & Concierge</strong><br>
      (509) 200-8000 | bookings@nwtouring.com
    </p>
  </div>
</body>
</html>
```

---

## 🎨 **BRAND VISUAL IDENTITY**

### **Color Palettes:**

**Herding Cats:**
- Primary: `#9B59B6` (Playful purple)
- Secondary: `#E67E22` (Orange accent)
- Accent: `#F39C12` (Gold)

**NW Touring:**
- Primary: `#1A1F3A` (Deep navy)
- Secondary: `#2C3E50` (Charcoal)
- Accent: `#3498DB` (Professional blue)

**Walla Walla Travel:**
- Primary: `#8B2E3E` (Wine red)
- Secondary: `#D4AF37` (Gold)
- Accent: `#4A5568` (Slate gray)

---

## 🧪 **TESTING CHECKLIST**

### **Multi-Brand Flow Testing:**

- [ ] Book via WWT → Receives WWT-branded confirmation
- [ ] Book via `?brand=HCWT` → Receives Herding Cats confirmation
- [ ] Book via `?brand=NWTC` → Receives NW Touring confirmation
- [ ] Database stores correct `brand_id` and `brand_code`
- [ ] Confirmation emails use correct sender address
- [ ] Confirmation emails use correct phone number
- [ ] Terms & Conditions reflect partner model
- [ ] Admin dashboard shows brand for each reservation
- [ ] Brand metrics are tracked correctly

---

## 📊 **ANALYTICS & TRACKING**

### **Key Metrics to Monitor:**

**Per Brand:**
- Website visits
- Booking page visits
- Reservations created
- Conversion rate
- Average booking value
- Customer demographics

**Cross-Brand Analysis:**
- Which brand converts best?
- Which brand has highest average value?
- Do customers comparison shop?
- Brand preference by customer type

**Queries:**
```sql
-- Brand performance comparison
SELECT 
  brand_name,
  total_reservations,
  total_bookings,
  total_revenue,
  avg_booking_value,
  unique_customers
FROM brand_statistics
ORDER BY total_revenue DESC;

-- Today's activity by brand
SELECT 
  b.brand_name,
  COUNT(*) as reservations_today
FROM reservations r
JOIN brands b ON b.id = r.brand_id
WHERE r.created_at::date = CURRENT_DATE
GROUP BY b.brand_name;
```

---

## 🚀 **GO-LIVE CHECKLIST**

### **Before Launch:**
- [ ] All 3 brands seeded in database
- [ ] Brand service tested
- [ ] Booking flow accepts brand parameter
- [ ] API stores brand correctly
- [ ] Email templates created for all brands
- [ ] Terms updated with partner disclosure
- [ ] WWT homepage updated with partner section
- [ ] Domain routing configured (if using separate domains)
- [ ] Brand metrics tracking enabled
- [ ] Test bookings completed for each brand
- [ ] Vehicle magnets ordered for Herding Cats

### **Launch Day:**
- [ ] Monitor error logs
- [ ] Track conversion by brand
- [ ] Verify emails sending correctly
- [ ] Check brand attribution in admin dashboard

---

## 🔧 **ADMIN TOOLS NEEDED**

### **Brand Management Dashboard:**
```
/admin/brands
├─ View all brands
├─ Edit brand details (colors, contact info)
├─ View brand performance metrics
├─ Manage email templates per brand
└─ Enable/disable brands
```

### **Booking Admin:**
```
/admin/reservations
└─ Show brand badge/indicator for each reservation
└─ Filter by brand
└─ Export by brand for accounting
```

---

## 💡 **FUTURE ENHANCEMENTS**

### **Phase 5: Advanced Features**
1. **Brand-specific landing pages** with unique content/SEO
2. **A/B testing** different messaging by brand
3. **Dynamic pricing** by brand (charge more for WWT concierge)
4. **Brand loyalty program** (repeat customers get discount)
5. **Referral tracking** (which brand brings most referrals?)
6. **Google Business listings** for each brand
7. **Social media** accounts for each brand
8. **Review management** separate by brand

---

**END OF IMPLEMENTATION GUIDE**

*Created: November 12, 2025*  
*Status: Phase 1 Ready to Implement*


