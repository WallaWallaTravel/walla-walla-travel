-- ============================================================================
-- SMART DIRECTORY: Verified Data Pattern
-- ============================================================================
-- Purpose: Extend existing wine directory with verified Q&A and smart lookup
-- Pattern: Embeddings for MATCHING, verified content for ANSWERS
-- ============================================================================

-- ============================================================================
-- GENERAL FAQ TABLE (Walla Walla region questions)
-- ============================================================================
-- This extends winery_faqs with region-wide questions about wine touring,
-- best practices, seasonal info, etc.

CREATE TABLE IF NOT EXISTS directory_faqs (
    id SERIAL PRIMARY KEY,

    -- Scope: NULL = general region, or link to specific entity
    winery_id INTEGER REFERENCES wineries(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,

    -- The Question
    canonical_question TEXT NOT NULL,
    question_variations TEXT[] DEFAULT '{}',

    -- The Verified Answer
    answer_text TEXT NOT NULL,
    answer_summary TEXT,

    -- Categorization
    category VARCHAR(100) NOT NULL,              -- 'visiting', 'wines', 'logistics', 'seasonal', 'accessibility'
    tags TEXT[] DEFAULT '{}',

    -- Source/Verification
    source TEXT,                                  -- Where this info came from
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by TEXT,
    is_verified BOOLEAN DEFAULT false,

    -- Temporal validity
    valid_from DATE,                              -- For seasonal info
    valid_until DATE,
    is_seasonal BOOLEAN DEFAULT false,

    -- Search
    embedding vector(1536),

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: at most one entity link
    CONSTRAINT single_entity_link CHECK (
        (winery_id IS NULL AND business_id IS NULL) OR
        (winery_id IS NOT NULL AND business_id IS NULL) OR
        (winery_id IS NULL AND business_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_directory_faqs_winery ON directory_faqs(winery_id);
CREATE INDEX IF NOT EXISTS idx_directory_faqs_business ON directory_faqs(business_id);
CREATE INDEX IF NOT EXISTS idx_directory_faqs_category ON directory_faqs(category);
CREATE INDEX IF NOT EXISTS idx_directory_faqs_active ON directory_faqs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_directory_faqs_seasonal ON directory_faqs(is_seasonal, valid_from, valid_until)
    WHERE is_seasonal = true;

-- ============================================================================
-- VERIFIED RECOMMENDATIONS (Curated, not AI-generated)
-- ============================================================================
-- Pre-built recommendations that can be returned based on user criteria

CREATE TABLE IF NOT EXISTS verified_recommendations (
    id SERIAL PRIMARY KEY,

    -- What this recommendation answers
    scenario TEXT NOT NULL,                       -- 'first-time visitor', 'wine club enthusiast', 'family with kids', etc.
    scenario_criteria JSONB,                      -- Structured criteria for matching

    -- The Recommendation
    title TEXT NOT NULL,
    recommendation_text TEXT NOT NULL,
    recommendation_summary TEXT,

    -- Linked entities (ordered by recommendation priority)
    winery_ids INTEGER[] DEFAULT '{}',
    business_ids INTEGER[] DEFAULT '{}',

    -- Why this recommendation
    rationale TEXT,

    -- Metadata
    ideal_duration_hours DECIMAL(4,1),
    best_time_of_year TEXT[],                     -- ['spring', 'fall']
    difficulty_level VARCHAR(50),                 -- 'easy', 'moderate', 'full_day'
    price_range VARCHAR(20),                      -- '$', '$$', '$$$', '$$$$'

    -- Verification
    curated_by TEXT,
    curated_at TIMESTAMPTZ DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT false,
    last_reviewed_at TIMESTAMPTZ,

    -- Search
    embedding vector(1536),

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verified_recs_scenario ON verified_recommendations(scenario);
CREATE INDEX IF NOT EXISTS idx_verified_recs_active ON verified_recommendations(is_active) WHERE is_active = true;

-- ============================================================================
-- SMART DIRECTORY QUERY LOG
-- ============================================================================
-- Track all queries for improving matching and identifying gaps

CREATE TABLE IF NOT EXISTS directory_query_log (
    id SERIAL PRIMARY KEY,

    -- The query
    query_text TEXT NOT NULL,
    query_type VARCHAR(50),                       -- 'faq', 'recommendation', 'winery_search', 'event_search'

    -- Matching results
    matched_faq_id INTEGER REFERENCES directory_faqs(id),
    matched_recommendation_id INTEGER REFERENCES verified_recommendations(id),
    matched_winery_ids INTEGER[] DEFAULT '{}',
    matched_business_ids INTEGER[] DEFAULT '{}',
    match_confidence DECIMAL(5, 4),

    -- What was shown
    response_type VARCHAR(50),                    -- 'faq_answer', 'recommendation', 'search_results', 'no_match'
    response_summary TEXT,

    -- User feedback
    was_helpful BOOLEAN,
    user_feedback TEXT,

    -- Context
    session_id TEXT,
    user_id INTEGER,

    -- Performance
    response_time_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_directory_log_type ON directory_query_log(query_type);
CREATE INDEX IF NOT EXISTS idx_directory_log_date ON directory_query_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_directory_log_no_match ON directory_query_log(response_type)
    WHERE response_type = 'no_match';
CREATE INDEX IF NOT EXISTS idx_directory_log_unhelpful ON directory_query_log(was_helpful)
    WHERE was_helpful = false;

-- ============================================================================
-- HELPER FUNCTION: Smart Directory Search
-- ============================================================================

CREATE OR REPLACE FUNCTION search_directory(
    query_text TEXT,
    query_embedding vector(1536),
    search_type TEXT DEFAULT 'all',              -- 'faq', 'winery', 'recommendation', 'all'
    limit_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    result_type TEXT,
    result_id INTEGER,
    title TEXT,
    content TEXT,
    confidence DECIMAL,
    metadata JSONB
) AS $$
BEGIN
    -- FAQ search
    IF search_type IN ('faq', 'all') THEN
        RETURN QUERY
        SELECT
            'faq'::TEXT,
            f.id,
            f.canonical_question,
            f.answer_text,
            (1 - (f.embedding <=> query_embedding))::DECIMAL,
            jsonb_build_object(
                'category', f.category,
                'is_verified', f.is_verified,
                'winery_id', f.winery_id
            )
        FROM directory_faqs f
        WHERE f.is_active = true
            AND (f.is_seasonal = false OR (CURRENT_DATE BETWEEN COALESCE(f.valid_from, '1900-01-01') AND COALESCE(f.valid_until, '2100-12-31')))
        ORDER BY f.embedding <=> query_embedding
        LIMIT limit_results;
    END IF;

    -- Winery search
    IF search_type IN ('winery', 'all') THEN
        RETURN QUERY
        SELECT
            'winery'::TEXT,
            w.id,
            w.name,
            COALESCE(
                (SELECT string_agg(wc.content, ' ') FROM winery_content wc WHERE wc.winery_id = w.id LIMIT 1),
                ''
            ),
            (1 - (w.embedding <=> query_embedding))::DECIMAL,
            jsonb_build_object(
                'ava', w.ava,
                'is_featured', w.is_featured,
                'tasting_room_fee', w.tasting_room_fee
            )
        FROM wineries w
        WHERE w.is_active = true
            AND w.embedding IS NOT NULL
        ORDER BY w.embedding <=> query_embedding
        LIMIT limit_results;
    END IF;

    -- Recommendation search
    IF search_type IN ('recommendation', 'all') THEN
        RETURN QUERY
        SELECT
            'recommendation'::TEXT,
            r.id,
            r.title,
            r.recommendation_text,
            (1 - (r.embedding <=> query_embedding))::DECIMAL,
            jsonb_build_object(
                'scenario', r.scenario,
                'duration_hours', r.ideal_duration_hours,
                'price_range', r.price_range
            )
        FROM verified_recommendations r
        WHERE r.is_active = true
            AND r.embedding IS NOT NULL
        ORDER BY r.embedding <=> query_embedding
        LIMIT limit_results;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA: General FAQ
-- ============================================================================

INSERT INTO directory_faqs (
    canonical_question,
    question_variations,
    answer_text,
    answer_summary,
    category,
    tags,
    verified_by,
    is_verified
) VALUES
(
    'What is the best time of year to visit Walla Walla wine country?',
    ARRAY[
        'When should I visit Walla Walla?',
        'Best season for wine tasting in Walla Walla',
        'Peak wine season Walla Walla'
    ],
    'The best time to visit Walla Walla wine country depends on your interests:

**Spring (April-May)**: Beautiful wildflowers, barrel tastings, and Spring Release Weekend. Fewer crowds, but some wineries have limited hours.

**Summer (June-August)**: All wineries open, outdoor patios perfect for tasting. Book accommodations early as this is peak tourist season.

**Fall (September-October)**: Harvest season! Watch grapes being picked and crushed. Fall Release Weekend is a highlight. Colors are stunning.

**Winter (November-March)**: Quiet and intimate. Many wineries offer barrel tastings and special library wine access. Some smaller wineries close for the season.

Most wineries are open year-round, but always check hours before visiting in winter months.',
    'Each season offers unique experiences: Spring for releases, Summer for outdoor tasting, Fall for harvest, Winter for intimate visits.',
    'visiting',
    ARRAY['seasonal', 'planning', 'first-time'],
    'Initial Data Load',
    true
),
(
    'How many wineries can I visit in one day?',
    ARRAY[
        'How many tasting rooms per day?',
        'Wine tasting pace recommendations',
        'Itinerary planning for wine tasting'
    ],
    'For an enjoyable experience, we recommend visiting 3-5 wineries per day. Here''s why:

**Realistic Timeline**:
- Average tasting: 45-60 minutes
- Travel between wineries: 10-20 minutes
- Lunch break: 60-90 minutes

**Sample Day**:
- 11:00 AM: First winery
- 12:30 PM: Lunch at winery or restaurant
- 2:00 PM: Second winery
- 3:30 PM: Third winery
- 5:00 PM: Fourth winery (if energy permits)

**Tips**:
- Book reservations at popular wineries
- Many wineries share food or purchase wine to stay refreshed
- Consider a designated driver or professional tour service
- Don''t rush - the stories and connections are part of the experience',
    'We recommend 3-5 wineries per day, allowing 45-60 minutes per tasting plus travel and lunch.',
    'visiting',
    ARRAY['planning', 'logistics', 'first-time'],
    'Initial Data Load',
    true
),
(
    'Are dogs allowed at Walla Walla wineries?',
    ARRAY[
        'Pet-friendly wineries Walla Walla',
        'Can I bring my dog wine tasting?',
        'Dog-friendly tasting rooms'
    ],
    'Many Walla Walla wineries welcome well-behaved dogs on their outdoor patios. Policies vary by winery:

**Generally Dog-Friendly** (outdoor patios):
- Wineries with outdoor seating often allow leashed dogs
- Some provide water bowls and treats
- Always ask before bringing pets inside tasting rooms

**Service Animals**: All wineries accommodate service animals as required by law.

**Tips**:
- Call ahead to confirm current pet policy
- Bring water and a portable bowl
- Keep dogs on leash at all times
- Be prepared for "no dogs inside" policies
- Summer can be hot - ensure shade and water

We maintain a list of dog-friendly wineries - ask your tour guide or check our directory filter.',
    'Many wineries welcome dogs on outdoor patios. Always call ahead to confirm, and keep dogs leashed.',
    'visiting',
    ARRAY['pets', 'dog-friendly', 'accessibility'],
    'Initial Data Load',
    true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE DATA: Verified Recommendations
-- ============================================================================

INSERT INTO verified_recommendations (
    scenario,
    scenario_criteria,
    title,
    recommendation_text,
    recommendation_summary,
    winery_ids,
    ideal_duration_hours,
    best_time_of_year,
    difficulty_level,
    price_range,
    rationale,
    curated_by,
    is_verified
) VALUES
(
    'first-time visitor',
    '{"experience_level": "beginner", "time_available": "full_day"}',
    'The Essential Walla Walla Experience',
    'For your first visit to Walla Walla wine country, we recommend starting downtown and working your way out:

**Morning (Downtown)**:
Start at a downtown tasting room for a gentle introduction. Many downtown locations offer a curated selection of wines from multiple producers.

**Midday (Airport District)**:
Head to the Airport District, where you can walk between multiple tasting rooms. This is the heart of Walla Walla''s wine scene with easy parking and varied styles.

**Afternoon (Valley Vineyards)**:
Venture into the valley to a winery with estate vineyards. Seeing where the grapes grow adds context to what you''re tasting.

**Evening**:
Return downtown for dinner. Many restaurants have extensive local wine lists.

This progression gives you urban convenience, walkable variety, and vineyard authenticity all in one day.',
    'Start downtown, explore the Airport District, then visit a valley vineyard. Perfect introduction to all facets of Walla Walla wine.',
    '{}',
    8.0,
    ARRAY['spring', 'summer', 'fall'],
    'easy',
    '$$',
    'This itinerary introduces visitors to the three distinct wine tasting experiences in Walla Walla: downtown convenience, Airport District walkability, and valley estate authenticity.',
    'Initial Data Load',
    true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE directory_faqs IS
'Pre-verified FAQ entries for the Smart Directory. These answers are curated and verified,
not AI-generated. The embedding column is for matching user queries to the closest FAQ,
but the answer_text is returned exactly as stored.';

COMMENT ON TABLE verified_recommendations IS
'Curated, human-verified recommendations for different visitor scenarios. Each recommendation
links to specific wineries/businesses and includes rationale. Not AI-generated.';

COMMENT ON FUNCTION search_directory IS
'Unified search function for the Smart Directory. Uses embeddings to find the best matches
across FAQs, wineries, and recommendations. Returns structured results with confidence scores.
The content returned is always from verified database entries - never AI-generated.';
