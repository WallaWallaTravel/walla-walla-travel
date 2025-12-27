import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, NotFoundError } from '@/lib/api/middleware/error-handler';

/**
 * GET /api/proposals/[proposal_id]/media
 * Get media items associated with a proposal
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;

  // First, get the proposal ID from proposal_number
  const proposalResult = await query(
    `SELECT id FROM proposals WHERE proposal_number = $1 OR id::text = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposalId = proposalResult.rows[0].id;

  // Fetch media items linked to this proposal
  const mediaResult = await query(
    `SELECT
      m.id,
      m.file_name,
      m.file_path,
      m.file_type,
      m.title,
      m.description,
      m.alt_text,
      m.category,
      m.is_hero,
      pm.display_order
     FROM media_library m
     JOIN proposal_media pm ON pm.media_id = m.id
     WHERE pm.proposal_id = $1 AND m.is_active = TRUE
     ORDER BY pm.display_order ASC, m.created_at DESC`,
    [proposalId]
  );

  return NextResponse.json({
    success: true,
    data: mediaResult.rows
  });
});
