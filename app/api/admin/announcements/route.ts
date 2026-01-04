/**
 * Admin Announcements API
 * CRUD operations for site-wide announcements
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnnouncementInput {
  title: string;
  message?: string | null;
  link_text?: string | null;
  link_url?: string | null;
  type?: 'info' | 'warning' | 'promo' | 'event';
  position?: 'top' | 'homepage' | 'booking';
  background_color?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

/**
 * GET /api/admin/announcements
 * List all announcements (including inactive/expired for admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get('include_expired') !== 'false';

    let sql = `
      SELECT
        a.*,
        u.name as created_by_name,
        CASE
          WHEN a.is_active = false THEN 'inactive'
          WHEN a.expires_at IS NOT NULL AND a.expires_at < NOW() THEN 'expired'
          WHEN a.starts_at IS NOT NULL AND a.starts_at > NOW() THEN 'scheduled'
          ELSE 'active'
        END as status
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
    `;

    if (!includeExpired) {
      sql += ` WHERE a.expires_at IS NULL OR a.expires_at > NOW()`;
    }

    sql += ` ORDER BY a.created_at DESC`;

    const result = await query(sql);

    return NextResponse.json({
      success: true,
      announcements: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    logger.error('Admin announcements GET error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/announcements
 * Create a new announcement
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AnnouncementInput = await request.json();

    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO announcements
        (title, message, link_text, link_url, type, position, background_color, starts_at, expires_at, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        body.title.trim(),
        body.message?.trim() || null,
        body.link_text?.trim() || null,
        body.link_url?.trim() || null,
        body.type || 'info',
        body.position || 'top',
        body.background_color || null,
        body.starts_at || null,
        body.expires_at || null,
        body.is_active !== false,
        session.user.id,
      ]
    );

    return NextResponse.json({
      success: true,
      announcement: result.rows[0],
    });
  } catch (error) {
    logger.error('Admin announcements POST error', { error });
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/announcements
 * Update an existing announcement
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates }: { id: number } & AnnouncementInput = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'title', 'message', 'link_text', 'link_url',
      'type', 'position', 'background_color',
      'starts_at', 'expires_at', 'is_active'
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = $${paramIndex}`);
        values.push((updates as Record<string, unknown>)[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE announcements SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      announcement: result.rows[0],
    });
  } catch (error) {
    logger.error('Admin announcements PUT error', { error });
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/announcements
 * Delete an announcement
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `DELETE FROM announcements WHERE id = $1 RETURNING id`,
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_id: result.rows[0].id,
    });
  } catch (error) {
    logger.error('Admin announcements DELETE error', { error });
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}
