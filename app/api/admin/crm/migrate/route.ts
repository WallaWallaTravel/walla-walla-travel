import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { queryOne } from '@/lib/db-helpers';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

interface Customer {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  total_bookings: number;
  total_spent: string;
  last_booking_date: string | null;
  created_at: string;
}

interface MigrationResult {
  total_customers: number;
  migrated: number;
  already_exists: number;
  errors: number;
  error_details: Array<{ customer_id: number; email: string; error: string }>;
}

/**
 * GET /api/admin/crm/migrate
 * Get migration status - how many customers need to be migrated
 */
export const GET = withErrorHandling(async (): Promise<NextResponse> => {
  // Count total customers
  const totalCustomers = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM customers`
  );

  // Count customers already linked to CRM contacts
  const linkedCustomers = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM customers c
     WHERE EXISTS (SELECT 1 FROM crm_contacts cc WHERE cc.customer_id = c.id)`
  );

  // Count CRM contacts that exist but aren't linked
  const unlinkedContacts = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM crm_contacts
     WHERE customer_id IS NULL`
  );

  const total = parseInt(totalCustomers?.count || '0');
  const linked = parseInt(linkedCustomers?.count || '0');
  const needsMigration = total - linked;

  return NextResponse.json({
    success: true,
    data: {
      total_customers: total,
      already_migrated: linked,
      needs_migration: needsMigration,
      unlinked_crm_contacts: parseInt(unlinkedContacts?.count || '0'),
      ready_to_migrate: needsMigration > 0,
    },
  });
});

/**
 * POST /api/admin/crm/migrate
 * Migrate all existing customers to CRM contacts
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
      const body = await request.json().catch(() => ({}));
      const { dryRun = false, batchSize = 100 } = body;

      logger.info('[CRM Migration] Starting customer migration', { dryRun, batchSize });

      const result: MigrationResult = {
        total_customers: 0,
        migrated: 0,
        already_exists: 0,
        errors: 0,
        error_details: [],
      };

      // Get all customers with their booking stats
      const customersResult = await query<Customer>(
        `SELECT
          c.id,
          c.email,
          c.name,
          c.phone,
          COUNT(b.id) as total_bookings,
          COALESCE(SUM(b.total_price), 0) as total_spent,
          MAX(b.tour_date) as last_booking_date,
          c.created_at
        FROM customers c
        LEFT JOIN bookings b ON b.customer_id = c.id AND b.status != 'cancelled'
        GROUP BY c.id
        ORDER BY c.id`
      );

      const customers = customersResult.rows;
      result.total_customers = customers.length;

      logger.info('[CRM Migration] Found customers to process', { count: customers.length });

      // Process in batches
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);

        for (const customer of batch) {
          try {
            // Check if CRM contact already exists for this customer
            const existingContact = await queryOne<{ id: number }>(
              `SELECT id FROM crm_contacts WHERE customer_id = $1`,
              [customer.id]
            );

            if (existingContact) {
              result.already_exists++;
              continue;
            }

            // Check if contact exists by email (created manually or from other source)
            const emailContact = await queryOne<{ id: number }>(
              `SELECT id FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
              [customer.email]
            );

            if (dryRun) {
              // In dry run, just count what would be migrated
              result.migrated++;
              continue;
            }

            if (emailContact) {
              // Link existing contact to customer and update stats
              await query(
                `UPDATE crm_contacts
                SET
                  customer_id = $1,
                  name = $2,
                  phone = COALESCE(phone, $3),
                  lifecycle_stage = CASE
                    WHEN $4::int > 1 THEN 'repeat_customer'
                    WHEN $4::int = 1 THEN 'customer'
                    ELSE lifecycle_stage
                  END,
                  total_bookings = $4,
                  total_revenue = $5,
                  last_booking_date = $6,
                  updated_at = NOW()
                WHERE id = $7`,
                [
                  customer.id,
                  customer.name,
                  customer.phone,
                  customer.total_bookings,
                  parseFloat(customer.total_spent),
                  customer.last_booking_date,
                  emailContact.id,
                ]
              );
              result.migrated++;
            } else {
              // Create new CRM contact
              const lifecycleStage =
                customer.total_bookings > 1 ? 'repeat_customer' :
                customer.total_bookings === 1 ? 'customer' : 'lead';

              await query(
                `INSERT INTO crm_contacts (
                  email, name, phone, customer_id, contact_type, lifecycle_stage,
                  lead_temperature, source, source_detail,
                  total_bookings, total_revenue, last_booking_date,
                  brand_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, 'individual', $5, 'warm', 'migration', 'customer_migration',
                  $6, $7, $8, 1, $9, NOW())`,
                [
                  customer.email,
                  customer.name,
                  customer.phone,
                  customer.id,
                  lifecycleStage,
                  customer.total_bookings,
                  parseFloat(customer.total_spent),
                  customer.last_booking_date,
                  customer.created_at,
                ]
              );
              result.migrated++;
            }
          } catch (error) {
            result.errors++;
            result.error_details.push({
              customer_id: customer.id,
              email: customer.email,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            logger.error('[CRM Migration] Failed to migrate customer', {
              customerId: customer.id,
              email: customer.email,
              error,
            });
          }
        }

        logger.info('[CRM Migration] Batch completed', {
          processed: Math.min(i + batchSize, customers.length),
          total: customers.length,
        });
      }

      logger.info('[CRM Migration] Migration completed', { ...result });

      return NextResponse.json({
        success: true,
        data: result,
        message: dryRun
          ? `Dry run completed. ${result.migrated} customers would be migrated.`
          : `Migration completed. ${result.migrated} customers migrated, ${result.already_exists} already existed, ${result.errors} errors.`,
      });
    })
  )
);
