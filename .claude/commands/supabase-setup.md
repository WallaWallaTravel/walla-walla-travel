# Supabase Setup Command

Complete the Supabase setup for Auditor's Dream as specified in CLAUDE_CODE_HANDOFF.md.

## Prerequisites

Supabase project already exists:
- **URL:** `https://gymsdluogchurhdvhqao.supabase.co`
- **Anon Key:** In `.env` files

## Setup Steps

### Step 1: Verify .env Files

```bash
# Check Operator Portal .env
cat /Users/temp/.cursor/worktrees/walla-walla-final/auditors-dream/apps/operator/.env

# Check Regulator Portal .env  
cat /Users/temp/.cursor/worktrees/walla-walla-final/auditors-dream/apps/regulator/.env
```

Both should contain:
```
VITE_SUPABASE_URL=https://gymsdluogchurhdvhqao.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Step 2: Run Database Migration

**Manual step - provide instructions to user:**

```markdown
## 📋 ACTION REQUIRED: Run Database Migration

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/gymsdluogchurhdvhqao/sql/new

2. Copy contents of:
   `/Users/temp/.cursor/worktrees/walla-walla-final/auditors-dream/packages/database/migrations/COMBINED_MIGRATION.sql`

3. Paste into SQL Editor and click "Run"

4. Verify tables created:
   - profiles
   - operators
   - drivers
   - vehicles
   - driver_inspections
   - driver_documents
   - vehicle_documents
   - accidents
   - operator_compliance_status
```

### Step 3: Create Storage Bucket

**Manual step:**
```markdown
## 📋 ACTION REQUIRED: Create Storage Bucket

1. Open Supabase Storage:
   https://supabase.com/dashboard/project/gymsdluogchurhdvhqao/storage/buckets

2. Click "New bucket"

3. Name: `compliance-documents`

4. Enable "Public bucket" if documents should be accessible without auth
   (Recommended: Keep private, use signed URLs)
```

### Step 4: Create Test User

**Manual step:**
```markdown
## 📋 ACTION REQUIRED: Create Test User

1. Open Supabase Auth:
   https://supabase.com/dashboard/project/gymsdluogchurhdvhqao/auth/users

2. Click "Add user" → "Create new user"

3. Email: `madsry@gmail.com`
   Password: (choose a secure password)

4. Click "Confirm email" after creation
```

### Step 5: Link User to Operator

**After user is created, run this SQL:**
```sql
UPDATE profiles 
SET operator_id = 'a0000000-0000-0000-0000-000000000001',
    role = 'operator'
WHERE email = 'madsry@gmail.com';
```

### Step 6: Test the Application

```bash
cd /Users/temp/.cursor/worktrees/walla-walla-final/auditors-dream/apps/operator
npm run dev
```

Open http://localhost:5173 and login with test credentials.

## Verification Checklist

```markdown
## ✅ Supabase Setup Verification

- [ ] .env files have correct credentials
- [ ] COMBINED_MIGRATION.sql executed successfully
- [ ] Storage bucket `compliance-documents` created
- [ ] Test user created and email confirmed
- [ ] User linked to operator in profiles table
- [ ] Login works at http://localhost:5173
- [ ] Dashboard shows compliance stats
- [ ] Compliance page loads requirements
```

## Troubleshooting

### Login fails
- Check .env has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Verify user email is confirmed in Supabase Auth
- Check browser console for errors

### No data showing
- Verify migration ran successfully
- Check if demo data was created (operators, drivers, vehicles)
- Verify RLS policies are correct

### Storage upload fails
- Check bucket exists and permissions are correct
- Verify authenticated user has upload permissions
