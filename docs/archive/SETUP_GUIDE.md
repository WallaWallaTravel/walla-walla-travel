# Setup Guide

## Quick Start (Development)

### 1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- A code editor (VS Code recommended)

### 2. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd walla-walla-final

# Install dependencies
npm install
```

### 3. Environment Setup

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/walla_walla_travel

# Authentication (CHANGE IN PRODUCTION!)
SESSION_SECRET=your-super-secret-key-minimum-32-characters-long-change-in-production

# Stripe (use test keys for development)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key

# OpenAI (optional - for AI features)
OPENAI_API_KEY=sk-your_openai_api_key

# Environment
NODE_ENV=development
```

### 4. Database Setup

Run the migrations:

```bash
# Create database (if not exists)
createdb walla_walla_travel

# Run migrations
psql -d walla_walla_travel -f migrations/001-initial-schema.sql
psql -d walla_walla_travel -f migrations/002-brands-system.sql
psql -d walla_walla_travel -f migrations/010-authentication-system.sql
# ... (run all migrations in order)
```

Or run them all at once:

```bash
for file in migrations/*.sql; do
  echo "Running $file..."
  psql -d walla_walla_travel -f "$file"
done
```

### 5. Create Test Users

```bash
node scripts/create-test-users.js
```

This will create:
- **Admin**: admin@wallawalla.travel / admin123
- **Driver**: driver@wallawalla.travel / driver123

### 6. Start Development Server

```bash
npm run dev
```

The app will be available at:
- Main portal: http://localhost:3000
- Admin: http://localhost:3000/admin/dashboard
- Driver: http://localhost:3000/driver-portal/dashboard
- Business Portal: http://localhost:3000/contribute

### 7. Login

Navigate to http://localhost:3000/login and use the test credentials above.

---

## Application Structure

### User Roles

The system has two main user roles:

1. **Admin**
   - Full system access
   - Manage bookings, users, settings
   - Access to business portal submissions
   - Financial oversight

2. **Driver**
   - View assigned tours
   - Update tour status
   - Access inspections and workflows
   - Limited to driver-specific features

### Main Areas

#### 1. Admin Portal (`/admin/`)
- Dashboard with key metrics
- User management
- Bookings and reservations management
- Business portal review
- System settings

#### 2. Driver Portal (`/driver-portal/`)
- Daily tour dashboard
- Tour details and itineraries
- Vehicle inspections
- Time clock (HOS tracking)

#### 3. Business Portal (`/contribute/`)
- For local businesses to submit their information
- Guided questionnaire
- File uploads (menus, photos)
- Progress tracking

#### 4. Public Routes
- Corporate requests (`/corporate-request`)
- Booking flow (`/book`)
- Brand landing pages (`/herding-cats`, `/nw-touring`)

---

## Subdomain Routing (Production)

The application uses subdomain-based routing for better UX:

| Subdomain | Redirects To | Purpose |
|-----------|--------------|---------|
| `wallawalla.travel` | `/` (homepage) | Main operations portal selector |
| `business.wallawalla.travel` | `/contribute` | Business submissions |
| `drivers.wallawalla.travel` | `/driver-portal/dashboard` | Driver dashboard |
| `admin.wallawalla.travel` | `/admin/dashboard` | Admin dashboard |

See `docs/SUBDOMAIN_SETUP.md` for production DNS configuration.

---

## Testing

### Manual Testing

1. **Test Admin Login**
   ```
   Email: admin@wallawalla.travel
   Password: admin123
   ```
   - Should redirect to `/admin/dashboard`
   - Verify sidebar navigation works
   - Check dashboard stats display correctly

2. **Test Driver Login**
   ```
   Email: driver@wallawalla.travel
   Password: driver123
   ```
   - Should redirect to `/driver-portal/dashboard`
   - Verify bottom navigation works
   - Check tour list (will be empty initially)

3. **Test Business Portal**
   - Navigate to `/contribute`
   - Enter access code (or create one in admin panel)
   - Fill out questionnaire
   - Upload test files

### Automated Tests (Coming Soon)

```bash
npm test
```

---

## Common Issues

### Database Connection Fails
- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` in `.env`
- Ensure database exists: `psql -l | grep walla_walla_travel`

### Session/Login Not Working
- Verify `SESSION_SECRET` is set in `.env`
- Clear cookies and try again
- Check browser console for errors

### Styles Not Loading
- Ensure `tailwind.config.ts` exists
- Restart dev server: `npm run dev`
- Clear Next.js cache: `rm -rf .next && npm run dev`

### Port 3000 Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

---

## Next Steps

1. **Customize Branding**
   - Update logos in `public/`
   - Modify colors in `app/globals.css`
   - Edit brand configurations in `lib/brands/`

2. **Configure Integrations**
   - Set up Stripe account (production keys)
   - Configure Resend for email (verify domain)
   - Add OpenAI API key for AI features

3. **Add Sample Data**
   - Create test bookings
   - Add wineries and restaurants
   - Upload sample photos

4. **Production Deployment**
   - See `docs/DEPLOYMENT.md`
   - Configure subdomains
   - Set production environment variables

---

## Support

For issues or questions:
- Check the docs in `/docs`
- Review the code comments
- Contact the development team

