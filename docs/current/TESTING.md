# 🧪 TESTING GUIDE
**Last Updated:** October 12, 2025  
**Current Coverage:** 30%  
**Goal:** 80%+

---

## 📊 Testing Overview

**Philosophy:** Test-Driven Development (TDD) where practical, comprehensive coverage for critical paths.

### **Testing Stack:**
- **Jest 30.1.3** - Test runner
- **React Testing Library 16.3.0** - Component testing
- **jest-environment-jsdom** - Browser environment simulation

---

## 🚀 Running Tests

### **All Tests:**
```bash
npm test
```

### **Watch Mode (Recommended for Development):**
```bash
npm run test:watch
```

### **Coverage Report:**
```bash
npm run test:coverage
```

### **Security Tests Only:**
```bash
npm run test:security
```

### **CI Mode (for deployment):**
```bash
npm run test:ci
```

---

## 📁 Test Structure

```
__tests__/
├── unit/                      ← Unit tests
│   ├── auth.test.ts          ← Authentication logic
│   ├── security.test.ts      ← Security utilities
│   └── components/           ← Component tests
│
├── integration/               ← Integration tests
│   ├── inspections.test.ts   ← Inspection flow
│   └── workflow.test.ts      ← Workflow flow
│
└── e2e/                       ← End-to-end tests (future)
    └── login-flow.test.ts    ← Complete user journeys
```

---

## ✅ What's Tested (Current)

### **Security Utilities** (`__tests__/security/`)
- ✅ Input sanitization
- ✅ XSS prevention
- ✅ SQL injection prevention
- ✅ Pattern validation (email, phone, mileage)

### **Authentication** (basic tests)
- ✅ Cookie session management
- ⚠️ Login flow (needs expansion)

---

## ❌ What's NOT Tested (Needs Work)

### **High Priority:**
- [ ] Server actions (loginAction, saveInspectionAction)
- [ ] React components (MobileButton, MobileInput, etc.)
- [ ] Middleware route protection
- [ ] Error boundaries
- [ ] Form validation

### **Medium Priority:**
- [ ] Mobile component interactions
- [ ] Workflow navigation
- [ ] Inspection form submission
- [ ] Haptic feedback

### **Low Priority:**
- [ ] Design system utilities
- [ ] Visual regression tests

---

## 📝 Writing Tests

### **Unit Test Example:**
```typescript
// __tests__/unit/auth.test.ts
import { login } from '@/lib/auth'

describe('Authentication', () => {
  it('should accept valid credentials', async () => {
    const result = await login('driver@test.com', 'test123456')
    expect(result.success).toBe(true)
  })
  
  it('should reject invalid credentials', async () => {
    const result = await login('wrong@email.com', 'wrong')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
  
  it('should validate email format', async () => {
    const result = await login('invalid-email', 'password')
    expect(result.success).toBe(false)
  })
})
```

### **Component Test Example:**
```typescript
// __tests__/unit/components/MobileButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileButton } from '@/components/mobile'

describe('MobileButton', () => {
  it('should render with correct text', () => {
    render(<MobileButton>Click Me</MobileButton>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })
  
  it('should call onClick handler', () => {
    const handleClick = jest.fn()
    render(<MobileButton onClick={handleClick}>Click</MobileButton>)
    
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('should have minimum 48px height', () => {
    const { container } = render(<MobileButton>Click</MobileButton>)
    const button = container.firstChild as HTMLElement
    
    const height = parseInt(getComputedStyle(button).height)
    expect(height).toBeGreaterThanOrEqual(48)
  })
})
```

### **Server Action Test Example:**
```typescript
// __tests__/integration/actions.test.ts
import { saveInspectionAction } from '@/app/actions/inspections'

describe('Inspection Actions', () => {
  it('should save valid inspection', async () => {
    const data = {
      driverId: 'test-driver-1',
      vehicleId: 'test-vehicle-1',
      type: 'pre_trip' as const,
      items: { 'exterior-0': true, 'exterior-1': true },
      beginningMileage: 12345
    }
    
    const result = await saveInspectionAction(data)
    expect(result.success).toBe(true)
    expect(result.inspectionId).toBeDefined()
  })
  
  it('should reject invalid data', async () => {
    const data = {
      driverId: '',  // Invalid
      vehicleId: 'test-vehicle-1',
      type: 'pre_trip' as const,
      items: {},
      beginningMileage: -1  // Invalid
    }
    
    const result = await saveInspectionAction(data)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
```

---

## 🎯 Coverage Goals

### **Minimum Coverage:**
- **Overall:** 60%+
- **Critical paths:** 80%+
- **Server actions:** 100%
- **Auth logic:** 100%
- **Security utils:** 100%

### **Production Coverage:**
- **Overall:** 80%+
- **Critical paths:** 100%
- **All server actions:** 100%
- **All auth:** 100%
- **All security:** 100%

---

## 🔧 Test Configuration

### **jest.config.js:**
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}
```

### **jest.setup.js:**
```javascript
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
}))
```

---

## 🐛 Testing Best Practices

### **DO:**
- ✅ Test behavior, not implementation
- ✅ Use descriptive test names
- ✅ Test edge cases
- ✅ Mock external dependencies
- ✅ Keep tests fast (<1s each)
- ✅ Test error states
- ✅ Use AAA pattern (Arrange, Act, Assert)

### **DON'T:**
- ❌ Test implementation details
- ❌ Write brittle tests (tied to DOM structure)
- ❌ Skip error cases
- ❌ Test third-party libraries
- ❌ Write slow tests
- ❌ Have tests depend on each other

---

## 📋 Testing Checklist

### **Before Committing:**
- [ ] All tests pass (`npm test`)
- [ ] No test warnings
- [ ] Coverage doesn't decrease
- [ ] New code has tests

### **Before Deploying:**
- [ ] All tests pass in CI mode
- [ ] Coverage meets goals (60%+)
- [ ] Security tests pass
- [ ] Integration tests pass

---

## 🔍 Debugging Tests

### **Run Single Test File:**
```bash
npm test -- auth.test.ts
```

### **Run Tests Matching Pattern:**
```bash
npm test -- --testNamePattern="login"
```

### **Debug in VS Code:**
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

---

## 🎯 Immediate Testing Priorities

### **This Week:**
1. [ ] Write tests for loginAction
2. [ ] Write tests for saveInspectionAction
3. [ ] Write tests for MobileButton
4. [ ] Write tests for MobileInput
5. [ ] Write tests for middleware

### **Next Week:**
6. [ ] Write tests for all mobile components
7. [ ] Write tests for workflow navigation
8. [ ] Write tests for form validation
9. [ ] Add integration tests
10. [ ] Reach 60% coverage

---

## 📊 Current Test Results

```bash
npm test

Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
Coverage:    30% statements
             25% branches
             35% functions
             30% lines
```

**Goal:** 80% across all metrics

---

## 🚀 CI/CD Integration

### **GitHub Actions (Future):**
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:ci
      - run: npm run build
```

---

**Last Updated:** October 12, 2025  
**Next Review:** After reaching 60% coverage
