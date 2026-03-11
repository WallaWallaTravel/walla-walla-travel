import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler'
import { withCSRF } from '@/lib/api/middleware/csrf'
import { auditService } from '@/lib/services/audit.service'
import { z } from 'zod'

const DeleteBodySchema = z.object({
  id: z.number().int().positive(),
})

const PatchBodySchema = z.object({
  id: z.number().int().positive(),
  is_active: z.boolean().optional(),
})

// GET - Fetch connected social accounts
async function getHandler(_request: NextRequest) {
  const rows: any[] = await prisma.$queryRawUnsafe(`
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
    accounts: rows,
    total: rows.length
  })
}

// DELETE - Disconnect a social account
async function deleteHandler(request: NextRequest, userId: number) {
  const body = DeleteBodySchema.parse(await request.json())
  const { id } = body

  if (!id) {
    throw new BadRequestError('Account ID is required')
  }

  // Soft delete - mark as inactive
  const rows: any[] = await prisma.$queryRawUnsafe(`
    UPDATE social_accounts
    SET is_active = false,
        connection_status = 'disconnected',
        access_token_encrypted = NULL,
        refresh_token_encrypted = NULL,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `, id)

  if (rows.length === 0) {
    throw new NotFoundError('Account not found')
  }

  await auditService.logFromRequest(request, userId, 'resource_deleted', {
    entityType: 'social_account',
    entityId: id,
  });

  return NextResponse.json({
    success: true,
    message: 'Account disconnected'
  })
}

// PATCH - Update account settings
async function patchHandler(request: NextRequest, userId: number) {
  const body = PatchBodySchema.parse(await request.json())
  const { id, is_active } = body

  if (!id) {
    throw new BadRequestError('Account ID is required')
  }

  const rows: any[] = await prisma.$queryRawUnsafe(`
    UPDATE social_accounts
    SET is_active = COALESCE($2, is_active),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, id, is_active)

  if (rows.length === 0) {
    throw new NotFoundError('Account not found')
  }

  await auditService.logFromRequest(request, userId, 'resource_updated', {
    entityType: 'social_account',
    entityId: id,
    changes: { is_active },
  });

  return NextResponse.json({
    success: true,
    account: rows[0]
  })
}

export const GET = withAdminAuth(getHandler)
export const DELETE = withCSRF(
  withAdminAuth(async (request, session) => deleteHandler(request, parseInt(session.userId)))
)
export const PATCH = withCSRF(
  withAdminAuth(async (request, session) => patchHandler(request, parseInt(session.userId)))
)
