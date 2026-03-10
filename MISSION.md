# MISSION.md — Walla Walla Travel

> Read this before every task. This is why we build.

---

## What WWT Is

Walla Walla Travel is the premier destination management company and travel resource for the Walla Walla Valley. We provide comprehensive planning and logistics for wine tours, corporate retreats, events, and private travel — coordinating every detail so visitors experience the best of what this valley has to offer.

WWT is also building the most comprehensive events resource in the valley through WallaWallaEvents.com — a discovery platform that serves visitors planning trips and locals looking for things to do.

## Who We Serve

**Visitors & Guests** — People coming to Walla Walla for wine, food, golf, events, and experiences. They need to find things to do, book tours, pay deposits, view itineraries, and order lunches. Their experience with WWT should feel premium, effortless, and trustworthy.

**Partners** — Wineries, restaurants, hotels, venues, and event coordinators who work with WWT. They receive booking requests, respond to scheduling inquiries, list events, and manage their profiles. Their experience should be frictionless — no training needed, no accounts to remember, one-click responses.

**Drivers** — The people who make the tours happen. They need to clock in, view their itinerary, complete inspections, and manage documents. Their tools must work reliably on a phone at 7am in a parking lot.

**Ryan (operator)** — One person running the entire business. Every admin tool must be fast, intuitive, and reliable enough to use while on the phone with a customer. If a form breaks during a booking call, the business loses real money.

## What Matters Most

### Reliability over features.
A working booking form is worth more than ten half-built features. Every interaction must work the first time, every time. No generic error messages. No forms that compile but fail with real data. No "it works in development but breaks in production."

### Simplicity over flexibility.
One way to do each thing, not five. One auth system, not five. One form pattern, not a dozen variations. Ryan maintains this with AI assistance — every additional pattern is a maintenance burden.

### Real-world usability over technical elegance.
The test is not "does the code compile" — it's "can Ryan create a booking while a customer is on the phone at 7am." If a workflow takes more than 3 clicks to accomplish something that should take 1, it's wrong.

### Professional appearance.
WWT represents premium Walla Walla wine country experiences. The public site, guest portal, partner communications, and event listings must reflect that quality. Consistent typography, warm color palettes, polished interactions.

## Design Principles

**For Ryan (admin):**
- Every form works on the first try with real data
- Error messages tell you exactly what's wrong and how to fix it
- Common tasks (create booking, build itinerary, assign driver) are reachable in 2 clicks or less
- The dashboard shows what needs attention right now — with direct links, not dead-end labels
- Quick Create exists for everything — not every booking needs a full proposal workflow

**For Partners:**
- No login required for responding to booking requests — the token IS the auth
- One-click responses that take 10 seconds, not 10 minutes
- Event submission is simpler than posting to Facebook
- Communications land in the right place automatically

**For Guests:**
- Magic links, not passwords — enter email, click link, you're in
- Registration + deposit payment in one smooth flow
- Live itinerary that's always up to date
- Lunch ordering with clear deadlines and simple choices

**For Drivers:**
- Clock in/out works on a phone with one tap
- Today's itinerary shows every stop, not just wineries
- Inspection forms are fast and don't lose data
- Document upload with clear expiration warnings

## Technical North Star

**Type-safe everything.** Prisma for database queries. Zod for validation. TypeScript strict mode. If something can be wrong, the compiler should catch it — not the user.

**One pattern for each thing.**
- Database: Prisma (not raw SQL)
- Auth: JWT via getSession() (not Auth.js)
- Mutations: Server Actions (not fetch + CSRF)
- Forms: Server Actions + useActionState + Zod (not ad-hoc validation)
- API calls: Server Actions (not raw fetch)
- Styling: Tailwind (not inline styles)

**Compile-time catches over runtime surprises.** A bug caught by TypeScript during development costs zero. A bug caught by a user during a booking call costs a customer.

**Test with real data, not just real types.** "Build passes" is necessary but not sufficient. Every form must be tested by submitting realistic data and verifying the result in the database.

## The Valley

Walla Walla is a special place. 130+ wineries, world-class restaurants, the Blue Mountains, hot air balloons, historic downtown, and a community that welcomes visitors like family. WWT exists to make sure every visitor experiences the best of it — seamlessly, memorably, and without logistical stress.

Everything we build serves that mission.
