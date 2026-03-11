import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { prisma } from '@/lib/prisma'

export const GET = withAdminAuth(async (_request, _session) => {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, name, slug, description, specialties, winemaker
     FROM wineries
     ORDER BY name ASC`
  )

  return NextResponse.json({ wineries: rows })
})
