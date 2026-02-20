/**
 * Backfill CRM Contacts Script
 *
 * This script syncs existing consultations and corporate requests to CRM contacts.
 * It finds records that don't have associated CRM contacts and creates them.
 *
 * Run with: npx tsx scripts/backfill-crm-contacts.ts
 *
 * Options:
 *   --dry-run    Show what would be created without actually creating
 *   --verbose    Show detailed output for each record
 */

import * as dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

interface ConsultationRecord {
  id: number;
  share_code: string;
  title: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  trip_type: string;
  expected_guests: number;
  start_date: string | null;
  end_date: string | null;
  handoff_notes: string | null;
}

interface CorporateRequestRecord {
  id: number;
  request_number: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  event_type: string;
  party_size: number;
  preferred_dates: string | null;
  budget_range: string | null;
  crm_contact_id: number | null;
  crm_deal_id: number | null;
}

async function getDefaultPipelineStageId(): Promise<number | null> {
  const result = await pool.query(`
    SELECT ps.id
    FROM crm_pipeline_stages ps
    JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
    WHERE (pt.brand = 'walla_walla_travel' OR pt.brand IS NULL)
      AND ps.is_won = false AND ps.is_lost = false
    ORDER BY pt.is_default DESC, ps.sort_order ASC
    LIMIT 1
  `);
  return result.rows[0]?.id || null;
}

async function findOrCreateContact(
  email: string,
  name: string,
  phone: string | null,
  contactType: 'individual' | 'corporate',
  source: string,
  sourceDetail: string,
  company?: string
): Promise<number> {
  // Check if contact exists
  const existing = await pool.query(
    `SELECT id FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  if (existing.rows.length > 0) {
    if (VERBOSE) {
      console.log(`  → Found existing contact #${existing.rows[0].id} for ${email}`);
    }
    return existing.rows[0].id;
  }

  // Create new contact
  const result = await pool.query(
    `INSERT INTO crm_contacts (
      email, name, phone, company, contact_type, lifecycle_stage,
      lead_temperature, source, source_detail, brand_id
    ) VALUES ($1, $2, $3, $4, $5, 'lead', $6, $7, $8, 1)
    RETURNING id`,
    [
      email,
      name,
      phone,
      company || null,
      contactType,
      contactType === 'corporate' ? 'hot' : 'warm',
      source,
      sourceDetail,
    ]
  );

  if (VERBOSE) {
    console.log(`  → Created new contact #${result.rows[0].id} for ${email}`);
  }

  return result.rows[0].id;
}

async function backfillConsultations() {
  console.log('\n📋 Backfilling Consultations (Trip Handoffs)...\n');

  // Find consultations without CRM deals
  const result = await pool.query(`
    SELECT
      t.id, t.share_code, t.title, t.owner_name, t.owner_email, t.owner_phone,
      t.trip_type, t.expected_guests, t.start_date, t.end_date, t.handoff_notes
    FROM trips t
    WHERE t.handoff_requested_at IS NOT NULL
      AND t.owner_email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM crm_deals d WHERE d.consultation_id = t.id
      )
    ORDER BY t.handoff_requested_at DESC
  `);

  const consultations: ConsultationRecord[] = result.rows;
  console.log(`Found ${consultations.length} consultations without CRM deals\n`);

  if (consultations.length === 0) {
    console.log('✅ All consultations are already synced!\n');
    return { created: 0, skipped: 0 };
  }

  const stageId = await getDefaultPipelineStageId();
  if (!stageId) {
    console.error('❌ No pipeline stage found. Please run migrations first.');
    return { created: 0, skipped: consultations.length };
  }

  let created = 0;
  let skipped = 0;

  for (const consultation of consultations) {
    console.log(`Processing: "${consultation.title}" (${consultation.share_code})`);
    console.log(`  Owner: ${consultation.owner_name} <${consultation.owner_email}>`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would create CRM contact and deal\n`);
      created++;
      continue;
    }

    try {
      // Find or create contact
      const contactId = await findOrCreateContact(
        consultation.owner_email,
        consultation.owner_name || 'Unknown',
        consultation.owner_phone,
        'individual',
        'consultation',
        `Trip: ${consultation.title}`
      );

      // Create deal
      const dealTitle = consultation.title || `Trip Consultation - ${consultation.owner_name}`;
      const dealResult = await pool.query(
        `INSERT INTO crm_deals (
          contact_id, stage_id, brand, title, description,
          party_size, expected_tour_date, consultation_id, brand_id
        ) VALUES ($1, $2, 'walla_walla_travel', $3, $4, $5, $6, $7, 1)
        RETURNING id`,
        [
          contactId,
          stageId,
          dealTitle,
          consultation.handoff_notes || `${consultation.trip_type || 'wine_tour'} trip consultation`,
          consultation.expected_guests || 2,
          consultation.start_date || null,
          consultation.id,
        ]
      );

      // Log activity
      await pool.query(
        `INSERT INTO crm_activities (
          contact_id, deal_id, activity_type, subject, body, source_type, performed_at
        ) VALUES ($1, $2, 'system', $3, $4, 'system', NOW())`,
        [
          contactId,
          dealResult.rows[0].id,
          'Consultation backfilled to CRM',
          `Trip consultation "${consultation.title}" for ${consultation.expected_guests || 2} guests`,
        ]
      );

      console.log(`  ✅ Created deal #${dealResult.rows[0].id}\n`);
      created++;
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      skipped++;
    }
  }

  return { created, skipped };
}

