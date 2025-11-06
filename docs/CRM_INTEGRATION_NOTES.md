# CRM Integration Notes

## Overview
Future CRM system to track client history, preferences, and strategic marketing opportunities.

## Key Data Points to Track

### 1. Pricing Override History
**Source:** `proposals.service_items[].pricing_override.override_reason`

**Use Cases:**
- Track clients who receive discounts (corporate, repeat customer, competitive match)
- Identify price-sensitive clients for targeted marketing
- Analyze discount patterns to optimize pricing strategy
- Flag VIP/repeat customers for special treatment

**Example Queries:**
- "Show all clients who received corporate discounts"
- "Find clients who got competitive match pricing"
- "List repeat customers and their discount history"

### 2. Client Segmentation
Based on override reasons, segment clients into:
- **Corporate Clients** - Bulk/volume discounts
- **Repeat Customers** - Loyalty discounts
- **Price Shoppers** - Competitive match pricing
- **VIP/Premium** - Willing to pay premium rates
- **Seasonal** - Peak vs. off-peak pricing sensitivity

### 3. Strategic Marketing Opportunities

#### Repeat Customer Campaign
- Identify clients with "repeat customer" override reasons
- Send loyalty rewards, exclusive offers
- Personalized thank-you messages

#### Corporate Outreach
- Track companies that booked before
- Identify decision-makers
- Tailor B2B packages based on past bookings

#### Win-Back Campaign
- Clients who got competitive match pricing
- May be at risk of switching
- Proactive retention offers

#### Upsell Opportunities
- Clients who accepted premium pricing
- Likely candidates for add-ons (photography, special services)
- Target for multi-day/luxury packages

### 4. Data Structure (Future CRM Schema)

```sql
-- Client Profile Table
CREATE TABLE crm_clients (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(255),
  client_email VARCHAR(255) UNIQUE,
  client_phone VARCHAR(50),
  client_company VARCHAR(255),
  
  -- Segmentation
  client_segment VARCHAR(50), -- 'corporate', 'repeat', 'vip', 'price_sensitive'
  lifetime_value DECIMAL(10,2),
  total_bookings INTEGER DEFAULT 0,
  
  -- Preferences
  preferred_services JSONB,
  price_sensitivity VARCHAR(20), -- 'low', 'medium', 'high'
  
  -- Marketing
  marketing_consent BOOLEAN DEFAULT FALSE,
  last_contact_date TIMESTAMP,
  next_follow_up_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing Override History Table
CREATE TABLE crm_pricing_overrides (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES crm_clients(id),
  proposal_id INTEGER REFERENCES proposals(id),
  
  service_type VARCHAR(50),
  standard_price DECIMAL(10,2),
  override_price DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  
  override_reason TEXT,
  override_category VARCHAR(50), -- 'corporate_discount', 'repeat_customer', 'competitive_match', 'seasonal', 'vip'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Interaction Log
CREATE TABLE crm_interactions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES crm_clients(id),
  
  interaction_type VARCHAR(50), -- 'proposal_sent', 'proposal_accepted', 'service_completed', 'follow_up', 'complaint', 'referral'
  interaction_notes TEXT,
  interaction_outcome VARCHAR(50),
  
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing Campaigns
CREATE TABLE crm_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_name VARCHAR(255),
  campaign_type VARCHAR(50), -- 'repeat_customer', 'corporate_outreach', 'win_back', 'upsell'
  target_segment VARCHAR(50),
  
  start_date DATE,
  end_date DATE,
  
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Automated Workflows (Future)

#### Workflow 1: Repeat Customer Detection
```
TRIGGER: Proposal accepted
IF: Client has 2+ previous bookings
THEN: 
  - Tag as "repeat customer"
  - Apply 10% loyalty discount automatically
  - Send thank-you email
  - Add to VIP list
```

#### Workflow 2: Corporate Lead Nurturing
```
TRIGGER: Corporate discount applied
IF: First-time corporate client
THEN:
  - Create company profile
  - Schedule follow-up in 3 months
  - Add to corporate newsletter
  - Assign account manager
```

#### Workflow 3: Price Match Alert
```
TRIGGER: Competitive match override
IF: Discount > 15%
THEN:
  - Alert admin
  - Flag for retention campaign
  - Schedule check-in call
  - Offer value-add services
```

#### Workflow 4: Upsell Opportunity
```
TRIGGER: Service completed
IF: Client accepted premium pricing OR added additional services
THEN:
  - Tag as "high-value"
  - Send photography package offer
  - Suggest multi-day tours
  - Add to premium marketing list
```

### 6. Reporting & Analytics (Future Dashboard)

#### Client Lifetime Value
- Total revenue per client
- Average booking value
- Booking frequency
- Discount history

#### Pricing Analysis
- Most common override reasons
- Average discount percentage by segment
- Price sensitivity by service type
- Seasonal pricing trends

#### Marketing ROI
- Campaign performance by segment
- Conversion rates by discount type
- Customer acquisition cost
- Retention rate by segment

### 7. Integration Points

#### Current System → CRM
- **Proposals Table** → Extract client info, pricing overrides
- **Bookings Table** → Track completed services, revenue
- **Service Items** → Analyze service preferences
- **Override Reasons** → Segment clients, trigger workflows

#### CRM → Current System
- **Client Profiles** → Auto-fill proposal forms
- **Discount Rules** → Suggest appropriate pricing
- **Marketing Campaigns** → Track source of new bookings
- **Follow-up Tasks** → Remind admin to contact clients

### 8. Privacy & Compliance

- **GDPR/Privacy Compliance**
  - Obtain marketing consent
  - Allow data export/deletion
  - Secure storage of personal data
  
- **Data Retention**
  - Keep override reasons for 7 years (business records)
  - Archive old campaigns after 2 years
  - Anonymize data for analytics

### 9. Quick Wins (Phase 1)

Before building full CRM:
1. **Export Override Reasons** - Simple report of all pricing overrides
2. **Client Tagging** - Manual tags in proposals (corporate, repeat, etc.)
3. **Email Templates** - Pre-written follow-ups for each segment
4. **Simple Dashboard** - Count of clients by segment

### 10. Future Enhancements

- **AI-Powered Insights**
  - Predict client churn risk
  - Recommend optimal pricing
  - Suggest best time to follow up
  
- **Integration with Email Marketing**
  - Mailchimp/Constant Contact sync
  - Automated drip campaigns
  
- **Mobile App**
  - Quick client lookup
  - On-the-go notes/interactions
  
- **Referral Tracking**
  - Track who referred whom
  - Automated referral rewards

---

## Notes

The `override_reason` field is the foundation for building a powerful CRM system. By capturing WHY pricing was adjusted, we can:
- Understand client behavior
- Optimize pricing strategy
- Personalize marketing
- Improve retention
- Increase lifetime value

This data is gold for strategic decision-making! 💰

