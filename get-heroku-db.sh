#!/bin/bash

echo "🔧 Heroku Database URL Setup"
echo ""
echo "Step 1: Get your Heroku database URL"
echo "Running: heroku config:get DATABASE_URL -a walla-walla-travel"
echo ""

DATABASE_URL=$(heroku config:get DATABASE_URL -a walla-walla-travel 2>&1)

if [[ $DATABASE_URL == *"postgres://"* ]]; then
  echo "✅ Found Heroku database URL!"
  echo ""
  echo "Step 2: Updating .env.local..."
  
  # Create backup
  if [ -f .env.local ]; then
    cp .env.local .env.local.backup
    echo "✅ Backed up existing .env.local to .env.local.backup"
  fi
  
  # Write new .env.local
  cat > .env.local << EOF
# Heroku PostgreSQL Database
DATABASE_URL="${DATABASE_URL}"

# Supabase (if you still need these)
NEXT_PUBLIC_SUPABASE_URL=https://xqzrkuaksegllimrqwca.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxenJrdWFrc2VnbGxpbXJxd2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODcxNjUsImV4cCI6MjA3MjA2MzE2NX0.FMvvAXd3JlVaXboqGkcWmwSyQjwm-WMizfu0F5qFQlo
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxenJrdWFrc2VnbGxpbXJxd2NhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ4NzE2NSwiZXhwIjoyMDcyMDYzMTY1fQ.1OIY_MVKYKwLJyLWZyXrTi6S9NIecD19Ge-I-HKnFoQ
EOF
  
  echo "✅ Updated .env.local with Heroku database URL"
  echo ""
  echo "Step 3: Now run the database setup:"
  echo "npm run db:setup"
  echo ""
else
  echo "❌ Could not get Heroku database URL"
  echo ""
  echo "Error: $DATABASE_URL"
  echo ""
  echo "Manual steps:"
  echo "1. Make sure you're logged in to Heroku: heroku login"
  echo "2. Try again: heroku config:get DATABASE_URL -a walla-walla-travel"
  echo "3. Manually add the URL to .env.local"
  echo ""
fi
