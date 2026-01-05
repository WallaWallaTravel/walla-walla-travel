import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pool } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'partner' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the winery associated with this user's email
    const wineryResult = await pool.query(
      `SELECT * FROM wineries WHERE email = $1 LIMIT 1`,
      [session.user.email]
    );

    const wineryData = wineryResult.rows[0] || null;
    const wineryId = wineryData?.id;

    // Get narrative content (if winery exists)
    let narrativeContent: Array<{ content_type: string; content: string }> = [];
    if (wineryId) {
      const contentResult = await pool.query(
        `SELECT content_type, content FROM winery_content
         WHERE winery_id = $1`,
        [wineryId]
      );
      narrativeContent = contentResult.rows;
    }

    // Get insider tips (if winery exists)
    let insiderTips: Array<{ tip_type: string; title: string; content: string }> = [];
    if (wineryId) {
      const tipsResult = await pool.query(
        `SELECT tip_type, title, content FROM winery_insider_tips
         WHERE winery_id = $1`,
        [wineryId]
      );
      insiderTips = tipsResult.rows;
    }

    // Get photos (if winery exists)
    const photos: Record<string, Array<{ id: number; url: string; alt_text: string | null }>> = {};
    if (wineryId) {
      const photosResult = await pool.query(
        `SELECT
          wm.id,
          wm.section as category,
          wm.display_order,
          ml.file_path as url,
          ml.alt_text
         FROM winery_media wm
         JOIN media_library ml ON wm.media_id = ml.id
         WHERE wm.winery_id = $1
           AND ml.file_type = 'image'
           AND ml.is_active = true
         ORDER BY wm.section, wm.display_order`,
        [wineryId]
      );

      // Group by category
      for (const row of photosResult.rows) {
        const category = row.category || 'gallery';
        if (!photos[category]) {
          photos[category] = [];
        }
        photos[category].push({
          id: row.id,
          url: row.url,
          alt_text: row.alt_text,
        });
      }
    }

    // Build preview object
    const preview = {
      business_name: session.user.name || wineryData?.name || 'Your Winery',
      slug: wineryData?.slug || 'your-winery',
      description: wineryData?.description || '',
      short_description: wineryData?.short_description || '',
      hero_image_url: wineryData?.cover_photo_url || null,
      location: wineryData?.address || '',
      price_range: wineryData?.price_range || '',
      features: wineryData?.amenities || [],
      experience_tags: [],
      specialties: wineryData?.specialties || [],
      hours: wineryData?.hours_of_operation || {},
      // Narrative content
      origin_story: narrativeContent.find(c => c.content_type === 'origin_story')?.content || null,
      philosophy: narrativeContent.find(c => c.content_type === 'philosophy')?.content || null,
      what_makes_unique: narrativeContent.find(c => c.content_type === 'unique_story')?.content || null,
      // Tips
      insider_tips: insiderTips,
      // Photos
      photos: photos,
    };

    return NextResponse.json({ preview });
  } catch (error) {
    logger.error('Preview API error', { error });
    return NextResponse.json({ error: 'Failed to load preview' }, { status: 500 });
  }
}
