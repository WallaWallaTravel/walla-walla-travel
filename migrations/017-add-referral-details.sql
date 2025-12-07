-- Add columns to track specific referral sources (AI/LLM and social media platforms)
-- This helps us understand which AI tools and social platforms are driving the most bookings

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS specific_social_media VARCHAR(50),
ADD COLUMN IF NOT EXISTS specific_ai VARCHAR(50);

COMMENT ON COLUMN bookings.specific_social_media IS 'Specific social media platform when referral_source is social_media (facebook, instagram, twitter, tiktok, etc.)';
COMMENT ON COLUMN bookings.specific_ai IS 'Specific AI/LLM used when referral_source is ai_search (chatgpt, claude, perplexity, gemini, etc.)';

-- Add the same columns to reservations table for consistency
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS specific_social_media VARCHAR(50),
ADD COLUMN IF NOT EXISTS specific_ai VARCHAR(50);

COMMENT ON COLUMN reservations.specific_social_media IS 'Specific social media platform when referral_source is social_media';
COMMENT ON COLUMN reservations.specific_ai IS 'Specific AI/LLM used when referral_source is ai_search';




