# Business Glossary

## Quick Reference for Walla Walla Travel Ecosystem

### Business Entities

| Term | Definition |
|------|------------|
| **WWT** | Walla Walla Travel - the DMC (Destination Management Company) |
| **NWT&C** | NW Touring & Concierge - the transportation partner (separate business) |
| **DMC** | Destination Management Company - plans and coordinates travel experiences |
| **Motor Carrier** | Company licensed to transport passengers for hire |

### Regulatory Terms

| Term | Definition |
|------|------------|
| **FMCSA** | Federal Motor Carrier Safety Administration - federal regulator |
| **UTC** | Washington Utilities and Transportation Commission - state regulator |
| **USDOT** | US Department of Transportation - federal agency |
| **MC Number** | Motor Carrier number - operating authority identifier |
| **CDL** | Commercial Driver's License |
| **DQ File** | Driver Qualification File - required documents for each driver |
| **DVIR** | Driver Vehicle Inspection Report - pre/post-trip inspection form |
| **HOS** | Hours of Service - driving and duty time limits |
| **MVR** | Motor Vehicle Record - driving history from state DMV |

### Booking Terms

| Term | Definition |
|------|------------|
| **Tour** | Scheduled wine tour experience with transportation |
| **Booking** | Customer reservation for a tour |
| **Availability** | Open slots for a given date/tour type |
| **Capacity** | Maximum guests per vehicle/tour |
| **Lead Guest** | Primary contact for a booking |

### Winery Terms

| Term | Definition |
|------|------------|
| **Tasting Room** | Winery's visitor-facing facility |
| **Appointment** | Pre-scheduled winery visit (some wineries require) |
| **Walk-in** | Winery that accepts visitors without appointment |
| **AVA** | American Viticultural Area - designated wine region |
| **Walla Walla Valley AVA** | The local wine region designation |

### Technical Terms

| Term | Definition |
|------|------------|
| **Portal** | User-facing web application (4 portals in ecosystem) |
| **RLS** | Row-Level Security - Supabase data isolation feature |
| **Operator** | Motor carrier company in Auditor's Dream context |

### Products in Ecosystem

| Product | Purpose |
|---------|---------|
| **Walla Walla Travel** | Public booking site + winery directory |
| **Auditor's Dream** | FMCSA/DOT compliance management |
| **Driver Portal** | Tour execution, DVIRs, time tracking |
| **Admin Dashboard** | Staff booking management |

### Data Relationships

```
profiles → users (all apps)
operators → motor carriers (Auditor's Dream)
drivers → work for operators, drive tours
vehicles → belong to operators, used for tours
bookings → customer reservations (WWT)
driver_inspections → DVIRs linked to bookings
```

### Status Values

**Booking Status:**
- `pending` - Awaiting confirmation
- `confirmed` - Booking confirmed
- `completed` - Tour finished
- `cancelled` - Booking cancelled

**Compliance Status:**
- `compliant` - All requirements met
- `expiring` - Requirements expiring soon
- `non_compliant` - Requirements not met

---

**Usage**: Reference this glossary when implementing features or writing documentation to ensure consistent terminology.
