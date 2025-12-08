# Quick Reference Card

## 🔗 Development URLs

| Purpose | URL | Notes |
|---------|-----|-------|
| **Homepage** | http://localhost:3002 | Operations portal selector |
| **Admin Portal** | http://localhost:3002/admin/dashboard | Full system management |
| **Driver Portal** | http://localhost:3002/driver-portal/dashboard | Tour management |
| **Business Portal** | http://localhost:3002/contribute | Business submissions |
| **Login Page** | http://localhost:3002/login | Shared login for staff |

## 🔐 Test Credentials

### Admin Account
```
Email: info@wallawalla.travel
Password: admin123
Access: Full system access
```

### Real User Accounts (in database)
```
Admin: madsry@gmail.com
Drivers: 
  - evcritchlow@gmail.com
  - janinebergevin@hotmail.com
  - driver@test.com
Owner: owner@wallawallatravel.com
```

> **⚠️ IMPORTANT:** Test passwords are for development only. Set strong passwords for all real accounts before production. Real user passwords need to be set/reset individually.

## 🛠️ Setup Commands

### First Time Setup
```bash
# Install dependencies
npm install

# Run database migrations
psql -d walla_walla_travel -f migrations/010-authentication-system.sql

# Create test users
node scripts/create-test-users.js

# Start dev server
npm run dev
```

### Daily Development
```bash
# Start dev server
npm run dev

# In another terminal: tail logs
tail -f /tmp/dev-server.log
```

## 📁 Key Files

### Authentication
- `lib/auth/session.ts` - Session management
- `lib/auth/passwords.ts` - Password utilities
- `app/api/auth/login/route.ts` - Login API
- `app/api/auth/logout/route.ts` - Logout API

### Admin Portal
- `app/admin/dashboard/page.tsx` - Main dashboard
- `app/admin/users/page.tsx` - User management
- `app/admin/bookings/page.tsx` - Bookings management
- `components/admin/AdminSidebar.tsx` - Navigation

### Driver Portal
- `app/driver-portal/dashboard/page.tsx` - Driver dashboard
- `components/navigation/ConditionalNav.tsx` - Smart navigation

### Configuration
- `.env` or `.env.local` - Environment variables
- `middleware.ts` - Subdomain routing
- `tailwind.config.ts` - Styling configuration

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `docs/SETUP_GUIDE.md` | Complete setup instructions |
| `docs/DEPLOYMENT.md` | Production deployment guide |
| `docs/IMPLEMENTATION_SUMMARY.md` | What we built today |
| `docs/SUBDOMAIN_SETUP.md` | DNS configuration |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/API_REFERENCE.md` | API documentation |

## 🔍 Common Tasks

### Add a New Admin User
1. Login as existing admin
2. Navigate to **Admin Portal → Users**
3. Click "**+ Add User**"
4. Fill in details and select role
5. Click "**Create User**"

### View Bookings
1. Login as admin
2. Navigate to **Admin Portal → Bookings**
3. View all bookings with filters
4. Click on any booking to view details

### Assign a Driver to a Tour
1. Login as admin
2. Navigate to **Admin Portal → Bookings**
3. Find the booking
4. Click "**View**"
5. Select driver from dropdown
6. Click "**Save**"

### Access Business Submissions
1. Login as admin
2. Navigate to **Admin Portal → Business Portal**
3. Review pending submissions
4. Approve or request changes

## 🐛 Troubleshooting

### Can't Login
- Verify database is running: `pg_isready`
- Check test users exist: `psql -d walla_walla_travel -c "SELECT * FROM users;"`
- Run test user script: `node scripts/create-test-users.js`
- Clear browser cookies and try again

### Port 3000 Already in Use
- Dev server auto-selects next available port (e.g., 3002)
- Check logs: `tail -f /tmp/dev-server.log`
- Manually kill process: `lsof -ti:3000 | xargs kill -9`

### Styles Not Loading
- Ensure `tailwind.config.ts` exists
- Restart dev server: `npm run dev`
- Clear cache: `rm -rf .next && npm run dev`

### Database Connection Error
- Check `DATABASE_URL` in `.env` or `.env.local`
- Verify PostgreSQL is running
- Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

## 🚀 Production Checklist

Before deploying to production:

- [ ] Import repository to Vercel (vercel.com/new)
- [ ] Configure environment variables in Vercel dashboard
- [ ] Generate strong `JWT_SECRET` (32+ characters)
- [ ] Generate strong `SESSION_SECRET` (32+ characters)
- [ ] Generate strong `CSRF_SECRET` (32+ characters)
- [ ] Use production Stripe keys
- [ ] Verify domain with Resend for emails
- [ ] Configure custom domain in Vercel
- [ ] Configure subdomains (staff/driver/business.wallawalla.travel)
- [ ] Create real admin user (strong password)
- [ ] Delete test users
- [ ] Run all database migrations
- [ ] Test login flow
- [ ] Test booking creation
- [ ] Test email sending
- [ ] Verify HTTPS enabled (automatic on Vercel)
- [ ] Set up monitoring (Vercel Analytics, optional Sentry)

See `docs/DEPLOYMENT.md` for complete deployment guide.

## 🎯 User Roles & Access

| Role | Access |
|------|--------|
| **Admin** | Full system access - manage bookings, users, settings, business portal, financial |
| **Driver** | Driver portal only - view tours, inspections, time clock |
| **Public** | Booking flows, corporate requests, business portal submission |

## 📞 Support

- **Documentation:** Check `/docs` folder
- **Setup Issues:** See `docs/SETUP_GUIDE.md`
- **Deployment:** See `docs/DEPLOYMENT.md`
- **Architecture:** See `docs/ARCHITECTURE.md`

---

**Server Currently Running:** http://localhost:3002 (port may vary)

**Last Updated:** November 13, 2025

