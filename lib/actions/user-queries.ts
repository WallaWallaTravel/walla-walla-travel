'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export type UserListItem = {
  id: number
  email: string
  name: string
  role: string
  phone: string | null
  is_active: boolean | null
  last_login: string | null
  created_at: string
  updated_at: string
}

export type UserDetail = UserListItem & {
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  license_number: string | null
  license_state: string | null
  license_expiry: string | null
  license_class: string | null
  medical_cert_expiry: string | null
  hired_date: string | null
  employment_status: string | null
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getUsers(filters?: {
  role?: string
  is_active?: boolean
  limit?: number
  offset?: number
}): Promise<{ users: UserListItem[]; total: number }> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { users: [], total: 0 }
  }

  const where: Prisma.usersWhereInput = {}

  if (filters?.role) {
    where.role = filters.role
  }
  if (filters?.is_active !== undefined) {
    where.is_active = filters.is_active
  }

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        is_active: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { name: 'asc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.users.count({ where }),
  ])

  return {
    users: users.map((u) => ({
      ...u,
      last_login: u.last_login?.toISOString() ?? null,
      created_at: u.created_at.toISOString(),
      updated_at: u.updated_at.toISOString(),
    })),
    total,
  }
}

export async function getUserById(id: number): Promise<UserDetail | null> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const user = await prisma.users.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      is_active: true,
      last_login: true,
      created_at: true,
      updated_at: true,
      emergency_contact_name: true,
      emergency_contact_phone: true,
      emergency_contact_relationship: true,
      license_number: true,
      license_state: true,
      license_expiry: true,
      license_class: true,
      medical_cert_expiry: true,
      hired_date: true,
      employment_status: true,
    },
  })

  if (!user) return null

  return {
    ...user,
    last_login: user.last_login?.toISOString() ?? null,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
    license_expiry: user.license_expiry?.toISOString() ?? null,
    medical_cert_expiry: user.medical_cert_expiry?.toISOString() ?? null,
    hired_date: user.hired_date?.toISOString() ?? null,
  }
}
