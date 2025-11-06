import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';

/**
 * GET /api/media
 * List media with optional filters
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  const fileType = searchParams.get('file_type');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const pool = new Pool(getDbConfig());

  try {
    let query = `
      SELECT 
        id,
        file_name,
        file_path,
        file_type,
        file_size,
        mime_type,
        category,
        subcategory,
        title,
        description,
        alt_text,
        tags,
        is_hero,
        display_order,
        thumbnail_path,
        medium_path,
        large_path,
        view_count,
        created_at,
        updated_at
      FROM media_library
      WHERE is_active = TRUE
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (subcategory) {
      paramCount++;
      query += ` AND subcategory = $${paramCount}`;
      params.push(subcategory);
    }

    if (fileType) {
      paramCount++;
      query += ` AND file_type = $${paramCount}`;
      params.push(fileType);
    }

    if (search) {
      paramCount++;
      query += ` AND (
        title ILIKE $${paramCount} OR 
        description ILIKE $${paramCount} OR 
        file_name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY is_hero DESC, display_order ASC, created_at DESC`;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM media_library WHERE is_active = TRUE`;
    if (category) countQuery += ` AND category = $1`;
    const countResult = await pool.query(
      countQuery,
      category ? [category] : []
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
        hasMore: offset + result.rows.length < parseInt(countResult.rows[0].count)
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
 * POST /api/media
 * Create new media entry (after file upload)
 */
export async function POST(request: Request) {
  const pool = new Pool(getDbConfig());

  try {
    const body = await request.json();
    const {
      file_name,
      file_path,
      file_type,
      file_size,
      mime_type,
      category,
      subcategory,
      title,
      description,
      alt_text,
      tags,
      is_hero,
      display_order,
      thumbnail_path,
      medium_path,
      large_path
    } = body;

    // Validate required fields
    if (!file_name || !file_path || !file_type || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO media_library (
        file_name, file_path, file_type, file_size, mime_type,
        category, subcategory, title, description, alt_text,
        tags, is_hero, display_order,
        thumbnail_path, medium_path, large_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        file_name,
        file_path,
        file_type,
        file_size,
        mime_type,
        category,
        subcategory,
        title || file_name,
        description,
        alt_text || title || file_name,
        tags || [],
        is_hero || false,
        display_order || 0,
        thumbnail_path,
        medium_path,
        large_path
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create media entry' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

