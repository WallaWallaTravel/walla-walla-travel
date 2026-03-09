'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import {
  UpdateSettingSchema,
  type UpdateSettingInput,
} from '@/lib/schemas/admin'

// ============================================================================
// TYPES
// ============================================================================

export type SettingActionResult = {
  success: boolean
  error?: string | Record<string, string[]>
}

// ============================================================================
// MUTATIONS (system_settings is @@ignore — must use raw queries)
// ============================================================================

export async function updateSetting(data: UpdateSettingInput): Promise<SettingActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdateSettingSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { setting_key, setting_value } = parsed.data
  const userId = session.user.id

  try {
    await prisma.$queryRawUnsafe(
      `UPDATE system_settings
       SET setting_value = $1::jsonb, updated_at = NOW(), updated_by = $2
       WHERE setting_key = $3`,
      JSON.stringify(setting_value),
      userId,
      setting_key
    )

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update setting'
    return { success: false, error: message }
  }
}
