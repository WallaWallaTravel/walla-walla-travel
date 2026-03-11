import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
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
export const GET = withAdminAuth(async (_request: NextRequest, _session): Promise<NextResponse> => {
  // Count total customers
  const totalRows = await prisma.$queryRaw<{ count: string }[]>`SELECT COUNT(*) as count FROM customers`;
  const totalCustomers = totalRows[0];

  // Count customers already linked to CRM contacts
  const linkedRows = await prisma.$queryRaw<{ count: string }[]>`
    SELECT COUNT(*) as count FROM customers c
     WHERE EXISTS (SELECT 1 FROM crm_contacts cc WHERE cc.customer_id = c.id)`;
  const linkedCustomers = linkedRows[0];

  // Count CRM contacts that exist but aren't linked
  const unlinkedRows = await prisma.$queryRaw<{ count: string }[]>`
    SELECT COUNT(*) as count FROM crm_contacts
     WHERE customer_id IS NULL`;
  const unlinkedContacts = unlinkedRows[0];

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

const BodySchema = z.object({
  dryRun: z.boolean().optional(),
  batchSize: z.number().int().positive().max(1000).optional(),
});

/**
 * POST /api/admin/crm/migrate
 * Migrate all existing customers to CRM contacts
 */
export const POST = withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session): Promise<NextResponse> => {
      const body = BodySchema.parse(await request.json().catch(() => ({})));
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
      const customers = await prisma.$queryRaw<Customer[]>`
        SELECT
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
        ORDER BY c.id`;

      result.total_customers = customers.length;

      logger.info('[CRM Migration] Found customers to process', { count: customers.length });

      // Process in batches
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);

        for (const customer of batch) {
          try {
            // Check if CRM contact already exists for this customer
            const existingRows = await prisma.$queryRaw<{ id: number }[]>`
              SELECT id FROM crm_contacts WHERE customer_id = ${customer.id}`;

            if (existingRows.length > 0) {
              result.already_exists++;
              continue;
            }

            // Check if contact exists by email (created manually or from other source)
            const emailRows = await prisma.$queryRaw<{ id: number }[]>`
              SELECT id FROM crm_contacts WHERE LOWER(email) = LOWER(${customer.email})`;

            if (dryRun) {
              // In dry run, just count what would be migrated
              result.migrated++;
              continue;
            }

            if (emailRows.length > 0) {
              // Link existing contact to customer and update stats
              await prisma.$executeRaw`
                UPDATE crm_contacts
                SET
                  customer_id = ${customer.id},
                  name = ${customer.name},
                  phone = COALESCE(phone, ${customer.phone}),
                  lifecycle_stage = CASE
                    WHEN ${customer.total_bookings}::int > 1 THEN 'repeat_customer'
                    WHEN ${customer.total_bookings}::int = 1 THEN 'customer'
                    ELSE lifecycle_stage
                  END,
                  total_bookings = ${customer.total_bookings},
                  total_revenue = ${parseFloat(customer.total_spent)},
                  last_booking_date = ${customer.last_booking_date},
                  updated_at = NOW()
                WHERE id = ${emailRows[0].id}`;
              result.migrated++;
            } else {
              // Create new CRM contact
              const lifecycleStage =
                customer.total_bookings > 1 ? 'repeat_customer' :
                customer.total_bookings === 1 ? 'customer' : 'lead';

              await prisma.$executeRaw`
                INSERT INTO crm_contacts (
                  email, name, phone, customer_id, contact_type, lifecycle_stage,
                  lead_temperature, source, source_detail,
                  total_bookings, total_revenue, last_booking_date,
                  brand_id, created_at, updated_at
                ) VALUES (${customer.email}, ${customer.name}, ${customer.phone}, ${customer.id}, 'individual', ${lifecycleStage}, 'warm', 'migration', 'customer_migration',
                  ${customer.total_bookings}, ${parseFloat(customer.total_spent)}, ${customer.last_booking_date},
                  1, ${customer.created_at}::timestamptz, NOW())`;
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
  );
