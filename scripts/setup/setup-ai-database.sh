#!/bin/bash

echo "🔧 Setting up AI Directory database..."
echo ""

# Get database URL
echo "📡 Getting database URL from Heroku..."
export DATABASE_URL=$(heroku config:get DATABASE_URL -a walla-walla-travel)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: Could not get DATABASE_URL from Heroku"
  echo "Please run: heroku config:get DATABASE_URL -a walla-walla-travel"
  exit 1
fi

echo "✅ Database URL obtained"
echo ""

# Run AI tables migration
echo "📊 Creating AI tables (ai_settings, ai_queries, ai_query_cache, etc.)..."
psql "$DATABASE_URL" -f migrations/create-ai-tables.sql

if [ $? -eq 0 ]; then
  echo "✅ AI tables created"
else
  echo "❌ Failed to create AI tables"
  exit 1
fi

echo ""

# Run visitor tracking migration
echo "👥 Creating visitor tracking tables (visitors, visitor_sessions, etc.)..."
psql "$DATABASE_URL" -f migrations/create-visitor-tracking.sql

if [ $? -eq 0 ]; then
  echo "✅ Visitor tracking tables created"
else
  echo "❌ Failed to create visitor tracking tables"
  exit 1
fi

echo ""

# Insert default AI settings
echo "⚙️  Creating default AI model configuration..."
psql "$DATABASE_URL" -c "INSERT INTO ai_settings (provider, model, temperature, max_tokens, system_prompt, is_active) VALUES ('openai', 'gpt-4o', 0.7, 500, 'You are an AI assistant for Walla Walla Travel, a premier wine country tour company in Walla Walla, Washington. Your role is to help visitors discover wineries, tours, and experiences that match their preferences. Be friendly, knowledgeable, and helpful. Provide specific recommendations with details.', true) ON CONFLICT (provider, model) DO NOTHING;"

if [ $? -eq 0 ]; then
  echo "✅ Default AI settings created"
else
  echo "❌ Failed to create default AI settings"
  exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure .env.local has OPENAI_API_KEY and DEEPGRAM_API_KEY"
echo "2. Restart your dev server (npm run dev)"
echo "3. Test at: http://localhost:3000/test/ai-simple-test"

