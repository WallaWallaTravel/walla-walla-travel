import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

// ============================================================================
// Types
// ============================================================================

type ImportSource = 'square' | 'stripe' | 'quickbooks' | 'generic';

interface FieldMapping {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  total_spent?: string;
  visit_count?: string;
  notes?: string;
}

interface ImportRow {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  total_spent?: number;
  visit_count?: number;
  notes?: string;
  raw_data: Record<string, string>;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface DuplicateRecord {
  row: number;
  email: string;
  existing_id: number;
  existing_name: string;
}

interface ImportResult {
  total_rows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
  duplicates_found: number;
}

// ============================================================================
// Field Mappings by Source
// ============================================================================

const SOURCE_FIELD_MAPPINGS: Record<ImportSource, FieldMapping> = {
  square: {
    email: 'Email Address',
    name: 'Customer Name',
    phone: 'Phone Number',
    company: 'Company Name',
    total_spent: 'Total Spent',
    visit_count: 'Visits',
    notes: 'Note',
  },
  stripe: {
    email: 'email',
    name: 'name',
    phone: 'phone',
    company: 'description', // Stripe uses description field
    total_spent: 'balance', // Can be negative (credits)
  },
  quickbooks: {
    email: 'Email',
    name: 'Display Name',
    phone: 'Phone',
    company: 'Company',
    notes: 'Notes',
  },
  generic: {
    email: 'email',
    name: 'name',
    phone: 'phone',
    company: 'company',
    total_spent: 'total_spent',
    visit_count: 'visit_count',
    notes: 'notes',
  },
};

// ============================================================================
// CSV Parser
// ============================================================================

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    throw new BadRequestError('CSV file must have at least a header row and one data row');
  }

  // Parse header row (handle quoted values)
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // End of quoted value
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// ============================================================================
// Source Detection
// ============================================================================

function detectSource(headers: string[]): ImportSource {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));

  // Square specific columns
  if (headerSet.has('email address') && headerSet.has('customer name')) {
    return 'square';
  }

  // Stripe specific columns
  if (headerSet.has('id') && headerSet.has('email') && headerSet.has('created')) {
    return 'stripe';
  }

  // QuickBooks specific columns
  if (headerSet.has('display name') && headerSet.has('email')) {
    return 'quickbooks';
  }

  return 'generic';
}

// ============================================================================
// Data Mapping
// ============================================================================

