/**
 * Supabase Database Linter — Daily Security Audit
 *
 * Runs the Supabase database linter (extensions.lint) and alerts on
 * SECURITY-category errors. Results stored in system_health_checks
 * for dashboard visibility.
 *
 * Schedule: Daily at 6 AM UTC (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/prisma-query'
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';
import { withCronLock } from '@/lib/api/middleware/cron-lock';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface LintResult {
  name: string;
  level: string;
  detail: string;
  metadata: Record<string, unknown>;
}

const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';

export const GET = withCronAuth('supabase-lint', async (_request: NextRequest) => {
  return withCronLock('supabase-lint', async () => {
    logger.info('Starting Supabase database lint check');
    const start = Date.now();

    let lintResults: LintResult[] = [];

    try {
      const result = await query<LintResult>(
        `SELECT name, level, detail, metadata
         FROM extensions.lint()
         WHERE level IN ('ERROR', 'WARN')
           AND categories @> ARRAY['SECURITY']`
      );
      lintResults = result.rows;
    } catch (err) {
      // extensions.lint() may not be available — log and store as degraded
      logger.error('Failed to run extensions.lint()', { error: err });

      await query(
        `INSERT INTO system_health_checks (check_type, check_name, status, response_time_ms, error_message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'database',
          'supabase-lint',
          'degraded',
          Date.now() - start,
          'extensions.lint() not available',
          JSON.stringify({ error: String(err) }),
        ]
      );

      return NextResponse.json({
        success: false,
        message: 'extensions.lint() not available — check if splinter extension is enabled',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    const errors = lintResults.filter(r => r.level === 'ERROR');
    const warnings = lintResults.filter(r => r.level === 'WARN');
    const durationMs = Date.now() - start;

    // Determine health status
    const status = errors.length > 0 ? 'unhealthy' : warnings.length > 0 ? 'degraded' : 'healthy';

    // Store results in system_health_checks
    await query(
      `INSERT INTO system_health_checks (check_type, check_name, status, response_time_ms, error_message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'database',
        'supabase-lint',
        status,
        durationMs,
        errors.length > 0 ? `${errors.length} security ERROR(s) found` : null,
        JSON.stringify({
          errorCount: errors.length,
          warningCount: warnings.length,
          errors: errors.map(e => ({ name: e.name, detail: e.detail, metadata: e.metadata })),
          warnings: warnings.map(w => ({ name: w.name, detail: w.detail, metadata: w.metadata })),
        }),
      ]
    );

    // Send admin alert if any ERRORs found
    if (errors.length > 0) {
      const errorRows = errors.map(e =>
        `<tr><td style="padding:8px;border:1px solid #ddd;">${e.name}</td>` +
        `<td style="padding:8px;border:1px solid #ddd;">${e.detail}</td>` +
        `<td style="padding:8px;border:1px solid #ddd;"><pre>${JSON.stringify(e.metadata, null, 2)}</pre></td></tr>`
      ).join('\n');

      await sendEmail({
        to: STAFF_EMAIL,
        subject: `[CRITICAL] Supabase Lint: ${errors.length} security error(s) found`,
        html: `
          <h2 style="color:#dc2626;">Supabase Database Lint — Security Errors</h2>
          <p>The daily database lint check found <strong>${errors.length} ERROR-level</strong> security issue(s).</p>
          <table style="border-collapse:collapse;width:100%;">
            <thead>
              <tr style="background:#fee2e2;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Rule</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Detail</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Metadata</th>
              </tr>
            </thead>
            <tbody>
              ${errorRows}
            </tbody>
          </table>
          ${warnings.length > 0 ? `<p style="color:#d97706;margin-top:16px;">${warnings.length} warning(s) also found.</p>` : ''}
          <p style="margin-top:16px;color:#6b7280;">Run <code>SELECT * FROM extensions.lint() WHERE level = 'ERROR'</code> in the Supabase SQL Editor for full details.</p>
        `,
      });

      logger.error('Supabase lint found security errors', {
        errorCount: errors.length,
        warningCount: warnings.length,
        errors: errors.map(e => e.name),
      });
    } else {
      // Clean or warnings-only — log as info
      logger.info('Supabase lint check completed', {
        status,
        warningCount: warnings.length,
        durationMs,
      });
    }

    return NextResponse.json({
      success: true,
      status,
      errorCount: errors.length,
      warningCount: warnings.length,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  });
});

export const POST = GET;
