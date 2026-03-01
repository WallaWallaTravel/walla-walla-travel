import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';

// ============================================================================
// GET /api/admin/partners/[id] - Get single partner with linked business data
// ============================================================================

export const GET = withAdminAuth(
  async (_request: NextRequest, _session, context) => {
    const { id } = await context!.params;
    const partnerId = parseInt(id);

    if (isNaN(partnerId)) {
      throw new NotFoundError('Invalid partner ID');
    }

    // Fetch partner with user info
    const partnerResult = await query(
      `SELECT pp.*, u.email as user_email, u.name as user_name
       FROM partner_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.id = $1`,
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      throw new NotFoundError('Partner not found');
    }

    const partner = partnerResult.rows[0];

    // Fetch linked winery data if applicable
    let linkedWinery = null;
    let wineryContent: Array<{ content_type: string; title: string; content: string }> = [];

    if (partner.winery_id) {
      const wineryResult = await query(
        `SELECT id, name, slug, short_description, description, meta_title, meta_description,
                cover_photo_url, website, phone, email, address, city, state,
                specialties, amenities, hours_of_operation, tasting_fee,
                reservation_required, is_active, is_featured, founded_year, winemaker,
                keywords, logo_url
         FROM wineries WHERE id = $1`,
        [partner.winery_id]
      );
      linkedWinery = wineryResult.rows[0] || null;

      const contentResult = await query<{ content_type: string; title: string; content: string }>(
        `SELECT content_type, title, content
         FROM winery_content WHERE winery_id = $1`,
        [partner.winery_id]
      );
      wineryContent = contentResult.rows;
    }

    // Count insider tips
    let insiderTipsCount = 0;
    if (partner.winery_id) {
      const tipsResult = await query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM winery_insider_tips WHERE winery_id = $1`,
        [partner.winery_id]
      );
      insiderTipsCount = parseInt(tipsResult.rows[0]?.count || '0');
    }

    // Count photos
    let photoCount = 0;
    if (partner.winery_id) {
      const photoResult = await query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM winery_media WHERE winery_id = $1`,
        [partner.winery_id]
      );
      photoCount = parseInt(photoResult.rows[0]?.count || '0');
    }

    return NextResponse.json({
      success: true,
      partner,
      linkedWinery,
      wineryContent,
      insiderTipsCount,
      photoCount,
    });
  }
);
