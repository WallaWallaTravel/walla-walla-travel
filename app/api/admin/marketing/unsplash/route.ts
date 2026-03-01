import { NextRequest, NextResponse } from 'next/server'
import { unsplashService, UnsplashPhoto } from '@/lib/services/unsplash.service'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError } from '@/lib/api/middleware/error-handler'

// GET - Search Unsplash photos
const getHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || searchParams.get('query')
  const orientation = searchParams.get('orientation') as 'landscape' | 'portrait' | 'squarish' | undefined
  const count = parseInt(searchParams.get('count') || '10')

  if (!query) {
    throw new BadRequestError('Query parameter is required')
  }

  try {
    const result = await unsplashService.searchPhotos(query, {
      perPage: Math.min(count, 20),
      orientation,
    })

    // Transform to simpler format for frontend
    const photos = result.results.map((photo: UnsplashPhoto) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      alt: photo.alt_description || photo.description || query,
      attribution: unsplashService.getAttribution(photo),
      attributionLink: unsplashService.getAttributionLink(photo),
      downloadUrl: photo.links.download_location,
      width: photo.width,
      height: photo.height,
    }))

    return NextResponse.json({
      photos,
      total: result.total,
    })
  } catch (error) {
    // Check if Unsplash is not configured
    if (error instanceof Error && error.message.includes('UNSPLASH_ACCESS_KEY')) {
      return NextResponse.json({
        photos: [],
        total: 0,
        error: 'Unsplash not configured. Set UNSPLASH_ACCESS_KEY environment variable.',
      })
    }
    throw error
  }
})

// POST - Track photo download (for Unsplash API compliance)
const postHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json()
  const { photo_id } = body

  if (!photo_id) {
    throw new BadRequestError('photo_id is required')
  }

  try {
    const photo = await unsplashService.getPhoto(photo_id)
    await unsplashService.trackDownload(photo)

    return NextResponse.json({
      success: true,
      message: 'Download tracked',
    })
  } catch {
    // Don't fail if tracking fails
    return NextResponse.json({
      success: true,
      message: 'Tracking skipped',
    })
  }
})

export const GET = getHandler
export const POST = postHandler
