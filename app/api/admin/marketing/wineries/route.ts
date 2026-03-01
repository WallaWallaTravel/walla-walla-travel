import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (_request, _session) => {
  const result = await query(
    `SELECT id, name, slug, description, specialties, winemaker
     FROM wineries
     ORDER BY name ASC`
  )

  return NextResponse.json({ wineries: result.rows })
})