async function backfillCorporateRequests() {
  console.log('\n🏢 Backfilling Corporate Requests...\n');

  // Find corporate requests without CRM contact links
  const result = await pool.query(`
    SELECT
      id, request_number, company_name, contact_name, contact_email, contact_phone,
      event_type, party_size, preferred_dates, budget_range, crm_contact_id, crm_deal_id
    FROM corporate_requests
    WHERE crm_contact_id IS NULL OR crm_deal_id IS NULL
    ORDER BY created_at DESC
  `);

  const requests: CorporateRequestRecord[] = result.rows;
  console.log(`Found ${requests.length} corporate requests without full CRM sync\n`);

  if (requests.length === 0) {
    console.log('✅ All corporate requests are already synced!\n');
    return { created: 0, skipped: 0 };
  }

  const stageId = await getDefaultPipelineStageId();
  if (!stageId) {
    console.error('❌ No pipeline stage found. Please run migrations first.');
    return { created: 0, skipped: requests.length };
  }

  let created = 0;
  let skipped = 0;

  for (const request of requests) {
    console.log(`Processing: ${request.company_name} (${request.request_number})`);
    console.log(`  Contact: ${request.contact_name} <${request.contact_email}>`);
    console.log(`  Event: ${request.event_type}, ${request.party_size} guests`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would create/update CRM contact and deal\n`);
      created++;
      continue;
    }

    try {
      // Find or create contact
      const contactId = request.crm_contact_id || await findOrCreateContact(
        request.contact_email,
        request.contact_name,
        request.contact_phone,
        'corporate',
        'corporate_request',
        request.event_type,
        request.company_name
      );

      let dealId = request.crm_deal_id;

      // Create deal if needed
      if (!dealId) {
        const dealTitle = `${request.company_name} - ${request.event_type}`;

        // Parse preferred dates
        let tourDate: string | null = null;
        if (request.preferred_dates) {
          try {
            const dates = JSON.parse(request.preferred_dates);
            tourDate = dates[0] || null;
          } catch {
            tourDate = request.preferred_dates;
          }
        }

        const dealResult = await pool.query(
          `INSERT INTO crm_deals (
            contact_id, stage_id, brand, title, description,
            party_size, expected_tour_date, corporate_request_id, brand_id
          ) VALUES ($1, $2, 'walla_walla_travel', $3, $4, $5, $6, $7, 1)
          RETURNING id`,
          [
            contactId,
            stageId,
            dealTitle,
            `Budget: ${request.budget_range || 'Not specified'}`,
            request.party_size || null,
            tourDate,
            request.id,
          ]
        );
        dealId = dealResult.rows[0].id;

        // Log activity
        await pool.query(
          `INSERT INTO crm_activities (
            contact_id, deal_id, activity_type, subject, body, source_type, performed_at
          ) VALUES ($1, $2, 'system', $3, $4, 'system', NOW())`,
          [
            contactId,
            dealId,
            'Corporate request backfilled to CRM',
            `${request.event_type} request for ${request.party_size} guests from ${request.company_name}`,
          ]
        );

        if (VERBOSE) {
          console.log(`  → Created deal #${dealId}`);
        }
      }

      // Update corporate request with CRM links
      await pool.query(
        `UPDATE corporate_requests
         SET crm_contact_id = $1, crm_deal_id = $2
         WHERE id = $3`,
        [contactId, dealId, request.id]
      );

      console.log(`  ✅ Synced (contact #${contactId}, deal #${dealId})\n`);
      created++;
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      skipped++;
    }
  }

  return { created, skipped };
}

async function showStats() {
  console.log('\n📊 Current CRM Stats\n');

  const stats = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM crm_contacts) as total_contacts,
      (SELECT COUNT(*) FROM crm_contacts WHERE lifecycle_stage = 'lead') as leads,
      (SELECT COUNT(*) FROM crm_contacts WHERE lifecycle_stage = 'customer') as customers,
      (SELECT COUNT(*) FROM crm_deals WHERE won_at IS NULL AND lost_at IS NULL) as open_deals,
      (SELECT COUNT(*) FROM crm_deals WHERE won_at IS NOT NULL) as won_deals,
      (SELECT COUNT(*) FROM trips WHERE handoff_requested_at IS NOT NULL) as total_consultations,
      (SELECT COUNT(*) FROM corporate_requests) as total_corporate_requests
  `);

  const s = stats.rows[0];
  console.log('CRM Contacts:');
  console.log(`  Total: ${s.total_contacts}`);
  console.log(`  Leads: ${s.leads}`);
  console.log(`  Customers: ${s.customers}`);
  console.log('');
  console.log('CRM Deals:');
  console.log(`  Open: ${s.open_deals}`);
  console.log(`  Won: ${s.won_deals}`);
  console.log('');
  console.log('Source Data:');
  console.log(`  Consultations: ${s.total_consultations}`);
  console.log(`  Corporate Requests: ${s.total_corporate_requests}`);
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  CRM Contacts Backfill Script');
  console.log('═'.repeat(60));

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    await showStats();

    const consultationResults = await backfillConsultations();
    const corporateResults = await backfillCorporateRequests();

    console.log('═'.repeat(60));
    console.log('  Summary');
    console.log('═'.repeat(60));
    console.log(`\nConsultations: ${consultationResults.created} synced, ${consultationResults.skipped} skipped`);
    console.log(`Corporate Requests: ${corporateResults.created} synced, ${corporateResults.skipped} skipped`);

    if (DRY_RUN) {
      console.log('\n💡 Run without --dry-run to apply changes');
    } else if (consultationResults.created > 0 || corporateResults.created > 0) {
      console.log('\n');
      await showStats();
    }

    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
