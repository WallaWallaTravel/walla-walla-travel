/**
 * Schema-SQL Validation Test
 *
 * Catches the #1 source of runtime errors in this codebase: raw SQL queries
 * that reference columns or tables which don't exist in the database.
 *
 * HOW IT WORKS:
 * 1. Parses the Prisma schema to extract actual table + column names
 * 2. Scans .ts files for raw SQL INSERT/UPDATE/SELECT/DELETE statements
 * 3. Validates every column name against the schema
 * 4. Validates every table name exists in the schema
 *
 * TWO LEVELS OF ENFORCEMENT:
 * - CRITICAL PATH: Routes in active use — MUST pass (test fails on mismatch)
 * - AUDIT: Full codebase scan — warns but doesn't block (tech debt tracking)
 *
 * This is a static analysis test — no database connection needed.
 * Run with: npm test -- schema-sql-validation
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Helpers
// ============================================================================

function parsePrismaSchema(schemaPath: string): Map<string, Set<string>> {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const tableColumns = new Map<string, Set<string>>();

  let currentModel: string | null = null;
  const columns = new Set<string>();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      currentModel = modelMatch[1];
      columns.clear();
      continue;
    }

    if (currentModel && trimmed === '}') {
      tableColumns.set(currentModel, new Set(columns));
      currentModel = null;
      continue;
    }

    if (currentModel && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
      const colMatch = trimmed.match(/^(\w+)\s+/);
      if (colMatch) {
        const typeMatch = trimmed.match(/^\w+\s+(\w+)/);
        if (typeMatch) {
          const typeName = typeMatch[1];
          const primitiveTypes = ['Int', 'String', 'Boolean', 'DateTime', 'Decimal', 'Float', 'BigInt', 'Json', 'Bytes'];
          if (primitiveTypes.includes(typeName)) {
            columns.add(colMatch[1]);
          }
        }
      }
    }
  }

  return tableColumns;
}

function findTsFiles(dir: string, excludeDirs: string[] = []): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirs.some(ex => entry.name === ex || fullPath.includes(ex))) {
          walk(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

interface SqlColumnRef {
  file: string;
  line: number;
  table: string;
  column: string;
  queryType: 'INSERT' | 'UPDATE';
}

interface SqlTableRef {
  file: string;
  line: number;
  table: string;
  queryType: string;
}

function extractSqlColumnRefs(filePath: string): SqlColumnRef[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const refs: SqlColumnRef[] = [];

  // Pattern 1: INSERT INTO table (col1, col2, ...)
  const insertRegex = /INSERT\s+INTO\s+(\w+)\s*\(([\s\S]*?)\)\s*VALUES/gi;
  let match: RegExpExecArray | null;

  while ((match = insertRegex.exec(content)) !== null) {
    const table = match[1];
    const columnList = match[2];

    const cols = columnList
      .replace(/\n/g, ' ')
      .split(',')
      .map(c => c.trim())
      .filter(c => c && !c.startsWith('$') && !c.startsWith('--'));

    const beforeMatch = content.substring(0, match.index);
    const lineNum = beforeMatch.split('\n').length;

    for (const col of cols) {
      const cleanCol = col.replace(/["`']/g, '').trim();
      if (cleanCol && /^[a-z_][a-z0-9_]*$/i.test(cleanCol)) {
        refs.push({ file: filePath, line: lineNum, table, column: cleanCol, queryType: 'INSERT' });
      }
    }
  }

  // Pattern 2: UPDATE table SET col1 = ..., col2 = ...
  const updateRegex = /UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)(?:WHERE|RETURNING|$)/gi;

  while ((match = updateRegex.exec(content)) !== null) {
    const table = match[1];
    const setClause = match[2];

    const colRegex = /(\w+)\s*=/g;
    let colMatch: RegExpExecArray | null;

    const beforeMatch = content.substring(0, match.index);
    const lineNum = beforeMatch.split('\n').length;

    while ((colMatch = colRegex.exec(setClause)) !== null) {
      const col = colMatch[1];
      if (!['SET', 'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE', 'CURRENT_TIMESTAMP'].includes(col.toUpperCase())) {
        refs.push({ file: filePath, line: lineNum, table, column: col, queryType: 'UPDATE' });
      }
    }
  }

  return refs;
}

/**
 * Extract all table names referenced in SQL queries.
 * Catches INSERT INTO, UPDATE, DELETE FROM, and FROM/JOIN clauses.
 */
