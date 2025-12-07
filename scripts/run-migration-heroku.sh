#!/bin/bash
# Run migration on Heroku Postgres using direct psql connection
# This avoids issues with Heroku CLI piping

set -e  # Exit on error

echo "🔍 Getting DATABASE_URL from Heroku..."
DATABASE_URL=$(heroku config:get DATABASE_URL --app walla-walla-travel)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: Could not get DATABASE_URL from Heroku"
  echo "Please check:"
  echo "  1. Heroku CLI is logged in: heroku auth:whoami"
  echo "  2. App name is correct: heroku apps"
  exit 1
fi

echo "✅ DATABASE_URL retrieved"
echo ""
echo "🔗 Connecting to database..."
echo "📄 Running migration: migrations/003_admin_supervisor_system.sql"
echo ""

# Run migration using direct psql connection
psql "$DATABASE_URL" -f migrations/003_admin_supervisor_system.sql

echo ""
echo "✅ Migration completed!"
echo ""
echo "📊 Verifying Ryan's admin role..."
psql "$DATABASE_URL" -c "SELECT name, email, role FROM users WHERE email = 'madsry@gmail.com';"

echo ""
echo "📊 Verifying client_services table..."
psql "$DATABASE_URL" -c "SELECT COUNT(*) as client_services_table FROM information_schema.tables WHERE table_name = 'client_services';"

echo ""
echo "📊 Verifying active_shifts view..."
psql "$DATABASE_URL" -c "SELECT COUNT(*) as active_shifts_view FROM information_schema.views WHERE table_name = 'active_shifts';"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║ ✅ MIGRATION COMPLETE - ADMIN SYSTEM READY!           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Login at: https://walla-walla-travel.up.railway.app/login"
echo "  2. Email: madsry@gmail.com"
echo "  3. Go to: https://walla-walla-travel.up.railway.app/admin/dashboard"
echo ""
