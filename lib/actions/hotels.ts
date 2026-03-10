'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export interface HotelResult {
  id: number
  name: string
  address: string
}

const FALLBACK_HOTELS: HotelResult[] = [
  { id: -1, name: 'Marcus Whitman Hotel', address: '6 W Rose St, Walla Walla, WA' },
  { id: -2, name: 'Courtyard by Marriott', address: '550 W Rose St, Walla Walla, WA' },
  { id: -3, name: 'The Finch Hotel', address: '325 E Main St, Walla Walla, WA' },
  { id: -4, name: 'Eritage Resort', address: '1457 Old Milton Hwy, Walla Walla, WA' },
  { id: -5, name: 'Abeja Inn', address: '2014 Mill Creek Rd, Walla Walla, WA' },
  { id: -6, name: 'The Barn at Walla Walla', address: 'Walla Walla, WA' },
]

export async function searchHotels(query: string): Promise<HotelResult[]> {
  const session = await getSession()
  if (!session?.user) return []

  if (query.length < 2) return []

  try {
    const hotels = await prisma.hotels.findMany({
      where: {
        is_active: true,
        name: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, name: true, address: true },
      take: 8,
      orderBy: { display_order: 'asc' },
    })

    if (hotels.length > 0) return hotels

    // Fallback if no results from DB
    return FALLBACK_HOTELS.filter((h) =>
      h.name.toLowerCase().includes(query.toLowerCase())
    )
  } catch {
    // Table might be empty or inaccessible — use fallback
    return FALLBACK_HOTELS.filter((h) =>
      h.name.toLowerCase().includes(query.toLowerCase())
    )
  }
}
