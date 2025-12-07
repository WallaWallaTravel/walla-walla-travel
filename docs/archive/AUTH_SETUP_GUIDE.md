# Authentication Setup Guide

Quick setup guide for getting authentication running.

---

## Step 1: Install Dependencies

```bash
npm install
```

Dependencies installed:
- `bcryptjs` - Password hashing
- `jose` - JWT token management
- `zod` - Input validation
- `@types/bcryptjs` - TypeScript types

---

## Step 2: Set Environment Variables

Add to your `.env` file:

```bash
# Session Secret (CHANGE THIS IN PRODUCTION!)
SESSION_SECRET=your-super-secret-key-minimum-32-characters-long

# Database (should already be set)
DATABASE_URL=postgresql://user:password@localhost:5432/walla_walla_travel
```

**⚠️ Important**: The `SESSION_SECRET` should be a strong random string, at least 32 characters.

Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 3: Run Authentication Migration

```bash
psql $DATABASE_URL -f migrations/add-authentication-system.sql
```

This will:
- Add authentication columns to `users` table
- Create `user_activity_logs` table
- Add necessary indexes

---

## Step 4: Create Test Users

```bash
npx tsx scripts/create-test-users.ts
```

This creates two test users:

### Admin User
- **Email**: `admin@wallawalla.travel`
- **Password**: `Admin123!`
- **Access**: Full admin dashboard

### Driver User
- **Email**: `driver@wallawalla.travel`
- **Password**: `Driver123!`
- **Access**: Driver portal only

---

## Step 5: Test the System

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Visit login page**:
   http://localhost:3000/login

3. **Test admin login**:
   - Email: `admin@wallawalla.travel`
   - Password: `Admin123!`
   - Should redirect to: http://localhost:3000/admin/dashboard

4. **Test driver login**:
   - Email: `driver@wallawalla.travel`
   - Password: `Driver123!`
   - Should redirect to: http://localhost:3000/driver-portal/unified-dashboard

5. **Test route protection**:
   - Try visiting `/admin` without logging in → should redirect to login
   - Log in as driver, try to visit `/admin` → should be forbidden
   - Log in as admin, access granted everywhere ✅

---

## Troubleshooting

### "Session secret not configured" error
- Make sure `SESSION_SECRET` is set in `.env`
- Restart the dev server after adding it

### "Database connection failed"
- Check `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Verify database exists

### "User not found" after login
- Run the test users script again
- Check users table: `SELECT * FROM users;`

### Can't access admin routes
- Verify you're logged in with an admin account
- Check browser dev tools → Application → Cookies
- Look for `ww_session` cookie

### Middleware not protecting routes
- Check middleware.ts is exporting async function
- Verify config.matcher includes your routes
- Restart dev server

---

## What's Protected?

### ✅ Protected Routes (Login Required)
- `/admin/*` - Admin dashboard (admin role only)
- `/driver-portal/*` - Driver dashboard (driver role only)
- `/workflow/*` - Driver workflows
- `/inspections/*` - Vehicle inspections
- `/time-clock/*` - Time tracking
- `/calendar/*` - Schedule management
- `/bookings/new/*` - Create bookings

### ✅ Public Routes (No Login)
- `/` - Homepage
- `/login` - Login page
- `/contribute/*` - Business portal
- `/book/*` - Customer booking widget
- `/corporate-request` - Corporate inquiry form
- All API routes except protected ones

---

## Creating Additional Users

### Via Script (Recommended)
Modify `scripts/create-test-users.ts` to add more users, then run it.

### Via SQL
```sql
-- Hash password first using bcrypt (do this in your app or script)
-- Then insert:
INSERT INTO users (email, name, password_hash, role, is_active)
VALUES (
  'newuser@example.com',
  'New User',
  '$2a$12$...', -- bcrypt hash
  'driver', -- or 'admin'
  true
);
```

### Via Admin UI (Future)
Will add user management in admin dashboard.

---

## Next Steps

1. ✅ Authentication system is now running
2. ⏭️ Build out admin dashboard pages
3. ⏭️ Add user management UI
4. ⏭️ Implement password reset flow
5. ⏭️ Add two-factor authentication (optional)

---

## Security Checklist

- [ ] Change `SESSION_SECRET` to random string
- [ ] Change test user passwords
- [ ] Enable HTTPS in production
- [ ] Set up rate limiting on login endpoint
- [ ] Monitor `user_activity_logs` for suspicious activity
- [ ] Implement password reset flow
- [ ] Add account lockout after failed attempts
- [ ] Set up alerting for security events

