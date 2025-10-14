# ✅ TODO - Immediate Tasks
**Purpose:** Track current sprint tasks (different from long-term roadmap)

**How to use this:**
- Add tasks as you think of them
- Move completed tasks to DONE section
- Update weekly
- For long-term planning, see: MASTER_STATUS.md

---

## 🔥 THIS WEEK (Priority)

### Phase 1: Database Setup
- [ ] Research PostgreSQL hosting options (Railway vs Render vs Supabase)
- [ ] Create database schema (see docs/DECISIONS.md ADR-004)
- [ ] Set up local PostgreSQL for development
- [ ] Create `lib/db.ts` connection module
- [ ] Replace `saveInspectionAction` mock with real DB call
- [ ] Test database integration locally

### Phase 2: Security (CRITICAL)
- [ ] Install bcrypt: `npm install bcrypt @types/bcrypt`
- [ ] Add password hashing to `lib/auth.ts`
- [ ] Generate and store CSRF tokens
- [ ] Implement CSRF validation in middleware
- [ ] Add rate limiting middleware
- [ ] Remove hardcoded credentials
- [ ] Test security measures

---

## 📋 BACKLOG (Next Up)

### Testing
- [ ] Write tests for `loginAction`
- [ ] Write tests for `saveInspectionAction`
- [ ] Write tests for `MobileButton` component
- [ ] Write tests for form validation
- [ ] Reach 60% test coverage

### Mobile UI
- [ ] Test on iPhone
- [ ] Test on Android
- [ ] Verify all touch targets ≥48px
- [ ] Test haptic feedback
- [ ] Test in landscape mode

### Features
- [ ] Build unified dashboard (Phase 3)
- [ ] Add signature component (Phase 3)
- [ ] Implement HOS tracking (Phase 4)
- [ ] Add document expiry alerts (Phase 4)

---

## 🐛 BUGS TO FIX

### High Priority
- [ ] None currently (build passing, login working!)

### Medium Priority
- [ ] Fix TypeScript 'any' types (see CODE_REVIEW.md)
- [ ] Improve error messages in forms
- [ ] Add loading states to buttons

### Low Priority
- [ ] Remove console.logs from production builds
- [ ] Optimize image sizes in `/public`

---

## 📝 DOCUMENTATION TASKS

### Immediate
- [x] Create DECISIONS.md
- [x] Create TROUBLESHOOTING.md
- [x] Create CHANGELOG.md
- [x] Create CONTRIBUTING.md
- [ ] Create API.md (document server actions)
- [ ] Update README.md with new doc structure

### Future
- [ ] Create DEPLOYMENT.md (Vercel deployment guide)
- [ ] Create SCHEMA.md (database schema docs)
- [ ] Add JSDoc comments to key functions
- [ ] Create video walkthrough for new developers

---

## ✅ DONE (This Week)

### October 12, 2025
- [x] Comprehensive documentation audit
- [x] Created MASTER_STATUS.md
- [x] Created REVIEW_SUMMARY.md
- [x] Created docs/ARCHITECTURE.md
- [x] Created docs/CODE_REVIEW.md
- [x] Created docs/SETUP.md
- [x] Created docs/TESTING.md
- [x] Cleaned up 23 scattered markdown files
- [x] Build passes successfully
- [x] Login works on mobile
- [x] Removed all Supabase dependencies

---

## 💡 IDEAS (Maybe Later)

- [ ] Add dark mode
- [ ] Add offline mode (PWA)
- [ ] Add push notifications for reminders
- [ ] Add voice-to-text for notes
- [ ] Add photo upload for damage reports
- [ ] Create mobile app wrapper (React Native)
- [ ] Add analytics/reporting dashboard
- [ ] Multi-tenant support (multiple companies)
- [ ] Integration with GPS tracking
- [ ] Integration with fuel card systems

---

## 🚫 WON'T DO (Decided Against)

- ❌ ~~Keep Supabase~~ (removed, see ADR-001)
- ❌ ~~Use NextAuth.js~~ (too complex for needs)
- ❌ ~~Add i18n in MVP~~ (English only for now)
- ❌ ~~Support IE11~~ (mobile-first, modern browsers only)

---

## 📊 Weekly Review

**Last Review:** October 12, 2025  
**Next Review:** October 19, 2025

### Review Checklist:
- [ ] Move completed tasks to DONE
- [ ] Add new discovered tasks
- [ ] Reprioritize based on learnings
- [ ] Update MASTER_STATUS.md with changes
- [ ] Update CHANGELOG.md with completed work

---

## 🎯 Success Metrics

**This Week's Goals:**
- [ ] Database connected and tested
- [ ] Security basics implemented
- [ ] 60%+ test coverage
- [ ] Mobile UI verified on 2+ devices

**This Month's Goals:**
- [ ] MVP ready for production
- [ ] 80% test coverage
- [ ] All critical security measures
- [ ] Deployed to Vercel production

---

**Last Updated:** October 12, 2025  
**Next Update:** When tasks change
