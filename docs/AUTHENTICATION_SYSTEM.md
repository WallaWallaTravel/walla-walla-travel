# Authentication System

## Overview

Secure JWT-based authentication system with role-based access control (RBAC) for Walla Walla Travel operations portal.

> **See also**: [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md) for architectural decisions and rationale behind design choices.

---

## Architecture

### Components

1. **Session Management** (`lib/auth/session.ts`)
   - JWT token generation and verification
   - HTTP-only cookies for security
   - 7-day session duration
   - Role-based access helpers

2. **Password Security** (`lib/auth/passwords.ts`)
   - Bcrypt hashing (12 rounds)
   - Password strength validation
   - Secure comparison

3. **API Endpoints**
   - `POST /api/auth/login` - Authenticate and create session
   - `POST /api/auth/logout` - Destroy session
   - `GET /api/auth/logout` - Logout via link (redirect to homepage)
   - `GET /api/auth/me` - Get current user

4. **Middleware** (`middleware.ts`)
   - Route protection
   - Role-based access control
   - Automatic redirects

---

## User Roles

### Admin (`role: 'admin'`)
- **Access**: Full system access
- **Routes**:
  - `/admin/*` - Admin dashboard and all management pages
  - All API endpoints

### Driver (`role: 'driver'`)
- **Access**: Limited to driver-specific functionality
- **Routes**:
  - `/driver-portal/*` - Driver dashboard
  - `/workflow/*` - Daily workflow
  - `/inspections/*` - Vehicle inspections
  - `/time-clock/*` - Time tracking

---

## Protected Routes

### Authentication Required
The following routes require a valid session:
- `/admin/*`
- `/driver-portal/*`
- `/workflow/*`
- `/inspections/*`
- `/time-clock/*`
- `/calendar/*`
- `/bookings/new/*`

### Public Routes
- `/` - Homepage
- `/login` - Login page
- `/contribute/*` - Business portal
- `/book/*` - Customer booking
- `/corporate-request` - Corporate requests
- `/api/auth/login` - Login API
- All static assets

---

## Session Management

### Session Cookie
- **Name**: `session`
- **Duration**: 7 days
- **Attributes**:
  - `httpOnly: true` - Not accessible via JavaScript
  - `secure: true` - HTTPS only (production)
  - `sameSite: 'lax'` - CSRF protection
  - `path: '/'` - Available site-wide

### Session Data Structure
```typescript
{
  user: {
    id: number
    email: string
    name: string
    role: 'admin' | 'driver'
    permissions?: string[]
  },
  expiresAt: number
}
```

---

## Usage Examples

### Protecting API Routes

```typescript
import { requireAuth, requireRole } from '@/lib/auth/session';

// Require any authenticated user
export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  // session.user contains user data
}

// Require specific role
export async function POST(request: NextRequest) {
  const session = await requireRole(request, ['admin']);
  // Only admins can access
}
```

### Getting Current User in Server Components

```typescript
import { getSession } from '@/lib/auth/session';

export default async function MyPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return <div>Hello, {session.user.name}</div>;
}
```

### Checking Permissions

```typescript
import { hasPermission } from '@/lib/auth/session';

if (hasPermission(session, 'manage_bookings')) {
  // User has permission
}
```

---

## Login Flow

1. **User visits `/login`**
2. **Enters credentials**
3. **POST to `/api/auth/login`**
   - Validates email/password
   - Checks if user is active
   - Verifies password hash
   - Creates JWT session token
   - Sets HTTP-only cookie
   - Logs activity
4. **Redirects based on role**
   - Admin → `/admin/dashboard`
   - Driver → `/driver-portal/unified-dashboard`

---

## Logout Flow

1. **User clicks logout**
2. **POST to `/api/auth/logout`** or visits **GET `/api/auth/logout`**
3. **Logs activity**
4. **Clears session cookie**
5. **Redirects to homepage**

---

## Security Features

### ✅ Password Security
- Bcrypt hashing with 12 rounds
- Password strength requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

### ✅ Session Security
- JWT tokens signed with secret
- HTTP-only cookies (XSS protection)
- Secure flag in production (HTTPS only)
- SameSite=lax (CSRF protection)
- 7-day expiration

### ✅ Route Protection
- Middleware enforces authentication
- Role-based access control
- Automatic redirects to login
- Prevents unauthorized access

### ✅ Activity Logging
- All logins logged
- All logouts logged
- IP address tracking
- Helps with security audits

---

## Environment Variables

### Required
```bash
SESSION_SECRET=your-super-secret-key-change-this-in-production
DATABASE_URL=postgresql://user:pass@localhost:5432/walla_walla_travel
```

**⚠️ CRITICAL**: Change `SESSION_SECRET` in production to a strong random string.

---

## Database Schema

### Users Table Updates
```sql
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'driver',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
```

### User Activity Logs
```sql
CREATE TABLE user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Testing

### Creating Test Users

```sql
-- Admin user
INSERT INTO users (email, name, password_hash, role, is_active)
VALUES (
  'admin@wallawalla.travel',
  'Admin User',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWE5fBie', -- password: Admin123
  'admin',
  true
);

-- Driver user  
INSERT INTO users (email, name, password_hash, role, is_active)
VALUES (
  'driver@wallawalla.travel',
  'John Driver',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWE5fBie', -- password: Driver123
  'driver',
  true
);
```

### Test Login
1. Visit http://localhost:3000/login
2. Enter test credentials
3. Should redirect to appropriate dashboard

---

## Troubleshooting

### "Unauthorized" errors
- Check SESSION_SECRET is set
- Verify cookie is being set (check browser dev tools)
- Ensure middleware is running

### Can't log in
- Verify user exists in database
- Check `is_active` is true
- Verify password hash is correct
- Check database connection

### Infinite redirects
- Check middleware logic
- Verify session verification is working
- Check for circular redirects

---

## Production Checklist

- [ ] Change `SESSION_SECRET` to strong random value
- [ ] Enable HTTPS (secure cookies)
- [ ] Set up database backups
- [ ] Monitor user_activity_logs for suspicious activity
- [ ] Review and test role permissions
- [ ] Set up alerting for failed login attempts
- [ ] Configure session duration as needed
- [ ] Test subdomain routing with auth

