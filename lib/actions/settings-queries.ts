'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPES
// ============================================================================

export type SystemSettingItem = {
  setting_key: string
  setting_value: unknown
  setting_type: string
  description: string | null
  updated_at: string | null
  updated_by: number | null
}

// ============================================================================
// QUERIES (system_settings is @@ignore — must use raw queries)
// ============================================================================

export async function getAllSettings(): Promise<SystemSettingItem[]> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  const rows = await prisma.$queryRawUnsafe<SystemSettingItem[]>(
    `SELECT setting_key, setting_value, setting_type, description, updated_at, updated_by
     FROM system_settings
     ORDER BY setting_type, setting_key`
  )

  return rows.map((r) => ({
    ...r,
    updated_at: r.updated_at ? String(r.updated_at) : null,
  }))
}

export async function getSetting(key: string): Promise<unknown> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const rows = await prisma.$queryRawUnsafe<{ setting_value: unknown }[]>(
    `SELECT setting_value FROM system_settings WHERE setting_key = $1`,
    key
  )

  if (rows.length === 0) return null
  return rows[0].setting_value
}

export async function getSettingsByType(type: string): Promise<SystemSettingItem[]> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return []
  }

  const rows = await prisma.$queryRawUnsafe<SystemSettingItem[]>(
    `SELECT setting_key, setting_value, setting_type, description, updated_at, updated_by
     FROM system_settings
     WHERE setting_type = $1
     ORDER BY setting_key`,
    type
  )

  return rows.map((r) => ({
    ...r,
    updated_at: r.updated_at ? String(r.updated_at) : null,
  }))
}
