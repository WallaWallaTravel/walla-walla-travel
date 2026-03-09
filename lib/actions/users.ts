'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/passwords'
import {
  CreateUserSchema,
  UpdateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/lib/schemas/admin'

// ============================================================================
// TYPES
// ============================================================================

export type UserActionResult = {
  success: boolean
  user?: { id: number; email: string; name: string; role: string }
  error?: string | Record<string, string[]>
}

// ============================================================================
// MUTATIONS
// ============================================================================

export async function createUser(data: CreateUserInput): Promise<UserActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateUserSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Check for existing email
    const existing = await prisma.users.findFirst({
      where: { email: { equals: v.email, mode: 'insensitive' } },
      select: { id: true },
    })

    if (existing) {
      return { success: false, error: 'Email already exists' }
    }

    const passwordHash = await hashPassword(v.password)

    const user = await prisma.users.create({
      data: {
        email: v.email.toLowerCase(),
        name: v.name,
        password_hash: passwordHash,
        role: v.role,
        phone: v.phone || null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return { success: true, user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user'
    return { success: false, error: message }
  }
}

export async function updateUser(data: UpdateUserInput): Promise<UserActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdateUserSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { id, ...updates } = parsed.data

  try {
    const user = await prisma.users.update({
      where: { id },
      data: {
        ...(updates.email !== undefined && { email: updates.email.toLowerCase() }),
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.role !== undefined && { role: updates.role }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.is_active !== undefined && { is_active: updates.is_active }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return { success: true, user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user'
    return { success: false, error: message }
  }
}

export async function deactivateUser(id: number): Promise<UserActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const user = await prisma.users.update({
      where: { id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return { success: true, user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate user'
    return { success: false, error: message }
  }
}

export async function activateUser(id: number): Promise<UserActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const user = await prisma.users.update({
      where: { id },
      data: {
        is_active: true,
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return { success: true, user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate user'
    return { success: false, error: message }
  }
}
