# 🤝 CONTRIBUTING GUIDE
**Purpose:** How to contribute code, maintain quality, and keep the project running smoothly

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Coding Standards](#coding-standards)
4. [Testing Requirements](#testing-requirements)
5. [Documentation](#documentation)
6. [Commit Messages](#commit-messages)
7. [Pull Request Process](#pull-request-process)
8. [Code Review](#code-review)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Git
- Code editor (VS Code recommended)

### Initial Setup
```bash
# Clone repository
git clone [repository-url]
cd walla-walla-final

# Install dependencies
npm install

# Copy environment variables
cp env.local.example .env.local

# Run development server
npm run dev

# Run tests
npm test
```

### Before First Contribution
1. Read: `MASTER_STATUS.md` - Understand current state
2. Read: `docs/ARCHITECTURE.md` - Understand system design
3. Read: This file - Understand workflow
4. Run: `npm run build` - Ensure it passes
5. Run: `npm test` - Ensure tests pass

---

## 🔄 Development Workflow

### Branch Strategy

**Main Branch:** `main`
- Always stable
- Always deployable
- Protected (no direct commits)

**Feature Branches:**
```bash
# Create feature branch
git checkout -b feature/add-signature-component
git checkout -b fix/login-redirect-bug
git checkout -b docs/update-architecture
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes
- `chore/` - Build, dependencies, etc.

### Typical Workflow

```bash
# 1. Start with latest main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes
# Edit files...

# 4. Test locally
npm run build  # Must pass
npm test       # Must pass

# 5. Commit changes (see Commit Messages section)
git add .
git commit -m "feat: add my feature"

# 6. Push to remote
git push origin feature/my-feature

# 7. Create Pull Request (see PR Process section)

# 8. After review and approval, merge to main
# 9. Delete feature branch
git branch -d feature/my-feature
```

---

## 📝 Coding Standards

### TypeScript

**DO:**
- ✅ Use TypeScript strict mode
- ✅ Define interfaces for data structures
- ✅ Use type inference when obvious
- ✅ Prefer `unknown` over `any`

**DON'T:**
- ❌ Use `any` type (use `unknown` or proper type)
- ❌ Disable TypeScript checks without comment
- ❌ Ignore TypeScript errors

**Example:**
```typescript
// ❌ BAD
function processData(data: any) {
  return data.value
}

// ✅ GOOD
interface DataInput {
  value: string
  timestamp: Date
}

function processData(data: DataInput): string {
  return data.value
}
```

### React Components

**DO:**
- ✅ Use functional components
- ✅ Use TypeScript for props
- ✅ Use server components by default
- ✅ Add 'use client' only when needed
- ✅ Keep components focused (single responsibility)

**DON'T:**
- ❌ Use class components
- ❌ Create giant components (>200 lines)
- ❌ Use 'use client' unnecessarily

**Example:**
```typescript
// ✅ GOOD
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export function MobileButton({ 
  children, 
  onClick,
  variant = 'primary' 
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[48px] ${variant === 'primary' ? 'bg-blue-600' : 'bg-gray-600'}`}
    >
      {children}
    </button>
  )
}
```

### Server Actions

**DO:**
- ✅ Always use 'use server' directive
- ✅ Return structured results: `{ success, data?, error? }`
- ✅ Validate input
- ✅ Handle errors gracefully

**Example:**
```typescript
'use server'

interface SaveResult {
  success: boolean
  id?: string
  error?: string
}

export async function saveInspection(data: InspectionData): Promise<SaveResult> {
  try {
    // Validate
    if (!data.driverId) {
      return { success: false, error: 'Driver ID required' }
    }
    
    // Save to database
    const id = await db.inspections.create(data)
    
    return { success: true, id }
  } catch (error) {
    console.error('Failed to save inspection:', error)
    return { success: false, error: 'Failed to save inspection' }
  }
}
```

### CSS / Tailwind

**DO:**
- ✅ Use Tailwind utility classes
- ✅ Use mobile-first responsive design
- ✅ Keep touch targets ≥48px
- ✅ Use semantic color names from theme

**DON'T:**
- ❌ Write custom CSS unless absolutely necessary
- ❌ Use inline styles
- ❌ Create touch targets <48px

**Example:**
```typescript
// ✅ GOOD
<button className="
  min-h-[48px] 
  w-full 
  bg-blue-600 
  text-white 
  rounded-lg
  active:bg-blue-700
  transition-colors
">
  Click Me
</button>

// ❌ BAD
<button style={{ height: '32px', background: '#0066cc' }}>
  Click Me
</button>
```

---

## 🧪 Testing Requirements

### When to Write Tests

**MUST TEST:**
- ✅ Server actions
- ✅ Authentication logic
- ✅ Security utilities
- ✅ Form validation
- ✅ Data transformations

**SHOULD TEST:**
- ✅ React components (at least core ones)
- ✅ Utility functions
- ✅ Complex business logic

**DON'T TEST:**
- ❌ Third-party libraries
- ❌ Simple getters/setters
- ❌ Obvious code (e.g., `return true`)

### Test Requirements

**Before Committing:**
- All tests must pass: `npm test`
- Coverage should not decrease
- New code should have tests

**Example Test:**
```typescript
// __tests__/unit/auth.test.ts
import { validateCredentials } from '@/lib/auth'

describe('validateCredentials', () => {
  it('should accept valid email and password', () => {
    const result = validateCredentials('driver@test.com', 'test123456')
    expect(result.valid).toBe(true)
  })
  
  it('should reject invalid email', () => {
    const result = validateCredentials('invalid-email', 'password')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('email')
  })
  
  it('should reject short password', () => {
    const result = validateCredentials('test@test.com', '123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('password')
  })
})
```

**See:** `docs/TESTING.md` for complete guide

---

## 📚 Documentation

### When to Update Documentation

**MUST UPDATE:**
- ✅ MASTER_STATUS.md - After completing major milestones
- ✅ CHANGELOG.md - For every feature/fix/change
- ✅ ARCHITECTURE.md - When making architectural decisions
- ✅ docs/DECISIONS.md - When choosing between options

**SHOULD UPDATE:**
- ✅ README.md - If setup process changes
- ✅ TROUBLESHOOTING.md - When you solve a tricky issue
- ✅ API.md - When adding/changing server actions

### Documentation Standards

**DO:**
- ✅ Write clear, concise explanations
- ✅ Include code examples
- ✅ Update dates ("Last Updated: YYYY-MM-DD")
- ✅ Use consistent formatting

**DON'T:**
- ❌ Leave outdated information
- ❌ Write vague descriptions ("it works now")
- ❌ Skip documentation for "obvious" changes

---

## 💬 Commit Messages

### Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code refactoring (no feature change)
- `test:` - Adding/updating tests
- `chore:` - Build, dependencies, etc.
- `perf:` - Performance improvements
- `ci:` - CI/CD changes

### Examples

```bash
# Simple commit
git commit -m "feat: add signature component"

# With scope
git commit -m "fix(auth): handle expired sessions correctly"

# With body
git commit -m "feat: add database integration

- Set up PostgreSQL connection
- Create initial schema
- Add migration scripts
- Update environment variables"

# Breaking change
git commit -m "feat!: change inspection data structure

BREAKING CHANGE: Inspection items now stored as JSON instead of array"
```

### Good Commit Messages

```bash
✅ feat: add signature component to DVIR
✅ fix: resolve login redirect loop
✅ docs: update architecture decisions for database choice
✅ test: add tests for inspection form validation
✅ refactor: simplify authentication logic
✅ chore: upgrade Next.js to 14.2.0
```

### Bad Commit Messages

```bash
❌ update stuff
❌ fix
❌ wip
❌ changes
❌ asdfasdf
```

---

## 🔀 Pull Request Process

### Creating a Pull Request

1. **Push feature branch:**
   ```bash
   git push origin feature/my-feature
   ```

2. **Create PR on GitHub:**
   - Title: Use commit message format
   - Description: Explain what and why
   - Link related issues
   - Add screenshots if UI changes

3. **PR Template:**
   ```markdown
   ## What
   [Describe what this PR does]
   
   ## Why
   [Explain why this change is needed]
   
   ## How
   [Briefly explain how it works]
   
   ## Testing
   - [ ] Tests pass locally
   - [ ] Build passes
   - [ ] Tested on mobile device (if UI change)
   
   ## Screenshots
   [If UI change, include before/after screenshots]
   
   ## Checklist
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] MASTER_STATUS.md updated (if major change)
   ```

### Before Requesting Review

**Checklist:**
- [ ] All tests pass: `npm test`
- [ ] Build passes: `npm run build`
- [ ] No console errors/warnings
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Commit messages follow convention

---

## 👀 Code Review

### As a Reviewer

**Check For:**
- ✅ Code follows standards
- ✅ Tests are adequate
- ✅ No obvious bugs
- ✅ Documentation updated
- ✅ No security issues
- ✅ Performance considerations

**Give Feedback:**
- 🟢 **Approve** - Looks good, ship it!
- 🟡 **Comment** - Suggestions, non-blocking
- 🔴 **Request Changes** - Issues must be fixed

**Be Constructive:**
```bash
✅ "Consider extracting this to a utility function for reusability"
❌ "This code is bad"

✅ "Could we add a test for the error case?"
❌ "Where are the tests?"

✅ "This might cause issues if [scenario]. What do you think?"
❌ "This will break in production"
```

### As an Author

**Respond to Feedback:**
- 🤔 Read carefully and consider suggestions
- 💬 Reply to comments (even if just "done")
- ✅ Make requested changes
- 🔄 Push updates to same branch
- ✔️ Mark conversations as resolved when fixed

**Don't:**
- ❌ Argue defensively
- ❌ Ignore feedback
- ❌ Force-push over review comments
- ❌ Merge without approval

---

## 🚨 Emergency Hotfixes

For critical production bugs:

```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug

# 2. Fix the issue
# Edit files...

# 3. Test thoroughly
npm run build
npm test

# 4. Commit
git commit -m "fix: resolve critical bug"

# 5. Push and create PR
git push origin hotfix/critical-bug

# 6. Get expedited review
# 7. Merge to main immediately after approval
# 8. Deploy to production
vercel --prod --force

# 9. Update CHANGELOG.md
# 10. Create patch release (v0.2.1)
```

---

## 📊 Quality Standards

### Before Merging to Main

**MUST PASS:**
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (all tests)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Code review approved
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

**SHOULD VERIFY:**
- [ ] Works on mobile device
- [ ] Tests cover new code
- [ ] Performance acceptable
- [ ] No security issues
- [ ] Accessibility maintained

---

## 🎯 Key Principles

1. **Test Before Commit** - Don't push broken code
2. **Document Everything** - Future you will thank you
3. **Keep It Simple** - Solve the problem, don't over-engineer
4. **Mobile First** - Always test on mobile
5. **Security Matters** - Think about attack vectors
6. **Be Consistent** - Follow existing patterns
7. **Communicate** - When stuck, ask for help

---

## 🆘 Need Help?

**If you're stuck:**
1. Read: `docs/TROUBLESHOOTING.md`
2. Check: `docs/ARCHITECTURE.md` for design context
3. Search: GitHub issues for similar problems
4. Ask: Create a GitHub issue or discussion

**If you find a bug:**
1. Check if already reported
2. Create GitHub issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
3. Label appropriately (bug, enhancement, etc.)

---

## 📞 Resources

- **Documentation:** `/docs` directory
- **Status:** `MASTER_STATUS.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Testing:** `docs/TESTING.md`
- **Troubleshooting:** `docs/TROUBLESHOOTING.md`

---

**Last Updated:** October 12, 2025  
**Next Review:** November 12, 2025

---

**Thank you for contributing!** 🎉
