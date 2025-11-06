# 🔧 GITHUB SETUP GUIDE - Walla Walla Travel

## Step 1: Create .gitignore (Prevent sensitive data from being committed)

Run this command:

```bash
cd /Users/temp/walla-walla-final

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/
.next
out

# Production
/build
dist

# Environment variables (CRITICAL - Never commit these!)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
*.pem

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Heroku
.heroku/

# Backups
*.backup
*.bak
*.old

# Temporary files
tmp/
temp/
*.tmp
EOF
```

---

## Step 2: Create GitHub Repository

### Option A: Via GitHub Website (Easiest)
1. Go to: https://github.com/new
2. Repository name: `walla-walla-travel`
3. Description: `Driver management app for wine tour transportation - FMCSA compliant`
4. **IMPORTANT:** Choose **Private** (contains business logic)
5. Do NOT initialize with README (we have one)
6. Click "Create repository"

### Option B: Via GitHub CLI (if installed)
```bash
gh repo create walla-walla-travel --private --source=. --remote=origin
```

---

## Step 3: Initialize Git and Push

```bash
cd /Users/temp/walla-walla-final

# Initialize Git
git init

# Add all files (respecting .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Walla Walla Travel driver management app

- Next.js 15 + React 19 + TypeScript
- Heroku Postgres database integration
- Authentication system
- Driver inspection forms (pre-trip, post-trip)
- Workflow system
- Mobile-first UI components
- FMCSA compliance features
- Complete documentation system (18 files)
- Database schema with 6 tables

Status: Foundation complete, ready for compliance feature development"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/walla-walla-travel.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## Step 4: Verify Upload

```bash
# Check remote
git remote -v

# Check status
git status

# View commit history
git log --oneline
```

---

## Step 5: Future Commits (After Making Changes)

```bash
# See what changed
git status

# Add specific files
git add app/inspections/pre-trip/page.tsx
git add lib/db.ts

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "feat: add signature capture to pre-trip inspection"

# Push to GitHub
git push
```

---

## 🔐 SECURITY CHECKLIST

Before pushing, verify these are NOT committed:

```bash
# These should return nothing (empty):
git ls-files | grep .env.local      # Should be empty
git ls-files | grep node_modules    # Should be empty
git ls-files | grep .next           # Should be empty

# If any show up, add them to .gitignore and run:
git rm --cached <filename>
```

---

## 📝 COMMIT MESSAGE CONVENTIONS

Use clear, descriptive commit messages:

```bash
# Format: <type>: <description>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation only
style:    # Formatting, missing semicolons, etc.
refactor: # Code change that neither fixes a bug nor adds a feature
test:     # Adding tests
chore:    # Maintenance

# Examples:
git commit -m "feat: add 150-mile exemption tracking to HOS"
git commit -m "fix: signature canvas not capturing on iOS"
git commit -m "docs: update FMCSA compliance documentation"
```

---

## 🌿 BRANCHING STRATEGY (Optional - For Later)

```bash
# Create feature branch
git checkout -b feature/signature-capture

# Make changes, commit
git add .
git commit -m "feat: add signature capture component"

# Push feature branch
git push -u origin feature/signature-capture

# Merge back to main (after testing)
git checkout main
git merge feature/signature-capture
git push
```

---

## 🔄 BACKUP STRATEGY

```bash
# Daily backup (add to cron or run manually)
git add .
git commit -m "chore: daily backup $(date '+%Y-%m-%d')"
git push

# Create version tags for major milestones
git tag -a v1.0.0 -m "Version 1.0.0: FMCSA compliance features complete"
git push --tags
```

---

## 🆘 COMMON ISSUES

### Issue: "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/walla-walla-travel.git
```

### Issue: Accidentally committed .env.local
```bash
# Remove from Git but keep file
git rm --cached .env.local
git commit -m "chore: remove .env.local from tracking"
git push

# Make sure it's in .gitignore
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: update .gitignore"
git push
```

### Issue: Large commit (too many files)
```bash
# Commit in smaller chunks
git add app/
git commit -m "feat: add app directory"

git add lib/
git commit -m "feat: add lib directory"

git push
```

---

## ✅ VERIFICATION CHECKLIST

After setup:
- [ ] Repository created on GitHub (private)
- [ ] .gitignore created and contains .env.local
- [ ] Git initialized locally
- [ ] Initial commit created
- [ ] Remote added (origin)
- [ ] Pushed to GitHub successfully
- [ ] Can see files on GitHub website
- [ ] .env.local NOT visible on GitHub (critical!)
- [ ] node_modules/ NOT visible on GitHub

---

## 📊 NEXT STEPS

After GitHub is set up:
1. Make changes to your code
2. Test changes locally
3. Commit with descriptive message
4. Push to GitHub
5. Repeat!

---

**Run the commands above to get started!** 🚀
