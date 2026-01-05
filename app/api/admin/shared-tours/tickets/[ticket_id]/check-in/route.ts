import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { sharedTourService } from '@/lib/services/shared-tour.service';

interface RouteParams {
  params: Promise<{ ticket_id: string }>;
}

/**
 * POST /api/admin/shared-tours/tickets/[ticket_id]/check-in
 * Check in a ticket on tour day
 */
export const POST = withAdminAuth(async (request: NextRequest, _session: AuthSession, context) => {
  const { ticket_id } = await (context as RouteParams).params;

  const ticket = await sharedTourService.checkInTicket(ticket_id);
  if (!ticket) {
    return NextResponse.json(
      { success: false, error: 'Ticket not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: ticket,
    message: 'Ticket checked in successfully',
  });
});
