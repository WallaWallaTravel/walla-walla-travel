import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';

/**
 * GET /api/media/[media_id]
 * Get single media item with usage information
 */
export async function GET(
  request: Request,
  { params }: { params: { media_id: string } }
) {
  const pool = new Pool(getDbConfig());

  try {
    const result = await pool.query(
      `SELECT * FROM media_library WHERE id = $1 AND is_active = TRUE`,
      [params.media_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    const media = result.rows[0];

    // Get usage information
    const usageQueries = await Promise.all([
      // Proposals using this media
      pool.query(
        `SELECT p.id, p.proposal_number, p.title, p.client_name, p.status
         FROM proposals p
         JOIN proposal_media pm ON pm.proposal_id = p.id
         WHERE pm.media_id = $1
         ORDER BY p.created_at DESC`,
        [params.media_id]
      ),
      // Wineries linked to this media
      pool.query(
        `SELECT w.id, w.name, w.slug
         FROM wineries w
         JOIN winery_media wm ON wm.winery_id = w.id
         WHERE wm.media_id = $1`,
        [params.media_id]
      ),
      // Vehicles linked to this media
      pool.query(
        `SELECT v.id, v.name, v.license_plate
         FROM vehicles v
         JOIN vehicle_media vm ON vm.vehicle_id = v.id
         WHERE vm.media_id = $1`,
        [params.media_id]
      )
    ]);

    const usage = {
      proposals: usageQueries[0].rows,
      wineries: usageQueries[1].rows,
      vehicles: usageQueries[2].rows,
      total_uses: usageQueries[0].rows.length + usageQueries[1].rows.length + usageQueries[2].rows.length
    };

    // Increment view count
    await pool.query(
      `UPDATE media_library SET view_count = view_count + 1 WHERE id = $1`,
      [params.media_id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...media,
        usage
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * PUT /api/media/[media_id]
 * Update media metadata
 */
export async function PUT(
  request: Request,
  { params }: { params: { media_id: string } }
) {
  const pool = new Pool(getDbConfig());

  try {
    const body = await request.json();
    const {
      title,
      description,
      alt_text,
      tags,
      category,
      subcategory,
      is_hero,
      display_order
    } = body;

    const result = await pool.query(
      `UPDATE media_library 
       SET 
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         alt_text = COALESCE($3, alt_text),
         tags = COALESCE($4, tags),
         category = COALESCE($5, category),
         subcategory = COALESCE($6, subcategory),
         is_hero = COALESCE($7, is_hero),
         display_order = COALESCE($8, display_order),
         updated_at = NOW()
       WHERE id = $9 AND is_active = TRUE
       RETURNING *`,
      [
        title,
        description,
        alt_text,
        tags,
        category,
        subcategory,
        is_hero,
        display_order,
        params.media_id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update media' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * PATCH /api/media/[media_id]
 * Partial update of media metadata
 */
export async function PATCH(
  request: Request,
  { params }: { params: { media_id: string } }
) {
  const pool = new Pool(getDbConfig());

  try {
    const body = await request.json();
    const {
      title,
      description,
      alt_text,
      tags,
      category,
      subcategory,
      is_hero
    } = body;

    const result = await pool.query(
      `UPDATE media_library 
       SET 
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         alt_text = COALESCE($3, alt_text),
         tags = COALESCE($4, tags),
         category = COALESCE($5, category),
         subcategory = COALESCE($6, subcategory),
         is_hero = COALESCE($7, is_hero),
         updated_at = NOW()
       WHERE id = $8 AND is_active = TRUE
       RETURNING *`,
      [
        title,
        description,
        alt_text,
        tags,
        category,
        subcategory,
        is_hero,
        params.media_id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update media' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * DELETE /api/media/[media_id]
 * Soft delete media (set is_active = false)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { media_id: string } }
) {
  const pool = new Pool(getDbConfig());

  try {
    const result = await pool.query(
      `UPDATE media_library 
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [params.media_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete media' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

