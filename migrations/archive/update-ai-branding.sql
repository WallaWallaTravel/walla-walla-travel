-- Update AI Directory branding to Walla Walla Valley Travel Guide
-- Run this after renaming is complete

-- Update system prompts in ai_settings
UPDATE ai_settings
SET system_prompt = REPLACE(
  REPLACE(
    COALESCE(system_prompt, 'You are an AI assistant for Walla Walla Travel'),
    'AI assistant',
    'the Walla Walla Valley Travel Guide'
  ),
  'Walla Walla, Washington',
  'the Walla Walla Valley (Washington and Oregon)'
)
WHERE system_prompt IS NOT NULL;

-- Update default system prompt if it hasn't been customized
UPDATE ai_settings
SET system_prompt = 'You are the Walla Walla Valley Travel Guide, an intelligent assistant for Walla Walla Travel, a premier wine country tour company in the Walla Walla Valley. 

Your role is to help visitors discover wineries, tours, and experiences that match their preferences across the entire Walla Walla Valley (Washington and Oregon).

Be friendly, knowledgeable, and helpful. Provide specific recommendations with details. If you don''t know something, be honest and suggest contacting the office.'
WHERE system_prompt LIKE '%AI assistant%'
   OR system_prompt IS NULL;

-- Commit changes
COMMIT;

