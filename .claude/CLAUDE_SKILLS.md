# 🧠 Claude Skills Framework

**Purpose:** Define consistent behaviors, patterns, and knowledge that Claude should apply when working on this project and similar future projects.

---

## 📋 Core Principles

### 1. Stability First
- Always prefer well-established patterns over cutting-edge experiments
- Use proven libraries with active maintenance
- Avoid breaking changes without explicit approval
- Test before deploying

### 2. Simplicity Over Cleverness
- Write code that's easy to read and maintain
- Avoid over-engineering
- One responsibility per function/component
- Clear naming over comments

### 3. Defensive Programming
- Validate all inputs
- Handle all error cases
- Provide meaningful error messages
- Fail gracefully

### 4. Documentation as Code
- Keep docs close to code
- Update docs with every change
- Prefer self-documenting code
- Use TypeScript for type documentation

---

## 🏗️ Project Patterns to Follow

### Service Layer Pattern
```typescript
// ✅ CORRECT: Use service layer for business logic
import { bookingService } from '@/lib/services/booking.service';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const bookings = await bookingService.getAll();
  return NextResponse.json({ success: true, data: bookings });
});

// ❌ WRONG: Direct database access in route
export const GET = withErrorHandling(async (request: NextRequest) => {
  const result = await query('SELECT * FROM bookings');
  return NextResponse.json(result.rows);
});
```

### Error Handling Pattern
```typescript
// ✅ CORRECT: Use custom error classes
import { NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';

if (!booking) {
  throw new NotFoundError('Booking not found');
}

// ✅ CORRECT: Use withErrorHandling wrapper
export const POST = withErrorHandling(async (request: NextRequest) => {
  // errors are automatically caught and formatted
});

// ❌ WRONG: Manual try-catch with generic errors
try {
  // code
} catch (e) {
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}
```

### Validation Pattern
```typescript
// ✅ CORRECT: Use Zod schemas with validateBody
import { z } from 'zod';
import { validateBody } from '@/lib/api/middleware/validation';

const BookingSchema = z.object({
  customer_name: z.string().min(1),
  tour_date: z.string().datetime(),
  party_size: z.number().min(1).max(14),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody(request, BookingSchema);
  // data is now typed and validated
});
```

### Component Pattern
```typescript
// ✅ CORRECT: Typed props with clear interfaces
interface BookingCardProps {
  booking: Booking;
  onEdit?: (id: number) => void;
  onCancel?: (id: number) => void;
}

export function BookingCard({ booking, onEdit, onCancel }: BookingCardProps) {
  return (
    <div className="rounded-lg border p-4">
      {/* component content */}
    </div>
  );
}

// ❌ WRONG: Untyped props, inline styles
export function BookingCard(props) {
  return <div style={{ borderRadius: 8 }}>{props.booking.name}</div>;
}
```

---

## 🔧 Habit Optimization

### Good Habits to Reinforce

1. **Always validate early**
   - Validate at API boundaries
   - Use TypeScript strict mode
   - Return early on invalid input

2. **Log strategically**
   - Log errors with context
   - Don't log sensitive data
   - Use structured logging

3. **Test critical paths**
   - Authentication flows
   - Payment processing
   - Data mutations

4. **Document decisions**
   - Why, not just what
   - Trade-offs considered
   - Future implications

### Bad Habits to Offset

1. **Rushing to code** → First understand the problem
   - Read existing code patterns
   - Check for similar implementations
   - Plan before coding

2. **Ignoring errors** → Always handle gracefully
   - Never swallow errors silently
   - Log with context
   - Provide user-friendly messages

3. **Skipping tests** → Test critical paths first
   - Start with happy path
   - Add edge cases
   - Run tests before committing

4. **Leaving TODOs** → Resolve or track properly
   - Create GitHub issues
   - Add to TODO.md
   - Set realistic timelines

---

## 📁 File Organization Rules

### Where to Put New Files

| Type | Location | Naming |
|------|----------|--------|
| API Route | `app/api/[domain]/route.ts` | `route.ts` |
| Service | `lib/services/[name].service.ts` | `booking.service.ts` |
| Component | `components/[category]/[Name].tsx` | `BookingCard.tsx` |
| Hook | `hooks/use-[name].ts` | `use-booking.ts` |
| Type | `lib/types/[domain].ts` | `booking.ts` |
| Schema | `lib/validation/schemas/[name].ts` | `booking.schemas.ts` |
| Utility | `lib/utils/[name].ts` | `date-utils.ts` |

### Naming Conventions

