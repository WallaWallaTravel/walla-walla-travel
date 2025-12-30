# Auditor's Dream

FMCSA/DOT Compliance Management System for Motor Carriers.

## Overview

Auditor's Dream is a standalone compliance management application that helps motor carriers:
- Track driver qualification files (DQ files)
- Monitor vehicle compliance (registrations, insurance, inspections)
- Prepare for regulatory audits
- Integrate with Walla Walla Travel for real-time compliance enforcement

## Architecture

This is a Turborepo monorepo with:

```
auditors-dream/
├── apps/
│   ├── operator/       # Operator Portal (motor carrier users)
│   └── regulator/      # Regulator Portal (future - for auditors)
└── packages/
    ├── database/       # Supabase migrations
    └── ui/             # Shared UI components
```

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS
- **Monorepo**: Turborepo

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- Access to Supabase project

### Setup

1. Install dependencies:
   ```bash
   cd auditors-dream
   npm install
   ```

2. Configure environment:
   ```bash
   cd apps/operator
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. Start development server:
   ```bash
   npm run dev:operator
   ```

4. Open http://localhost:5173

## Integration with Walla Walla Travel

Auditor's Dream shares a Supabase backend with Walla Walla Travel:

- **Shared Tables**: `operators`, `drivers`, `vehicles`, `compliance_status`
- **Linking Fields**:
  - `drivers.walla_walla_user_id` links to WWT users
  - `vehicles.walla_walla_vehicle_id` links to WWT vehicles
- **Compliance Enforcement**: WWT uses the compliance service to block non-compliant operations

## Supabase Setup

1. Run the migration in Supabase SQL Editor:
   - `/migrations/050-supabase-unified-schema.sql`

2. Create storage bucket: `compliance-documents`

3. Create a test user and link to operator

## Features

### Operator Portal
- **Dashboard**: Compliance score and status overview
- **Drivers**: Manage DQ files and compliance tracking
- **Vehicles**: Fleet compliance and maintenance records
- **Requirements**: View FMCSA/UTC requirements
- **Self-Audit**: Pre-audit compliance checklist

### Coming Soon
- Document upload and storage
- Expiration notifications
- Audit report generation
- Regulator portal