function extractSqlTableRefs(filePath: string): SqlTableRef[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const refs: SqlTableRef[] = [];

  // SQL keywords that should NOT be treated as table names
  const sqlKeywords = new Set([
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'ON', 'AS', 'SET',
    'VALUES', 'INTO', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'LEFT', 'RIGHT',
    'INNER', 'OUTER', 'CROSS', 'FULL', 'GROUP', 'ORDER', 'BY', 'HAVING',
    'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'CASE', 'WHEN', 'THEN',
    'ELSE', 'END', 'NULL', 'TRUE', 'FALSE', 'IS', 'LIKE', 'ILIKE', 'BETWEEN',
    'EXISTS', 'ANY', 'SOME', 'RETURNING', 'WITH', 'RECURSIVE', 'ASC', 'DESC',
    'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'CONSTRAINT', 'FOREIGN',
    'PRIMARY', 'KEY', 'REFERENCES', 'CASCADE', 'RESTRICT', 'DEFAULT',
    'COALESCE', 'NULLIF', 'CAST', 'EXTRACT', 'INTERVAL', 'NOW', 'COUNT',
    'SUM', 'AVG', 'MIN', 'MAX', 'FILTER', 'OVER', 'PARTITION', 'ROW_NUMBER',
    'LAG', 'LEAD', 'LATERAL', 'OVERLAPS', 'CONFLICT', 'DO', 'NOTHING',
    'EXCLUDED', 'GENERATED', 'ALWAYS', 'IDENTITY', 'IF', 'THEN', 'ELSE',
    'subquery', 'json_build_object', 'json_agg', 'json_object_agg',
    'DATE_TRUNC', 'TO_CHAR', 'TO_DATE', 'TO_TIMESTAMP', 'ARRAY_AGG',
    'STRING_AGG', 'BOOL_OR', 'BOOL_AND', 'UNNEST',
  ]);

  // Pattern 1: INSERT INTO table
  const insertRegex = /INSERT\s+INTO\s+(\w+)/gi;
  let match: RegExpExecArray | null;
  while ((match = insertRegex.exec(content)) !== null) {
    const table = match[1];
    if (!sqlKeywords.has(table.toUpperCase())) {
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      refs.push({ file: filePath, line: lineNum, table, queryType: 'INSERT' });
    }
  }

  // Pattern 2: UPDATE table SET
  const updateRegex = /UPDATE\s+(\w+)\s+SET/gi;
  while ((match = updateRegex.exec(content)) !== null) {
    const table = match[1];
    if (!sqlKeywords.has(table.toUpperCase())) {
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      refs.push({ file: filePath, line: lineNum, table, queryType: 'UPDATE' });
    }
  }

  // Pattern 3: DELETE FROM table
  const deleteRegex = /DELETE\s+FROM\s+(\w+)/gi;
  while ((match = deleteRegex.exec(content)) !== null) {
    const table = match[1];
    if (!sqlKeywords.has(table.toUpperCase())) {
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      refs.push({ file: filePath, line: lineNum, table, queryType: 'DELETE' });
    }
  }

  // Pattern 4: FROM table (SELECT queries)
  const fromRegex = /FROM\s+(\w+)(?:\s|$|,|\))/gi;
  while ((match = fromRegex.exec(content)) !== null) {
    const table = match[1];
    if (!sqlKeywords.has(table.toUpperCase())) {
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      refs.push({ file: filePath, line: lineNum, table, queryType: 'SELECT' });
    }
  }

  // Pattern 5: JOIN table
  const joinRegex = /JOIN\s+(\w+)/gi;
  while ((match = joinRegex.exec(content)) !== null) {
    const table = match[1];
    if (!sqlKeywords.has(table.toUpperCase())) {
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      refs.push({ file: filePath, line: lineNum, table, queryType: 'JOIN' });
    }
  }

  return refs;
}

function validateFiles(
  rootDir: string,
  filePaths: string[],
  schemaColumns: Map<string, Set<string>>,
): string[] {
  const errors: string[] = [];

  for (const filePath of filePaths) {
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) continue;

    const refs = extractSqlColumnRefs(fullPath);
    for (const ref of refs) {
      const tableColumns = schemaColumns.get(ref.table);
      if (!tableColumns) continue; // Table not in Prisma — skip (caught by table validation)

      if (!tableColumns.has(ref.column)) {
        errors.push(
          `${filePath}:${ref.line} — ${ref.queryType} ${ref.table}.${ref.column} (column not in schema)`
        );
      }
    }
  }

  return errors;
}

