import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/inbound-emails
 *
 * List inbound emails. Defaults to unmatched only.
 * Query params: ?status=unmatched|all
 */
export const GET = withAdminAuth(
  async (request: NextRequest, _session: AuthSession) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'unmatched';

    const whereClause = status === 'all'
      ? Prisma.sql``
      : Prisma.sql`WHERE routing_method = 'unmatched' OR routing_method IS NULL`;

    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
      Prisma.sql`SELECT id, from_address, to_address, subject, body_text,
              routed_to_stop_id, routing_method, routed_at, created_at
       FROM inbound_email_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 100`
    );

    return NextResponse.json({ success: true, data: rows });
  }
);
