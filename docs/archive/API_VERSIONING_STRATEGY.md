# 🔄 API Versioning Strategy

**Date:** October 31, 2025  
**Status:** ✅ Complete

---

## 🎯 **Overview**

API versioning allows us to evolve the API without breaking existing clients.

---

## 📋 **Versioning Approach**

### **URL-Based Versioning**

We use URL path versioning for clarity and simplicity:

```
/api/v1/bookings
/api/v2/bookings
```

**Benefits:**
- ✅ Clear and explicit
- ✅ Easy to route
- ✅ Simple to understand
- ✅ Works with all HTTP clients

---

## 🗂️ **Directory Structure**

```
/app/api
  /v1                    # Version 1 (current)
    /bookings
      /route.ts
    /restaurants
      /route.ts
    /invoices
      /route.ts
  
  /v2                    # Version 2 (future)
    /bookings
      /route.ts
  
  # Unversioned (internal/admin only)
  /admin
    /dashboard
      /route.ts
  /driver
    /tours
      /route.ts
```

---

## 📝 **Versioning Rules**

### **When to Create a New Version:**

1. **Breaking Changes:**
   - Removing fields from responses
   - Changing field types
   - Changing required parameters
   - Changing response structure

2. **Major Feature Changes:**
   - New authentication method
   - Different data model
   - Significant behavior changes

### **When NOT to Version:**

1. **Additive Changes:**
   - Adding optional fields
   - Adding new endpoints
   - Adding optional parameters
   - Bug fixes

2. **Internal Changes:**
   - Performance improvements
   - Code refactoring
   - Database optimizations

---

## 💻 **Implementation**

### **Version 1 API Route Example:**

```typescript
// app/api/v1/bookings/route.ts
import { NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError } from '@/lib/api-errors';
import { queryMany } from '@/lib/db-helpers';

export const GET = withErrorHandling(async (request: Request) => {
  const bookings = await queryMany('SELECT * FROM bookings');
  return NextResponse.json(bookings);
});
```

### **Version 2 API Route Example (Future):**

```typescript
// app/api/v2/bookings/route.ts
import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-errors';
import { queryMany } from '@/lib/db-helpers';

export const GET = withErrorHandling(async (request: Request) => {
  // V2 includes additional fields and pagination
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const bookings = await queryMany(
    'SELECT *, customer_name, vehicle_name FROM bookings_v2 LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  return NextResponse.json({
    data: bookings,
    pagination: {
      page,
      limit,
      total: bookings.length
    }
  });
});
```

---

## 🔧 **Version Middleware**

Create middleware to handle version routing:

```typescript
// lib/api-version.ts
export function getApiVersion(request: Request): string {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/api\/(v\d+)\//);
  return match ? match[1] : 'v1'; // Default to v1
}

export function requireVersion(minVersion: string) {
  return (request: Request) => {
    const version = getApiVersion(request);
    const versionNum = parseInt(version.replace('v', ''));
    const minVersionNum = parseInt(minVersion.replace('v', ''));
    
    if (versionNum < minVersionNum) {
      throw new Error(`API version ${version} is deprecated. Please use ${minVersion} or later.`);
    }
  };
}
```

---

## 📊 **Version Lifecycle**

### **Version States:**

1. **Active** - Current, recommended version
2. **Deprecated** - Still works, but not recommended
3. **Sunset** - Will be removed soon (with date)
4. **Removed** - No longer available

### **Deprecation Process:**

```
1. Announce deprecation (3 months notice)
   ↓
2. Add deprecation warnings to responses
   ↓
3. Set sunset date (6 months from deprecation)
   ↓
4. Remove deprecated version
```

### **Response Headers:**

```typescript
// For deprecated versions
return NextResponse.json(data, {
  headers: {
    'X-API-Version': 'v1',
    'X-API-Deprecated': 'true',
    'X-API-Sunset-Date': '2026-06-01',
    'X-API-Deprecation-Info': 'https://docs.example.com/api/v1-deprecation'
  }
});
```

---

## 🎯 **Migration Guide**

### **For Clients:**

```typescript
// Old (unversioned)
fetch('/api/bookings')

// New (versioned)
fetch('/api/v1/bookings')
```

### **For Developers:**

1. **Create new version directory:**
   ```bash
   mkdir -p app/api/v2/bookings
   ```

2. **Copy existing route:**
   ```bash
   cp app/api/v1/bookings/route.ts app/api/v2/bookings/route.ts
   ```

3. **Make changes to v2**

4. **Update documentation**

5. **Test both versions**

---

## 📚 **Documentation**

### **API Docs Structure:**

```markdown
# API Documentation

## Current Version: v1

### Endpoints

#### GET /api/v1/bookings
Returns list of bookings

**Response:**
```json
{
  "id": 1,
  "tour_date": "2025-11-01",
  "party_size": 4
}
```

#### GET /api/v2/bookings (Coming Soon)
Enhanced booking endpoint with pagination

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```
```

---

## 🧪 **Testing**

```typescript
describe('API Versioning', () => {
  it('should route to v1 by default', async () => {
    const response = await fetch('/api/v1/bookings');
    expect(response.status).toBe(200);
  });

  it('should route to v2 when specified', async () => {
    const response = await fetch('/api/v2/bookings');
    expect(response.status).toBe(200);
  });

  it('should return deprecation headers for v1', async () => {
    const response = await fetch('/api/v1/bookings');
    expect(response.headers.get('X-API-Deprecated')).toBe('true');
  });
});
```

---

## 🎓 **Best Practices**

### **Do:**
- ✅ Version public-facing APIs
- ✅ Document version differences
- ✅ Give advance notice of deprecation
- ✅ Support at least 2 versions simultaneously
- ✅ Use semantic versioning (v1, v2, v3)

### **Don't:**
- ❌ Version internal/admin APIs unnecessarily
- ❌ Remove versions without warning
- ❌ Make breaking changes within a version
- ❌ Support too many versions (max 3)

---

## 📈 **Rollout Plan**

### **Phase 1: Preparation** (Week 1)
- [ ] Create v1 directory structure
- [ ] Move existing routes to v1
- [ ] Update internal API calls
- [ ] Test thoroughly

### **Phase 2: Documentation** (Week 2)
- [ ] Document v1 API
- [ ] Create migration guide
- [ ] Update client examples

### **Phase 3: Deployment** (Week 3)
- [ ] Deploy v1 to production
- [ ] Monitor for issues
- [ ] Support both versioned and unversioned (temporary)

### **Phase 4: Cleanup** (Week 4)
- [ ] Remove unversioned endpoints
- [ ] Update all documentation
- [ ] Announce v1 as stable

---

## 🚀 **Future Versions**

### **Planned for v2:**
- Pagination on all list endpoints
- Consistent error format
- Rate limiting headers
- Enhanced filtering
- Bulk operations

### **Planned for v3:**
- GraphQL support
- WebSocket subscriptions
- Advanced search
- Batch requests

---

## 📊 **Version Comparison**

| Feature | v1 | v2 (Planned) |
|---------|----|--------------| 
| **Pagination** | ❌ | ✅ |
| **Filtering** | Basic | Advanced |
| **Error Format** | Simple | Detailed |
| **Rate Limiting** | ❌ | ✅ |
| **Bulk Operations** | ❌ | ✅ |
| **Webhooks** | ❌ | ✅ |

---

**API versioning ensures we can evolve our API without breaking existing integrations!** 🎉

