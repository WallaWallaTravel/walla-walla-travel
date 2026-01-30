import { NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/middleware/error-handler'
import { prisma } from '@/lib/prisma'

export const GET = withErrorHandling(async () => {
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
})
