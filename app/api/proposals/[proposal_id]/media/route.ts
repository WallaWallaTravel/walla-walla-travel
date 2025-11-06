import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';

/**
 * GET /api/proposals/[proposal_id]/media
 * Get media items associated with a proposal
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposal_id: string }> }
) {
  const pool = new Pool(getDbConfig());
  const { proposal_id } = await params;

  try {
    // First, get the proposal ID from proposal_number
    const proposalResult = await pool.query(
      `SELECT id FROM proposals WHERE proposal_number = $1 OR id::text = $1`,
      [proposal_id]
    );

    if (proposalResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    const proposalId = proposalResult.rows[0].id;

    // Fetch media items linked to this proposal
    const mediaResult = await pool.query(
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
  } catch (error) {
    console.error('Error fetching proposal media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

