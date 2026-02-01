import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required')
  }
  return session
}

// GET - Fetch connected social accounts
async function getHandler(request: NextRequest) {
  await verifyAdmin(request)

  const result = await query(`
    SELECT
      id,
      platform,
      account_name,
      account_username,
      buffer_profile_id,
      avatar_url,
      connection_status,
      last_sync_at,
      last_error,
      is_active,
      created_at
    FROM social_accounts
    WHERE is_active = true
    ORDER BY platform, account_name
  `)

  return NextResponse.json({
    accounts: result.rows,
    total: result.rows.length
  })
}

// DELETE - Disconnect a social account
async function deleteHandler(request: NextRequest) {
  await verifyAdmin(request)

  const body = await request.json()
  const { id } = body

  if (!id) {
    throw new BadRequestError('Account ID is required')
  }

  // Soft delete - mark as inactive
  const result = await query(`
    UPDATE social_accounts
    SET is_active = false,
        connection_status = 'disconnected',
        access_token_encrypted = NULL,
        refresh_token_encrypted = NULL,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `, [id])

  if (result.rows.length === 0) {
    throw new NotFoundError('Account not found')
  }

  return NextResponse.json({
    success: true,
    message: 'Account disconnected'
  })
}

// PATCH - Update account settings
async function patchHandler(request: NextRequest) {
  await verifyAdmin(request)

  const body = await request.json()
  const { id, is_active } = body

  if (!id) {
    throw new BadRequestError('Account ID is required')
  }

  const result = await query(`
    UPDATE social_accounts
    SET is_active = COALESCE($2, is_active),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, is_active])

  if (result.rows.length === 0) {
    throw new NotFoundError('Account not found')
  }

  return NextResponse.json({
    success: true,
    account: result.rows[0]
  })
}

export const GET = withErrorHandling(getHandler)
export const DELETE = withErrorHandling(deleteHandler)
export const PATCH = withErrorHandling(patchHandler)
