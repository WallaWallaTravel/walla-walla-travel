#!/bin/bash

# WALLA WALLA TRAVEL - DATABASE SETUP SCRIPT
# Applies the time card schema to Heroku Postgres

HEROKU_APP="walla-walla-travel"

echo "🗄️ Setting up database schema on Heroku..."
echo "App: $HEROKU_APP"
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found!"
    echo "Install from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged in to Heroku"
    echo "Run: heroku login"
    exit 1
fi

echo "✅ Heroku CLI ready"
echo ""

# Apply the schema
echo "📊 Applying database schema..."
echo "This will create tables for:"
echo "  - time_cards (daily time tracking)"
echo "  - daily_trips (distance tracking)"
echo "  - monthly_exemption_status (150-mile rule)"
echo "  - weekly_hos (hours of service)"
echo "  - company_info (USDOT #3603851)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    heroku pg:psql -a $HEROKU_APP < database-setup-timecards.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Database schema applied successfully!"
        echo ""
        echo "📊 Verifying setup..."
        heroku pg:psql -a $HEROKU_APP -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('time_cards', 'daily_trips', 'monthly_exemption_status', 'weekly_hos') ORDER BY table_name;"
        echo ""
        echo "✅ Database ready for time card system!"
    else
        echo ""
        echo "❌ Error applying schema. Check output above."
        exit 1
    fi
else
    echo "⏸️  Cancelled"
    exit 0
fi
