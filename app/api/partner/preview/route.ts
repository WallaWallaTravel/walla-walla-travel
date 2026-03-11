import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, UnauthorizedError, ForbiddenError } from '@/lib/api/middleware/error-handler';

export const GET = withErrorHandling(async () => {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError('Unauthorized');
  }

  if (session.user.role !== 'partner' && session.user.role !== 'admin') {
    throw new ForbiddenError('Forbidden');
  }

  // Get the winery associated with this user's email
  const wineryRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT * FROM wineries WHERE email = ${session.user.email} LIMIT 1`;

  const wineryData = wineryRows[0] || null;
  const wineryId = wineryData?.id;

  // Get narrative content (if winery exists)
  let narrativeContent: Array<{ content_type: string; content: string }> = [];
  if (wineryId) {
    narrativeContent = await prisma.$queryRaw<Array<{ content_type: string; content: string }>>`
      SELECT content_type, content FROM winery_content
       WHERE winery_id = ${wineryId}`;
  }

  // Get insider tips (if winery exists)
  let insiderTips: Array<{ tip_type: string; title: string; content: string }> = [];
  if (wineryId) {
    insiderTips = await prisma.$queryRaw<Array<{ tip_type: string; title: string; content: string }>>`
      SELECT tip_type, title, content FROM winery_insider_tips
       WHERE winery_id = ${wineryId}`;
  }

  // Get photos (if winery exists)
  const photos: Record<string, Array<{ id: number; url: string; alt_text: string | null }>> = {};
  if (wineryId) {
    const photosRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        wm.id,
        wm.section as category,
        wm.display_order,
        ml.file_path as url,
        ml.alt_text
       FROM winery_media wm
       JOIN media_library ml ON wm.media_id = ml.id
       WHERE wm.winery_id = ${wineryId}
         AND ml.file_type = 'image'
         AND ml.is_active = true
       ORDER BY wm.section, wm.display_order`;

    // Group by category
    for (const row of photosRows) {
      const category = (row.category as string) || 'gallery';
      if (!photos[category]) {
        photos[category] = [];
      }
      photos[category].push({
        id: row.id as number,
        url: row.url as string,
        alt_text: row.alt_text as string | null,
      });
    }
  }

  // Build preview object
  const preview = {
    business_name: session.user.name || (wineryData?.name as string) || 'Your Winery',
    slug: (wineryData?.slug as string) || 'your-winery',
    description: (wineryData?.description as string) || '',
    short_description: (wineryData?.short_description as string) || '',
    hero_image_url: (wineryData?.cover_photo_url as string) || null,
    location: (wineryData?.address as string) || '',
    price_range: (wineryData?.price_range as string) || '',
    features: (wineryData?.amenities as string[]) || [],
    experience_tags: [],
    specialties: (wineryData?.specialties as string[]) || [],
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
});
