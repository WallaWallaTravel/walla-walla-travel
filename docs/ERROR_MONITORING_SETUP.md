# 📊 Error Monitoring Setup Guide

**Date:** October 31, 2025  
**Status:** ✅ Ready for Implementation

---

## 🎯 **Overview**

This guide explains how to set up error monitoring using Sentry (or any other monitoring service) for the Walla Walla Travel application.

---

## 🚀 **Quick Start**

### **1. Install Sentry SDK**

```bash
npm install @sentry/nextjs
```

### **2. Set Environment Variables**

Add to `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=walla-walla-travel

# Environment
NODE_ENV=production
```

### **3. Initialize Sentry**

The monitoring wrapper is already set up in `/lib/monitoring/sentry.ts`. To activate it:

1. Uncomment the Sentry initialization code
2. Import and call `errorMonitoring.init()` in your app

---

## 📝 **Implementation Steps**

### **Step 1: Create Sentry Account**

1. Go to [sentry.io](https://sentry.io)
2. Create a free account
3. Create a new project for "Next.js"
4. Copy your DSN

### **Step 2: Configure Next.js**

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
});
```

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

Create `sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### **Step 3: Update Monitoring Wrapper**

In `/lib/monitoring/sentry.ts`, uncomment the Sentry code:

```typescript
import * as Sentry from '@sentry/nextjs';

// Uncomment all Sentry.* calls
```

### **Step 4: Integrate with Error Handler**

Update `/lib/api-errors.ts` to use monitoring:

```typescript
import { captureException } from '@/lib/monitoring/sentry';

export const withErrorHandling = (handler: Function) => {
  return async (request: Request, ...args: any[]) => {
    try {
      return await handler(request, ...args);
    } catch (error: any) {
      // Capture to Sentry
      captureException(error, {
        url: request.url,
        method: request.method,
      });
      
      // ... rest of error handling
    }
  };
};
```

---

## 🔧 **Usage Examples**

### **Capture Exception**

```typescript
import { captureException } from '@/lib/monitoring/sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    userId: user.id,
    action: 'create_booking',
  });
  throw error;
}
```

### **Capture Message**

```typescript
import { captureMessage } from '@/lib/monitoring/sentry';

captureMessage('Payment processed successfully', 'info', {
  bookingId: booking.id,
  amount: payment.amount,
});
```

### **Set User Context**

```typescript
import { setUser } from '@/lib/monitoring/sentry';

// After user logs in
setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// After user logs out
setUser(null);
```

### **Add Breadcrumbs**

```typescript
import { addBreadcrumb } from '@/lib/monitoring/sentry';

addBreadcrumb('User clicked checkout button', 'user-action', {
  cartTotal: cart.total,
  itemCount: cart.items.length,
});
```

---

## 📊 **What to Monitor**

### **Critical Errors:**
- ✅ Database connection failures
- ✅ Payment processing errors
- ✅ Authentication failures
- ✅ API route errors
- ✅ Unhandled promise rejections

### **Performance:**
- ✅ Slow API responses (> 2s)
- ✅ Database query performance
- ✅ Page load times
- ✅ Component render times

### **User Actions:**
- ✅ Failed form submissions
- ✅ Navigation errors
- ✅ Client-side errors
- ✅ Network failures

---

## 🎯 **Sentry Features**

### **Error Tracking**
- Automatic error grouping
- Stack traces
- Release tracking
- Source maps

### **Performance Monitoring**
- Transaction tracing
- Database query monitoring
- API endpoint performance
- Frontend performance

### **Session Replay**
- Video-like replay of user sessions
- Console logs
- Network requests
- DOM mutations

### **Alerts**
- Email notifications
- Slack integration
- PagerDuty integration
- Custom webhooks

---

## 🔐 **Security & Privacy**

### **Data Scrubbing**

Configure Sentry to scrub sensitive data:

```typescript
Sentry.init({
  beforeSend(event) {
    // Remove sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    
    // Scrub credit card numbers
    if (event.message) {
      event.message = event.message.replace(/\d{4}-\d{4}-\d{4}-\d{4}/g, '****-****-****-****');
    }
    
    return event;
  },
});
```

### **PII Filtering**

```typescript
Sentry.init({
  // Don't send PII
  sendDefaultPii: false,
  
  // Filter sensitive headers
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'http') {
      delete breadcrumb.data?.headers?.Authorization;
    }
    return breadcrumb;
  },
});
```

---

## 📈 **Best Practices**

### **Do:**
- ✅ Set meaningful error contexts
- ✅ Use breadcrumbs for debugging
- ✅ Set user context when available
- ✅ Tag errors by feature/module
- ✅ Monitor performance metrics
- ✅ Set up alerts for critical errors

### **Don't:**
- ❌ Send sensitive data (passwords, tokens)
- ❌ Log every single error (filter noise)
- ❌ Ignore error rate limits
- ❌ Forget to test in development
- ❌ Skip source map uploads

---

## 🧪 **Testing**

### **Test Error Capture**

```typescript
// pages/api/test-sentry.ts
import { captureException, captureMessage } from '@/lib/monitoring/sentry';

export default function handler(req, res) {
  // Test exception
  try {
    throw new Error('Test error from API');
  } catch (error) {
    captureException(error, { test: true });
  }
  
  // Test message
  captureMessage('Test message from API', 'info');
  
  res.json({ success: true });
}
```

Visit `/api/test-sentry` and check Sentry dashboard.

---

## 💰 **Pricing**

### **Sentry Free Tier:**
- 5,000 errors/month
- 10,000 performance units/month
- 1 project
- 7-day data retention

### **Sentry Team ($26/month):**
- 50,000 errors/month
- 100,000 performance units/month
- Unlimited projects
- 90-day data retention

### **Alternatives:**
- **Rollbar** - Similar pricing
- **Bugsnag** - $59/month
- **LogRocket** - Session replay focused
- **Self-hosted Sentry** - Free, but requires infrastructure

---

## 🔄 **Alternative Services**

If you prefer not to use Sentry, the monitoring wrapper can be adapted for:

1. **Rollbar**
2. **Bugsnag**
3. **New Relic**
4. **Datadog**
5. **Custom logging service**

Just update `/lib/monitoring/sentry.ts` with the new service's SDK.

---

## 📚 **Resources**

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

---

## ✅ **Checklist**

- [ ] Create Sentry account
- [ ] Install `@sentry/nextjs`
- [ ] Set environment variables
- [ ] Create Sentry config files
- [ ] Uncomment monitoring code
- [ ] Test error capture
- [ ] Set up alerts
- [ ] Configure data scrubbing
- [ ] Upload source maps
- [ ] Monitor dashboard

---

**Error monitoring helps you catch and fix issues before users report them!** 🎉

