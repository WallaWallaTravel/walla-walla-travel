import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const wineries = await prisma.wineries.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        specialties: true,
        winemaker: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ wineries })
  } catch (error) {
    console.error('Error fetching wineries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wineries' },
      { status: 500 }
    )
  }
}