```typescript
// Files
booking.service.ts     // Services (kebab-case + .service.ts)
BookingCard.tsx        // Components (PascalCase.tsx)
use-booking.ts         // Hooks (use-kebab-case.ts)
booking.schemas.ts     // Schemas (kebab-case.schemas.ts)

// Variables
const bookingData = {};           // camelCase for variables
const BOOKING_STATUSES = [];      // SCREAMING_SNAKE_CASE for constants
const BookingSchema = z.object(); // PascalCase for schemas/types

// Functions
function getBookingById() {}      // camelCase, verb prefix
async function fetchBookings() {} // async functions can use fetch/load/get
```

---

## 🛡️ Security Checklist

Before committing any code, verify:

- [ ] No secrets in code (use env vars)
- [ ] No SQL injection (use parameterized queries)
- [ ] No XSS (sanitize user input for display)
- [ ] Input validation on all endpoints
- [ ] Authorization checks on protected routes
- [ ] Rate limiting on public endpoints
- [ ] Audit logging for sensitive operations

---

## 🧪 Testing Standards

### What to Test

1. **Services** - Core business logic
2. **API Routes** - Request/response handling
3. **Utilities** - Helper functions
4. **Critical Components** - Forms, authentication

### Test Structure

```typescript
describe('BookingService', () => {
  describe('createBooking', () => {
    it('should create a booking with valid data', async () => {
      // Arrange
      const data = { customer_name: 'Test', tour_date: '2025-12-01' };
      
      // Act
      const result = await bookingService.createBooking(data);
      
      // Assert
      expect(result).toHaveProperty('id');
      expect(result.customer_name).toBe('Test');
    });

    it('should throw ValidationError for invalid data', async () => {
      // Arrange
      const data = { customer_name: '' }; // missing required fields
      
      // Act & Assert
      await expect(bookingService.createBooking(data))
        .rejects.toThrow(ValidationError);
    });
  });
});
```

---

## 📝 Documentation Standards

### Code Comments

```typescript
// ✅ GOOD: Explains WHY
// We use 12 rounds for bcrypt as it provides adequate security
// while keeping login times under 500ms on average hardware
const SALT_ROUNDS = 12;

// ❌ BAD: Explains WHAT (obvious from code)
// Set salt rounds to 12
const SALT_ROUNDS = 12;
```

### JSDoc for Complex Functions

```typescript
/**
 * Calculate the total price for a booking including all services
 * 
 * @param booking - The booking to calculate price for
 * @param services - Additional services selected
 * @param discounts - Any applicable discounts
 * @returns Total price in cents (to avoid floating point issues)
 * 
 * @example
 * const total = calculateBookingTotal(booking, services, []);
 * console.log(total); // 125000 (= $1,250.00)
 */
function calculateBookingTotal(
  booking: Booking,
  services: Service[],
  discounts: Discount[]
): number {
  // implementation
}
```

---

## 🔄 Git Workflow

### Commit Messages

```bash
# Format: type(scope): description

# Types:
feat     # New feature
fix      # Bug fix
docs     # Documentation
style    # Formatting, no code change
refactor # Code restructuring
test     # Adding tests
chore    # Maintenance tasks

# Examples:
feat(booking): add party size validation
fix(auth): resolve session timeout issue
docs(api): update booking endpoint documentation
refactor(services): consolidate duplicate booking services
test(booking): add unit tests for price calculation
```

### Branch Naming

```bash
feature/add-booking-validation
fix/login-timeout-issue
refactor/consolidate-services
docs/update-api-reference
```

---

## 🚨 Emergency Procedures

### If Something Breaks in Production

1. **Don't panic** - Take a breath
2. **Check logs** - Railway/Heroku logs first
3. **Identify scope** - How many users affected?
4. **Rollback if needed** - `git revert` or redeploy previous version
5. **Fix forward** - Quick patch if rollback not possible
6. **Post-mortem** - Document what happened and how to prevent

### Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Login fails | Check DATABASE_URL, restart server |
| API returns 500 | Check logs, verify env vars |
| Page not loading | Clear .next, restart dev server |
| Database connection | Verify SSL settings, check pool |
| Missing data | Check migrations, verify schema |

---

## 📚 Resources

### Project-Specific
- [CURRENT_STATUS.md](../CURRENT_STATUS.md) - Project state
- [TODO.md](../TODO.md) - Active tasks
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - API reference

### External
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod](https://zod.dev)
- [PostgreSQL](https://www.postgresql.org/docs/)

---

**Last Updated:** November 25, 2025  
**Review Schedule:** Monthly  
**Owner:** Development Team


