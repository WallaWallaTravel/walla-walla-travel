-- ============================================================================
-- AI Chat Configuration Table
-- Stores system prompts, partner notes, global knowledge, examples, and blocklist
-- for the AI chat concierge to use in responses.
-- ============================================================================

-- Create the ai_chat_config table
CREATE TABLE IF NOT EXISTS ai_chat_config (
  id SERIAL PRIMARY KEY,

  -- Config type determines how this entry is used
  -- 'system_prompt' - AI personality and rules
  -- 'partner_note' - Notes about specific partners (key = partner_id)
  -- 'global_knowledge' - General facts (seasonal events, road closures, etc.)
  -- 'example' - Example Q&A pairs to guide AI tone
  -- 'blocklist' - Topics or businesses to never recommend
  config_type VARCHAR(50) NOT NULL CHECK (config_type IN (
    'system_prompt',
    'partner_note',
    'global_knowledge',
    'example',
    'blocklist'
  )),

  -- Key for categorization (e.g., partner_id for notes, topic for knowledge)
  key VARCHAR(255),

  -- The actual content
  value TEXT NOT NULL,

  -- Whether this config is active (allows disabling without deleting)
  is_active BOOLEAN DEFAULT true,

  -- Priority for ordering (higher = more important)
  priority INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_chat_config_type ON ai_chat_config(config_type);
CREATE INDEX IF NOT EXISTS idx_ai_chat_config_active ON ai_chat_config(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_chat_config_key ON ai_chat_config(key) WHERE key IS NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_chat_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_chat_config_updated_at ON ai_chat_config;
CREATE TRIGGER ai_chat_config_updated_at
  BEFORE UPDATE ON ai_chat_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_config_updated_at();

-- Insert default system prompt (can be edited via admin)
INSERT INTO ai_chat_config (config_type, key, value, priority)
VALUES (
  'system_prompt',
  'default',
  'You are a local wine insider helping plan Walla Walla trips. Be warm, knowledgeable, and concise. Share one interesting detail, then ask one question. Keep responses short (2-4 sentences max). Be specific about places, not generic. Have opinions: "Honestly, if I had to pick one..."',
  100
)
ON CONFLICT DO NOTHING;

-- Insert some starter global knowledge
INSERT INTO ai_chat_config (config_type, key, value, priority)
VALUES
  ('global_knowledge', 'spring_barrel', 'Spring Barrel Weekend is typically the first weekend of May. Most wineries release new wines during this event. Visitors should book 2+ months in advance.', 80),
  ('global_knowledge', 'fall_release', 'Fall Release Weekend is typically the first weekend of November. This is when many wineries release their reserve and premium wines.', 80),
  ('global_knowledge', 'best_season', 'Peak wine tasting season is April through October. Summers can be hot (90s) so morning tastings are recommended. Fall brings harvest activity and beautiful colors.', 70)
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE ai_chat_config IS 'Stores AI chat configuration including system prompts, partner notes, knowledge base, examples, and blocklist items';
COMMENT ON COLUMN ai_chat_config.config_type IS 'Type of config: system_prompt, partner_note, global_knowledge, example, blocklist';
COMMENT ON COLUMN ai_chat_config.key IS 'Optional key for categorization (e.g., partner_id, topic name)';
COMMENT ON COLUMN ai_chat_config.value IS 'The actual content - system prompt text, note, example, etc.';
COMMENT ON COLUMN ai_chat_config.priority IS 'Higher priority items are shown first or take precedence';
