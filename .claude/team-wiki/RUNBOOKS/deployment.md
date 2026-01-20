# Deployment Runbook

## Pre-Deployment Checklist

### Code Quality
```bash
# Run all quality checks
npm run type-check    # TypeScript compilation
npm run lint          # ESLint
npm test              # Unit tests
npm run build         # Production build
```

- [ ] All checks pass locally
- [ ] No console errors in browser testing
- [ ] Core user flows verified manually

### Environment
- [ ] Environment variables verified
- [ ] No secrets in code
- [ ] Database migrations applied (if any)
- [ ] Feature flags configured

### Git
- [ ] All changes committed
- [ ] Branch up to date with main
- [ ] PR reviewed (if applicable)

---

## Deployment Process

### Walla Walla Travel (Vercel)

**Automatic Deployment:**
- Push to `main` triggers automatic deploy
- Vercel builds and deploys automatically

**Manual Deployment (if needed):**
```bash
vercel deploy --prod
```

### Auditor's Dream

```bash
cd auditors-dream/apps/operator
npm run build
# Deploy according to hosting configuration
```

---

## Post-Deployment Verification

### Immediate Checks (within 5 minutes)

| Check | How | Expected |
|-------|-----|----------|
| Site loads | Visit production URL | 200 response |
| Auth works | Test login | Successful login |
| Core flow | Complete a key action | No errors |
| Console | Check browser DevTools | No errors |

### Monitoring Checks

- [ ] Sentry dashboard - no new errors
- [ ] Vercel analytics - normal response times
- [ ] Supabase dashboard - database healthy

---

## Rollback Procedure

### Vercel Rollback

1. Go to Vercel dashboard
2. Navigate to Deployments
3. Find previous working deployment
4. Click "..." menu → "Promote to Production"

### Database Rollback

If migration caused issues:
1. Identify the migration
2. Run rollback migration (if prepared)
3. Or restore from Supabase backup

---

## Environment Variables

### Walla Walla Travel

| Variable | Purpose | Location |
|----------|---------|----------|
| `DATABASE_URL` | Supabase connection | Vercel env |
| `NEXT_PUBLIC_SUPABASE_URL` | Client Supabase URL | Vercel env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Supabase key | Vercel env |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Supabase key | Vercel env |
| `STRIPE_SECRET_KEY` | Stripe API | Vercel env |
| `OPENAI_API_KEY` | OpenAI API | Vercel env |

### Adding New Variables

1. Add to Vercel project settings
2. Add to `.env.example` (without values)
3. Document in this runbook
4. Redeploy for changes to take effect

---

## Database Migrations

### Prisma Migrations

```bash
# Generate migration
npx prisma migrate dev --name migration_name

# Apply to production
npx prisma migrate deploy

# Check status
npx prisma migrate status
```

### Supabase Migrations

```bash
cd auditors-dream/packages/database
# Apply migration SQL to Supabase dashboard or CLI
```

---

## Troubleshooting

### Build Fails

1. Check error message in Vercel logs
2. Common issues:
   - TypeScript errors
   - Missing dependencies
   - Environment variable issues

### Deploy Succeeds but Site Broken

1. Check browser console for errors
2. Check Sentry for error reports
3. Check Vercel function logs
4. Rollback if needed

### Database Issues

1. Check Supabase dashboard
2. Verify connection string
3. Check RLS policies
4. Check for migration issues

---

## Contacts

| Role | When to Contact |
|------|-----------------|
| User | Critical issues, cost decisions |
| Supabase Support | Database emergencies |
| Vercel Support | Deployment platform issues |
