#!/bin/bash

# Setup Business Portal Database
# Run migrations for business portal tables

set -e

echo "🚀 Setting up Business Portal Database..."

# Get DATABASE_URL from .env.local
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  exit 1
fi

source .env.local

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env.local"
  exit 1
fi

echo "✓ Found DATABASE_URL"

# Run migrations
echo ""
echo "📋 Running migrations..."

# 1. Business Portal tables
echo "  1/3 Creating business portal tables..."
psql "$DATABASE_URL" -f migrations/create-business-portal.sql
echo "  ✓ Business portal tables created"

# 2. Processing jobs table
echo "  2/3 Creating processing jobs table..."
psql "$DATABASE_URL" -f migrations/create-processing-jobs.sql
echo "  ✓ Processing jobs table created"

# 3. Insert default questions
echo "  3/3 Inserting default interview questions..."
psql "$DATABASE_URL" << 'EOF'
-- Default Interview Questions for Wineries

INSERT INTO interview_questions (
  business_type, question_number, question_text, help_text, expected_duration_seconds, category
) VALUES
-- Basic Info
('winery', 1, 'Tell us about your winery. When was it founded and what makes it unique?', 
 'Share your story, founding year, and what sets you apart from other wineries.', 60, 'about'),

('winery', 2, 'What wine varieties do you specialize in?', 
 'List your signature wines and any unique or award-winning bottles.', 45, 'wines'),

('winery', 3, 'Describe your tasting experience. What should visitors expect?', 
 'Include details about the setting, number of wines tasted, food pairings, etc.', 60, 'experience'),

-- Logistics
('winery', 4, 'What are your hours of operation?', 
 'Include seasonal variations if applicable.', 30, 'logistics'),

('winery', 5, 'Do you require reservations? What is your capacity?', 
 'Help visitors know if they need to book ahead and how many guests you can accommodate.', 45, 'logistics'),

('winery', 6, 'What is your tasting fee? Are there different options or levels?', 
 'Be specific about pricing and what is included.', 45, 'pricing'),

-- Amenities
('winery', 7, 'Do you have outdoor seating or a patio?', 
 'Describe your outdoor spaces if available.', 30, 'amenities'),

('winery', 8, 'Do you allow food? Can guests bring picnics or do you offer food for purchase?', 
 'Clarify your food policy.', 45, 'amenities'),

('winery', 9, 'Is your venue wheelchair accessible?', 
 'Important for visitors with mobility needs.', 20, 'accessibility'),

-- Experiences
('winery', 10, 'Do you offer private tastings, tours, or special events?', 
 'Describe premium experiences available.', 60, 'special_experiences'),

('winery', 11, 'Do you have a wine club or mailing list?', 
 'Share details about ongoing customer relationships.', 30, 'engagement'),

-- Practical
('winery', 12, 'How should visitors book a tasting or tour? Phone, email, online?', 
 'Make it easy for visitors to know how to reserve.', 30, 'booking')

ON CONFLICT DO NOTHING;

-- Default questions for Restaurants
INSERT INTO interview_questions (
  business_type, question_number, question_text, help_text, expected_duration_seconds, category
) VALUES
('restaurant', 1, 'Tell us about your restaurant. What type of cuisine do you serve?', 
 'Share your concept, founding story, and culinary style.', 60, 'about'),

('restaurant', 2, 'What are your signature dishes or specialties?', 
 'Highlight must-try items.', 45, 'menu'),

('restaurant', 3, 'Do you accommodate dietary restrictions like gluten-free, vegan, or allergies?', 
 'Important for many visitors.', 30, 'dietary'),

('restaurant', 4, 'What are your hours and do you take reservations?', 
 'Include seasonal variations.', 30, 'logistics'),

('restaurant', 5, 'What is your price range? Average cost per person?', 
 'Help visitors budget appropriately.', 30, 'pricing'),

('restaurant', 6, 'Do you have outdoor seating?', 
 'Describe your outdoor dining if available.', 20, 'amenities'),

('restaurant', 7, 'Do you offer wine pairings or a notable wine list?', 
 'Especially relevant for wine country visitors.', 45, 'beverages')

ON CONFLICT DO NOTHING;

EOF
echo "  ✓ Default questions inserted"

echo ""
echo "✅ Business Portal Database Setup Complete!"
echo ""
echo "📊 Summary:"
echo "  • Business portal tables created"
echo "  • Processing jobs table created"
echo "  • Default interview questions inserted"
echo ""
echo "🎯 Next step: Test the upload at http://localhost:3000/contribute/TESTWINERY2025/upload"