function mapRowToImport(
  row: Record<string, string>,
  mapping: FieldMapping,
  rowIndex: number
): { data: ImportRow | null; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Required: email
  let email = row[mapping.email]?.trim().toLowerCase();
  if (!email) {
    // Try common variations
    email = row['email']?.trim().toLowerCase() ||
            row['Email']?.trim().toLowerCase() ||
            row['EMAIL']?.trim().toLowerCase();
  }

  if (!email) {
    errors.push({ row: rowIndex, field: 'email', message: 'Email is required' });
    return { data: null, errors };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format', value: email });
    return { data: null, errors };
  }

  // Required: name
  let name = row[mapping.name]?.trim();
  if (!name) {
    // Try common variations
    name = row['name']?.trim() ||
           row['Name']?.trim() ||
           row['full_name']?.trim() ||
           row['Full Name']?.trim();
  }

  if (!name) {
    // Use email prefix as fallback name
    name = email.split('@')[0];
  }

  // Optional fields
  const phone = row[mapping.phone || 'phone']?.trim() || row['Phone']?.trim() || undefined;
  const company = row[mapping.company || 'company']?.trim() || row['Company']?.trim() || undefined;
  const notes = row[mapping.notes || 'notes']?.trim() || row['Notes']?.trim() || undefined;

  // Parse numeric fields
  let total_spent: number | undefined;
  const totalSpentStr = row[mapping.total_spent || 'total_spent']?.trim();
  if (totalSpentStr) {
    // Remove currency symbols and commas
    const cleaned = totalSpentStr.replace(/[$,£€]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      total_spent = parsed;
    }
  }

  let visit_count: number | undefined;
  const visitCountStr = row[mapping.visit_count || 'visit_count']?.trim();
  if (visitCountStr) {
    const parsed = parseInt(visitCountStr);
    if (!isNaN(parsed)) {
      visit_count = parsed;
    }
  }

  return {
    data: {
      email,
      name,
      phone,
      company,
      total_spent,
      visit_count,
      notes,
      raw_data: row,
    },
    errors,
  };
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * POST /api/admin/crm/import/preview
 * Preview import - validates data and detects duplicates without importing
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session): Promise<NextResponse> => {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const action = formData.get('action') as string || 'preview';
      const sourceOverride = formData.get('source') as ImportSource | null;
      const duplicateAction = formData.get('duplicate_action') as 'skip' | 'update' | 'merge' || 'skip';
      const customMapping = formData.get('mapping') as string | null;

      if (!file) {
        throw new BadRequestError('No file provided');
      }

      // Read file content
      const content = await file.text();

      // Parse CSV
      const { headers, rows } = parseCSV(content);

      // Detect or use provided source
      const source = sourceOverride || detectSource(headers);
      const mapping = customMapping
        ? JSON.parse(customMapping) as FieldMapping
        : SOURCE_FIELD_MAPPINGS[source];

      logger.info('[CRM Import] Processing file', {
        fileName: file.name,
        source,
        rowCount: rows.length,
        action,
      });

      // Map and validate rows
      const validRows: ImportRow[] = [];
      const allErrors: ValidationError[] = [];

      for (let i = 0; i < rows.length; i++) {
        const { data, errors } = mapRowToImport(rows[i], mapping, i + 2); // +2 for header row and 1-based index
        if (data) {
          validRows.push(data);
        }
        allErrors.push(...errors);
      }

      // Check for duplicates
      const duplicates: DuplicateRecord[] = [];
      const emails = validRows.map(r => r.email);

      if (emails.length > 0) {
        // Build parameterized query for all emails
        const placeholders = emails.map((_, i) => `$${i + 1}`).join(', ');
        const existingContacts = await query<{ id: number; email: string; name: string }>(
          `SELECT id, email, name FROM crm_contacts WHERE LOWER(email) IN (${placeholders})`,
          emails
        );

        const existingMap = new Map(existingContacts.rows.map(c => [c.email.toLowerCase(), c]));

        validRows.forEach((row, index) => {
          const existing = existingMap.get(row.email);
          if (existing) {
            duplicates.push({
              row: index + 2,
              email: row.email,
              existing_id: existing.id,
              existing_name: existing.name,
            });
          }
        });
      }

      if (action === 'preview') {
        // Return preview data
        return NextResponse.json({
          success: true,
          data: {
            source_detected: source,
            headers,
            total_rows: rows.length,
            valid_rows: validRows.length,
            errors: allErrors.slice(0, 50), // Limit errors in response
            total_errors: allErrors.length,
            duplicates: duplicates.slice(0, 50),
            total_duplicates: duplicates.length,
            sample_data: validRows.slice(0, 5).map(r => ({
              email: r.email,
              name: r.name,
              phone: r.phone,
              company: r.company,
            })),
            field_mapping: mapping,
          },
        });
      }

      // Perform actual import
      const result: ImportResult = {
        total_rows: rows.length,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: allErrors,
        duplicates_found: duplicates.length,
      };

      const duplicateEmails = new Set(duplicates.map(d => d.email));

      for (const row of validRows) {
        try {
          const isDuplicate = duplicateEmails.has(row.email);

          if (isDuplicate) {
            if (duplicateAction === 'skip') {
              result.skipped++;
              continue;
            }

            if (duplicateAction === 'update' || duplicateAction === 'merge') {
              // Update existing contact
              await query(
                `UPDATE crm_contacts
                 SET
                   name = $1,
                   phone = COALESCE($2, phone),
                   company = COALESCE($3, company),
                   notes = CASE WHEN $4 IS NOT NULL THEN COALESCE(notes || E'\\n', '') || $4 ELSE notes END,
                   total_revenue = CASE WHEN $5 IS NOT NULL THEN GREATEST(total_revenue, $5::decimal) ELSE total_revenue END,
                   total_bookings = CASE WHEN $6 IS NOT NULL THEN GREATEST(total_bookings, $6) ELSE total_bookings END,
                   source = COALESCE(source, $7),
                   source_detail = COALESCE(source_detail, $8),
                   updated_at = NOW()
                 WHERE LOWER(email) = LOWER($9)`,
                [
                  row.name,
                  row.phone,
                  row.company,
                  row.notes,
                  row.total_spent,
                  row.visit_count,
                  'import',
                  source,
                  row.email,
                ]
              );
              result.updated++;
            }
          } else {
            // Insert new contact
            const lifecycleStage = (row.visit_count || 0) > 0 ? 'customer' : 'lead';

            await query(
              `INSERT INTO crm_contacts (
                email, name, phone, company, contact_type, lifecycle_stage,
                lead_temperature, source, source_detail, notes,
                total_bookings, total_revenue,
                brand_id, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, 'individual', $5, 'warm', 'import', $6, $7, $8, $9, 1, NOW(), NOW())`,
              [
                row.email,
                row.name,
                row.phone || null,
                row.company || null,
                lifecycleStage,
                source,
                row.notes || null,
                row.visit_count || 0,
                row.total_spent || 0,
              ]
            );
            result.imported++;
          }
        } catch (error) {
          result.errors.push({
            row: validRows.indexOf(row) + 2,
            field: 'general',
            message: error instanceof Error ? error.message : 'Import failed',
          });
        }
      }

      logger.info('[CRM Import] Import completed', { ...result });

      return NextResponse.json({
        success: true,
        data: result,
        message: `Import completed: ${result.imported} new contacts, ${result.updated} updated, ${result.skipped} skipped.`,
      });
    })
  )
);

/**
 * GET /api/admin/crm/import
 * Get available import sources and their field mappings
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session): Promise<NextResponse> => {
  return NextResponse.json({
    success: true,
    data: {
      supported_sources: [
        {
          id: 'square',
          name: 'Square',
          description: 'Import from Square Customer export',
          expected_columns: ['Email Address', 'Customer Name', 'Phone Number'],
        },
        {
          id: 'stripe',
          name: 'Stripe',
          description: 'Import from Stripe Customer export',
          expected_columns: ['email', 'name', 'phone'],
        },
        {
          id: 'quickbooks',
          name: 'QuickBooks',
          description: 'Import from QuickBooks Customer export',
          expected_columns: ['Email', 'Display Name', 'Phone'],
        },
        {
          id: 'generic',
          name: 'Generic CSV',
          description: 'Import from any CSV with email and name columns',
          expected_columns: ['email', 'name', 'phone (optional)', 'company (optional)'],
        },
      ],
      field_mappings: SOURCE_FIELD_MAPPINGS,
      duplicate_actions: [
        { id: 'skip', name: 'Skip duplicates', description: 'Keep existing contacts unchanged' },
        { id: 'update', name: 'Update existing', description: 'Update existing contacts with new data' },
        { id: 'merge', name: 'Merge data', description: 'Append notes and keep highest values' },
      ],
    },
  });
});
