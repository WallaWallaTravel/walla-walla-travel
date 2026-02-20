/**
 * Feature Health Test
 *
 * Inventories every feature module with its API endpoints and required tables.
 * Validates all required tables exist in the Prisma schema.
 * Fails the build if any feature that should be working is broken.
 *
 * This is a static analysis test — no database connection needed.
 * Run with: npm test -- feature-health
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Feature Registry
// ============================================================================

interface FeatureModule {
  name: string;
  description: string;
  requiredTables: string[];
  apiRoutes: string[];
}

const FEATURE_MODULES: FeatureModule[] = [
  // === Core Business ===
  {
    name: 'Bookings',
    description: 'Tour booking management (core revenue)',
    requiredTables: ['bookings', 'customers', 'booking_wineries', 'booking_timeline', 'booking_line_items'],
    apiRoutes: [
      'app/api/bookings/create/route.ts',
      'app/api/bookings/calculate-price/route.ts',
      'app/api/admin/bookings/route.ts',
    ],
  },
  {
    name: 'Payments',
    description: 'Payment processing (handles money)',
    requiredTables: ['payments', 'payment_intents', 'invoices', 'refunds'],
    apiRoutes: [
      'app/api/payments/create-intent/route.ts',
      'app/api/payments/confirm/route.ts',
    ],
  },

  // === CRM ===
  {
    name: 'CRM Contacts',
    description: 'Unified contact management',
    requiredTables: ['crm_contacts', 'crm_activities', 'users'],
    apiRoutes: [
      'app/api/admin/crm/contacts/route.ts',
      'app/api/admin/crm/contacts/[id]/route.ts',
      'app/api/admin/crm/contacts/[id]/activities/route.ts',
    ],
  },
  {
    name: 'CRM Deals',
    description: 'Sales pipeline and deal tracking',
    requiredTables: ['crm_deals', 'crm_pipeline_stages', 'crm_pipeline_templates', 'crm_deal_types'],
    apiRoutes: [
      'app/api/admin/crm/deals/route.ts',
      'app/api/admin/crm/deals/[id]/route.ts',
      'app/api/admin/crm/pipeline/route.ts',
    ],
  },
  {
    name: 'CRM Tasks',
    description: 'Follow-up task management',
    requiredTables: ['crm_tasks', 'crm_contacts'],
    apiRoutes: [
      'app/api/admin/crm/tasks/route.ts',
      'app/api/admin/crm/tasks/[id]/route.ts',
    ],
  },
  {
    name: 'CRM Dashboard',
    description: 'CRM overview and reports',
    requiredTables: ['crm_contacts', 'crm_deals', 'crm_activities', 'crm_tasks'],
    apiRoutes: [
      'app/api/admin/crm/dashboard/route.ts',
      'app/api/admin/crm/reports/lead-sources/route.ts',
      'app/api/admin/crm/reports/pipeline-velocity/route.ts',
    ],
  },
  {
    name: 'Leads Management',
    description: 'Lead tracking via CRM contacts',
    requiredTables: ['crm_contacts', 'crm_deals', 'crm_activities', 'crm_pipeline_stages', 'crm_pipeline_templates'],
    apiRoutes: [
      'app/api/admin/marketing/leads/route.ts',
      'app/api/admin/marketing/leads/[lead_id]/route.ts',
      'app/api/admin/marketing/leads/[lead_id]/activities/route.ts',
      'app/api/admin/marketing/leads/export/route.ts',
      'app/api/admin/marketing/leads/import/route.ts',
    ],
  },

  // === Trip Planner ===
  {
    name: 'Trip Planner',
    description: 'Guest-facing trip planning and sharing',
    requiredTables: ['trips', 'trip_stops', 'trip_guests', 'trip_activity_log'],
    apiRoutes: [
      'app/api/trips/route.ts',
      'app/api/trips/[shareCode]/route.ts',
      'app/api/trips/[shareCode]/stops/route.ts',
      'app/api/trips/[shareCode]/guests/route.ts',
      'app/api/trips/[shareCode]/chat/route.ts',
      'app/api/trips/[shareCode]/suggestions/route.ts',
      'app/api/trips/[shareCode]/handoff/route.ts',
      'app/api/trips/my-trips/route.ts',
      'app/api/trips/magic-link/route.ts',
    ],
  },

  // === Geology ===
  {
    name: 'Geology Education',
    description: 'Geology content management and public display',
    requiredTables: ['geology_topics', 'geology_facts', 'geology_sites', 'geology_ai_guidance', 'geology_tours'],
    apiRoutes: [
      'app/api/admin/geology/topics/route.ts',
      'app/api/admin/geology/facts/route.ts',
      'app/api/admin/geology/sites/route.ts',
      'app/api/admin/geology/guidance/route.ts',
      'app/api/gpt/geology-topics/route.ts',
      'app/api/gpt/geology-sites/route.ts',
      'app/api/gpt/geology-tours/route.ts',
    ],
  },

  // === Marketing ===
  {
    name: 'Marketing Campaigns',
    description: 'Multi-channel campaign orchestration',
    requiredTables: ['marketing_campaigns', 'campaign_items', 'scheduled_posts'],
    apiRoutes: [
      'app/api/admin/marketing/campaigns/route.ts',
      'app/api/admin/marketing/campaigns/[id]/route.ts',
      'app/api/admin/marketing/campaigns/[id]/approve/route.ts',
    ],
  },
  {
    name: 'Social Media',
    description: 'Social media scheduling and analytics',
    requiredTables: ['scheduled_posts', 'social_accounts', 'content_suggestions'],
    apiRoutes: [
      'app/api/admin/marketing/social-posts/route.ts',
      'app/api/admin/marketing/social-accounts/route.ts',
      'app/api/admin/marketing/suggestions/route.ts',
    ],
  },
  {
    name: 'Marketing Intelligence',
    description: 'Trends, SEO, content refresh, blog generation',
    requiredTables: ['trending_topics', 'content_refresh_suggestions', 'blog_drafts', 'marketing_strategies'],
    apiRoutes: [
      'app/api/admin/marketing/trending/route.ts',
      'app/api/admin/marketing/content-refresh/route.ts',
      'app/api/admin/marketing/blog-generator/route.ts',
      'app/api/admin/marketing/strategies/route.ts',
    ],
  },
  {
    name: 'Content Approvals',
    description: 'AI content approval and learning',
    requiredTables: ['content_approvals', 'ai_learning_preferences'],
    apiRoutes: [
      'app/api/admin/marketing/approvals/route.ts',
      'app/api/admin/marketing/approvals/preferences/route.ts',
    ],
  },

  // === Driver Operations ===
  {
    name: 'Driver Breaks',
    description: 'Break tracking for HOS compliance',
    requiredTables: ['break_records', 'time_cards', 'users'],
    apiRoutes: [
      'app/api/workflow/breaks/route.ts',
    ],
  },
  {
    name: 'Driver Status',
    description: 'Driver status tracking and audit trail',
    requiredTables: ['driver_status_logs', 'time_cards', 'users'],
    apiRoutes: [
      'app/api/workflow/status/route.ts',
    ],
  },
  {
    name: 'Vehicle Odometer',
    description: 'Odometer tracking and service alerts',
    requiredTables: ['mileage_logs', 'vehicle_alerts', 'vehicles'],
    apiRoutes: [
      'app/api/vehicles/[id]/odometer/route.ts',
    ],
  },
  {
    name: 'DVIR',
    description: 'Driver Vehicle Inspection Reports',
    requiredTables: ['dvir_reports', 'inspections', 'vehicles'],
    apiRoutes: [
      'app/api/inspections/dvir/route.ts',
    ],
  },

  // === Contact ===
  {
    name: 'Contact Inquiries',
    description: 'Contact form submissions linked to CRM',
    requiredTables: ['contact_inquiries', 'crm_contacts'],
    apiRoutes: [
      'app/api/contact/route.ts',
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

function parsePrismaModels(schemaPath: string): Set<string> {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const models = new Set<string>();

  for (const line of content.split('\n')) {
    const match = line.trim().match(/^model\s+(\w+)\s*\{/);
    if (match) {
      models.add(match[1]);
    }
  }

  return models;
}

// ============================================================================
// Tests
// ============================================================================

describe('Feature Health', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const schemaPath = path.join(rootDir, 'prisma/schema.prisma');

  let schemaModels: Set<string>;

  beforeAll(() => {
    schemaModels = parsePrismaModels(schemaPath);
  });

  it('should have parsed a substantial number of models', () => {
    expect(schemaModels.size).toBeGreaterThan(100);
  });

  // ========================================================================
  // TABLE EXISTENCE: Every feature's required tables must be in the schema
  // ========================================================================

  describe.each(FEATURE_MODULES)('$name', (feature) => {
    it(`should have all required tables in Prisma schema`, () => {
      const missingTables = feature.requiredTables.filter(
        (table) => !schemaModels.has(table)
      );

      if (missingTables.length > 0) {
        throw new Error(
          `Feature "${feature.name}" is BROKEN — missing tables: ${missingTables.join(', ')}\n` +
          `  Description: ${feature.description}\n` +
          `  Required tables: ${feature.requiredTables.join(', ')}\n` +
          `  Missing: ${missingTables.join(', ')}`
        );
      }
    });

    it(`should have API route files present`, () => {
      const missingRoutes = feature.apiRoutes.filter(
        (route) => !fs.existsSync(path.join(rootDir, route))
      );

      if (missingRoutes.length > 0) {
        throw new Error(
          `Feature "${feature.name}" has missing API route files:\n` +
          missingRoutes.map((r) => `  - ${r}`).join('\n')
        );
      }
    });
  });

  // ========================================================================
  // SUMMARY: Overall feature health report
  // ========================================================================

  it('should produce a feature health summary', () => {
    const results: { name: string; status: string; missing: string[] }[] = [];

    for (const feature of FEATURE_MODULES) {
      const missingTables = feature.requiredTables.filter(
        (table) => !schemaModels.has(table)
      );
      const missingRoutes = feature.apiRoutes.filter(
        (route) => !fs.existsSync(path.join(rootDir, route))
      );

      let status: string;
      if (missingTables.length === 0 && missingRoutes.length === 0) {
        status = 'WORKING';
      } else if (missingTables.length > 0) {
        status = 'BROKEN';
      } else {
        status = 'INCOMPLETE';
      }

      results.push({
        name: feature.name,
        status,
        missing: [...missingTables.map((t) => `table:${t}`), ...missingRoutes.map((r) => `route:${r}`)],
      });
    }

    const working = results.filter((r) => r.status === 'WORKING');
    const broken = results.filter((r) => r.status === 'BROKEN');
    const incomplete = results.filter((r) => r.status === 'INCOMPLETE');

    console.log('\n📊 Feature Health Summary');
    console.log(`   ✅ WORKING: ${working.length}/${results.length} features`);
    if (broken.length > 0) {
      console.log(`   ❌ BROKEN: ${broken.length} features`);
      for (const f of broken) {
        console.log(`      - ${f.name}: missing ${f.missing.join(', ')}`);
      }
    }
    if (incomplete.length > 0) {
      console.log(`   ⚠️  INCOMPLETE: ${incomplete.length} features`);
      for (const f of incomplete) {
        console.log(`      - ${f.name}: missing ${f.missing.join(', ')}`);
      }
    }

    // All features MUST be working
    expect(broken).toEqual([]);
  });
});
