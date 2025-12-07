# System Architecture

## Tech Stack
- Next.js 14 with App Router
- TypeScript for type safety
- Supabase for auth & database
- Tailwind for styling
- Railway for deployment

## Directory Structure
travel-suite/
├── app/
│   ├── layout.tsx        // Root layout (has Supabase)
│   ├── page.tsx          // Home page
│   ├── auth/             // Auth pages (login/signup)
│   └── features/         // ALL BUSINESS LOGIC HERE
│       ├── bookings/     // Booking system
│       ├── wine-tours/   // Wine tour module
│       ├── transport/    // Transportation module
│       └── directory/    // Business directory with RAG
├── lib/
│   ├── supabase.ts      // Supabase client (NEVER MODIFY)
│   └── database.types.ts // Generated types
└── .ai-context/          // AI instructions

## Module Boundaries
Each module in /app/features/ is independent:
- Has its own page.tsx
- Has its own components/
- Cannot import from other modules
- Communicates via Supabase database only