# 🚨 API Error Handling Guide

**Date:** October 31, 2025  
**Status:** ✅ Complete

---

## 🎯 **Overview**

Standardized error handling system for consistent API responses across the application.

---

## 📚 **Error Classes**

### **Available Error Types:**

```typescript
import {
  BadRequestError,      // 400 - Invalid input
  UnauthorizedError,    // 401 - Not authenticated
  ForbiddenError,       // 403 - Not authorized
  NotFoundError,        // 404 - Resource not found
  ConflictError,        // 409 - Duplicate/conflict
  ValidationError,      // 422 - Validation failed
  InternalServerError,  // 500 - Server error
  ServiceUnavailableError, // 503 - Service down
} from '@/lib/api-errors';
```

---

## 💻 **Usage Examples**

### **Basic Error Throwing:**

```typescript
import { NotFoundError, BadRequestError } from '@/lib/api-errors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new BadRequestError('ID parameter is required');
  }

  const item = await findItem(id);
  
  if (!item) {
    throw new NotFoundError('Item');
  }

  return NextResponse.json(item);
}
```

### **With Error Handler Wrapper:**

```typescript
import { withErrorHandling, NotFoundError } from '@/lib/api-errors';

export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new BadRequestError('ID parameter is required');
  }

  const item = await findItem(id);
  
  if (!item) {
    throw new NotFoundError('Item');
  }

  return NextResponse.json(item);
});
```

### **Manual Error Handling:**

```typescript
import { handleApiError, NotFoundError } from '@/lib/api-errors';

export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 🎨 **Error Response Format**

### **Production Response:**
```json
{
  "error": "Item not found",
  "code": "NOT_FOUND"
}
```

### **Development Response:**
```json
{
  "error": "Item not found",
  "code": "NOT_FOUND",
  "details": {
    "itemId": "123"
  },
  "stack": "Error: Item not found\n    at ..."
}
```

---

## 🔧 **Custom Error with Details:**

```typescript
throw new ValidationError('Invalid booking data', {
  fields: {
    date: 'Date must be in the future',
    partySize: 'Party size must be between 1 and 14'
  }
});
```

**Response:**
```json
{
  "error": "Invalid booking data",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": {
      "date": "Date must be in the future",
      "partySize": "Party size must be between 1 and 14"
    }
  }
}
```

---

## 🗄️ **Database Error Handling**

The system automatically handles common database errors:

### **Unique Constraint Violation:**
```typescript
// Database throws: duplicate key value violates unique constraint
// Automatically converted to:
{
  "error": "Resource already exists",
  "code": "CONFLICT"
}
```

### **Foreign Key Violation:**
```typescript
// Database throws: foreign key constraint violation
// Automatically converted to:
{
  "error": "Referenced resource does not exist",
  "code": "BAD_REQUEST"
}
```

### **Not Null Violation:**
```typescript
// Database throws: null value in column violates not-null constraint
// Automatically converted to:
{
  "error": "Required field is missing",
  "code": "BAD_REQUEST"
}
```

---

## ✅ **Best Practices**

### **1. Use Specific Error Types:**
```typescript
// ❌ Bad
throw new Error('Not found');

// ✅ Good
throw new NotFoundError('Booking');
```

### **2. Include Context:**
```typescript
// ❌ Bad
throw new BadRequestError('Invalid input');

// ✅ Good
throw new BadRequestError('Invalid input', {
  field: 'email',
  reason: 'Email format is invalid'
});
```

### **3. Use withErrorHandling Wrapper:**
```typescript
// ✅ Clean and consistent
export const GET = withErrorHandling(async (request) => {
  // Your logic here
  // Errors are automatically caught and formatted
});
```

### **4. Don't Expose Sensitive Info:**
```typescript
// ❌ Bad (in production)
throw new InternalServerError(error.message);

// ✅ Good
throw new InternalServerError('Failed to process request');
```

---

## 🔄 **Migration Guide**

### **Before:**
```typescript
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
```

### **After:**
```typescript
import { withErrorHandling, InternalServerError } from '@/lib/api-errors';

export const GET = withErrorHandling(async (request: Request) => {
  const data = await fetchData();
  return NextResponse.json(data);
});
```

---

## 📊 **Error Status Codes**

| Error Class | Status | Use Case |
|-------------|--------|----------|
| BadRequestError | 400 | Invalid input, malformed request |
| UnauthorizedError | 401 | Missing or invalid authentication |
| ForbiddenError | 403 | Authenticated but not authorized |
| NotFoundError | 404 | Resource doesn't exist |
| ConflictError | 409 | Duplicate resource, state conflict |
| ValidationError | 422 | Input validation failed |
| InternalServerError | 500 | Unexpected server error |
| ServiceUnavailableError | 503 | Service temporarily down |

---

## 🧪 **Testing**

```typescript
import { NotFoundError, handleApiError } from '@/lib/api-errors';

describe('API Error Handling', () => {
  it('should format NotFoundError correctly', () => {
    const error = new NotFoundError('User');
    const response = handleApiError(error);
    
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'User not found',
      code: 'NOT_FOUND'
    });
  });
});
```

---

## 🚀 **Benefits**

### **Consistency:**
- ✅ All errors follow the same format
- ✅ Predictable status codes
- ✅ Standard error codes

### **Developer Experience:**
- ✅ Easy to throw errors
- ✅ Automatic formatting
- ✅ Type-safe error classes

### **Debugging:**
- ✅ Stack traces in development
- ✅ Detailed error context
- ✅ Automatic logging

### **Security:**
- ✅ No sensitive data in production
- ✅ Generic messages for users
- ✅ Detailed logs for developers

---

## 📝 **Next Steps**

1. **Migrate existing routes** to use new error classes
2. **Add error monitoring** (Sentry integration)
3. **Create error documentation** for frontend team
4. **Add error analytics** to track common issues

---

**Standardized error handling makes your API more robust, predictable, and easier to maintain!** 🎉

