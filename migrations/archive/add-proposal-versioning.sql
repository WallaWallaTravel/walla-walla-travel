-- Add versioning support to proposals for counter-proposal workflow
-- This allows tracking the negotiation history between admin and client

-- Add versioning columns to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS parent_proposal_id INTEGER REFERENCES proposals(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS is_counter_proposal BOOLEAN DEFAULT FALSE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS counter_notes TEXT; -- Admin notes when creating counter

-- Index for finding related proposals
CREATE INDEX IF NOT EXISTS idx_proposals_parent ON proposals(parent_proposal_id);

-- Add client feedback columns (for declined proposals)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_feedback TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_feedback_category VARCHAR(100);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_desired_changes TEXT;

-- Comments
COMMENT ON COLUMN proposals.parent_proposal_id IS 'Links to the original/previous proposal in a negotiation chain';
COMMENT ON COLUMN proposals.version_number IS 'Version number in the negotiation (1 = original, 2 = first counter, etc.)';
COMMENT ON COLUMN proposals.is_counter_proposal IS 'True if this proposal was created as a counter to a declined proposal';
COMMENT ON COLUMN proposals.counter_notes IS 'Admin notes explaining changes made in the counter-proposal';
COMMENT ON COLUMN proposals.client_feedback IS 'Detailed feedback from client when declining';
COMMENT ON COLUMN proposals.client_feedback_category IS 'Category of decline reason (price, dates, services, other)';
COMMENT ON COLUMN proposals.client_desired_changes IS 'What the client would like changed to accept';





