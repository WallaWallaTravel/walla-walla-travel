import { NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/middleware/error-handler'
import { query } from '@/lib/db'

export const GET = withErrorHandling(async () => {
  const result = await query(
    `SELECT id, name, slug, description, specialties, winemaker
     FROM wineries
     ORDER BY name ASC`
  )

  return NextResponse.json({ wineries: result.rows })
})