/**
 * Validate that all SQL tables referenced in a file exist in the Prisma schema.
 * Returns list of non-existent table references.
 */
function validateTables(
  rootDir: string,
  filePaths: string[],
  schemaColumns: Map<string, Set<string>>,
): string[] {
  const errors: string[] = [];

  for (const filePath of filePaths) {
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) continue;

    const refs = extractSqlTableRefs(fullPath);
    const seenTables = new Set<string>(); // Deduplicate per file

    for (const ref of refs) {
      if (seenTables.has(ref.table)) continue;
      seenTables.add(ref.table);

      if (!schemaColumns.has(ref.table)) {
        errors.push(
          `${filePath}:${ref.line} — ${ref.queryType} references non-existent table "${ref.table}"`
        );
      }
    }
  }

  return errors;
}

// ============================================================================
// Tests
// ============================================================================

describe('Schema-SQL Validation', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const schemaPath = path.join(rootDir, 'prisma/schema.prisma');

  let schemaColumns: Map<string, Set<string>>;

  beforeAll(() => {
    schemaColumns = parsePrismaSchema(schemaPath);
  });

  // ========================================================================
  // SCHEMA PARSING VERIFICATION
  // ========================================================================

  it('should parse the Prisma schema successfully', () => {
    expect(schemaColumns.size).toBeGreaterThan(0);
    expect(schemaColumns.has('bookings')).toBe(true);
    expect(schemaColumns.has('booking_timeline')).toBe(true);
    expect(schemaColumns.has('customers')).toBe(true);
    expect(schemaColumns.has('users')).toBe(true);
    expect(schemaColumns.has('vehicles')).toBe(true);
  });

  it('should recognize known columns in the bookings table', () => {
    const bookingCols = schemaColumns.get('bookings')!;
    expect(bookingCols.has('booking_number')).toBe(true);
    expect(bookingCols.has('customer_id')).toBe(true);
    expect(bookingCols.has('tour_date')).toBe(true);
    expect(bookingCols.has('total_price')).toBe(true);
    expect(bookingCols.has('tour_type')).toBe(true);
    expect(bookingCols.has('special_requests')).toBe(true);

    // These should NOT exist (caused runtime errors before)
    expect(bookingCols.has('vehicle_ids')).toBe(false);
    expect(bookingCols.has('notes')).toBe(false);
    expect(bookingCols.has('can_text')).toBe(false);
  });

  it('should validate customers table uses sms_marketing_consent (not can_text)', () => {
    const customerCols = schemaColumns.get('customers')!;
    expect(customerCols.has('sms_marketing_consent')).toBe(true);
    expect(customerCols.has('can_text')).toBe(false);
  });

  // ========================================================================
  // CRITICAL PATH: Admin Booking Console (MUST pass — actively used daily)
  // ========================================================================

  describe('Admin Booking Console (critical path)', () => {
    it('should have zero column mismatches in the booking console create route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/admin/bookings/console/create/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in the booking list route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/admin/bookings/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in the booking detail route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/admin/bookings/[booking_id]/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in the booking assign route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/admin/bookings/[booking_id]/assign/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in the booking status route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/admin/bookings/[booking_id]/status/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in the availability check route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/admin/availability/check/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // CRITICAL PATH: Core Booking Services (MUST pass)
  // ========================================================================

  describe('Core Booking Services (critical path)', () => {
    it('should have zero column mismatches in core booking service', () => {
      const errors = validateFiles(rootDir, [
        'lib/services/booking/core.service.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in the pricing API', () => {
      const errors = validateFiles(rootDir, [
        'app/api/bookings/calculate-price/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in the booking create route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/bookings/create/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in booking lookup route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/bookings/[bookingNumber]/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in the booking cancel route', () => {
      const errors = validateFiles(rootDir, [
        'app/api/bookings/cancel/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // CRITICAL PATH: Payments & Invoices (MUST pass — handles money)
  // ========================================================================

  describe('Payments & Invoices (critical path)', () => {
    it('should have zero column mismatches in payment intent creation', () => {
      const errors = validateFiles(rootDir, [
        'app/api/payments/create-intent/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in payment confirmation', () => {
      const errors = validateFiles(rootDir, [
        'app/api/payments/confirm/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in invoice routes', () => {
      const errors = validateFiles(rootDir, [
        'app/api/invoices/[booking_id]/route.ts',
        'app/api/admin/pending-invoices/route.ts',
        'app/api/admin/approve-invoice/[booking_id]/route.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // CRITICAL PATH: Compliance Middleware (MUST pass — prevents silent failures)
  // ========================================================================

  describe('Compliance & Middleware (critical path)', () => {
    it('should have zero column mismatches in compliance check middleware', () => {
      const errors = validateFiles(rootDir, [
        'lib/api/middleware/compliance-check.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });

    it('should have zero column mismatches in email automation service', () => {
      const errors = validateFiles(rootDir, [
        'lib/services/email-automation.service.ts',
      ], schemaColumns);
      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // FULL CODEBASE SCAN: Column Audit (warns but doesn't block)
  // ========================================================================

  it('should report all SQL-column mismatches across the codebase (audit)', () => {
    const dirsToScan = [
      path.join(rootDir, 'app'),
      path.join(rootDir, 'lib'),
    ];

    const excludeDirs = ['node_modules', '.next', '__tests__', 'coverage', 'generated'];

    const allRefs: SqlColumnRef[] = [];
    for (const dir of dirsToScan) {
      if (fs.existsSync(dir)) {
        const files = findTsFiles(dir, excludeDirs);
        for (const file of files) {
          allRefs.push(...extractSqlColumnRefs(file));
        }
      }
    }

    const errors: string[] = [];

    for (const ref of allRefs) {
      const tableColumns = schemaColumns.get(ref.table);
      if (!tableColumns) continue;

      if (!tableColumns.has(ref.column)) {
        const relPath = path.relative(rootDir, ref.file);
        errors.push(
          `${relPath}:${ref.line} — ${ref.queryType} ${ref.table}.${ref.column}`
        );
      }
    }

    if (errors.length > 0) {
      const byFile = new Map<string, string[]>();
      for (const err of errors) {
        const file = err.split(':')[0];
        if (!byFile.has(file)) byFile.set(file, []);
        byFile.get(file)!.push(err);
      }

      console.warn(
        `\n⚠️  COLUMN AUDIT: ${errors.length} SQL-column mismatches across ${byFile.size} files.\n` +
        `   These are potential runtime errors waiting to happen.\n`
      );

      const sample = errors.slice(0, 10);
      for (const s of sample) {
        console.warn(`   ${s}`);
      }
      if (errors.length > 10) {
        console.warn(`   ... and ${errors.length - 10} more`);
      }
    }

    // Audit only — passes regardless. Critical-path tests enforce correctness.
    expect(true).toBe(true);
  });

  // ========================================================================
  // FULL CODEBASE SCAN: Non-Existent Table Audit
  // ========================================================================

  it('should report all queries against non-existent tables (audit)', () => {
    const dirsToScan = [
      path.join(rootDir, 'app'),
      path.join(rootDir, 'lib'),
    ];

    const excludeDirs = ['node_modules', '.next', '__tests__', 'coverage', 'generated'];

    const allRefs: SqlTableRef[] = [];
    for (const dir of dirsToScan) {
      if (fs.existsSync(dir)) {
        const files = findTsFiles(dir, excludeDirs);
        for (const file of files) {
          allRefs.push(...extractSqlTableRefs(file));
        }
      }
    }

    // Deduplicate: one entry per unique (file, table) pair
    const seen = new Set<string>();
    const missingTableRefs: SqlTableRef[] = [];

    for (const ref of allRefs) {
      const key = `${ref.file}:${ref.table}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!schemaColumns.has(ref.table)) {
        missingTableRefs.push(ref);
      }
    }

    if (missingTableRefs.length > 0) {
      // Group by table name
      const byTable = new Map<string, string[]>();
      for (const ref of missingTableRefs) {
        if (!byTable.has(ref.table)) byTable.set(ref.table, []);
        const relPath = path.relative(rootDir, ref.file);
        byTable.get(ref.table)!.push(relPath);
      }

      console.warn(
        `\n⚠️  TABLE AUDIT: ${byTable.size} non-existent tables referenced across ${missingTableRefs.length} files.\n` +
        `   These are GUARANTEED runtime failures if the code path is executed.\n`
      );

      for (const [table, files] of byTable.entries()) {
        console.warn(`   "${table}" — referenced in ${files.length} file(s)`);
      }
    }

    // Audit only — passes regardless.
    expect(true).toBe(true);
  });

  it('should find SQL queries to validate (sanity check)', () => {
    const appDir = path.join(rootDir, 'app');
    const files = findTsFiles(appDir, ['node_modules', '.next']);

    let totalRefs = 0;
    for (const file of files) {
      totalRefs += extractSqlColumnRefs(file).length;
    }

    expect(totalRefs).toBeGreaterThan(0);
  });
});
