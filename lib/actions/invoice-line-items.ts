'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const LineItemSchema = z.object({
  invoice_id: z.number().int().positive(),
  description: z.string().min(1).max(500),
  service_type: z.string().max(50).optional(),
  quantity: z.number().positive().default(1),
  unit_price: z.number(),
  amount: z.number(),
  sort_order: z.number().int().default(0),
  notes: z.string().optional(),
})

export async function addLineItem(data: z.infer<typeof LineItemSchema>) {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const parsed = LineItemSchema.parse(data)
  return prisma.invoice_line_items.create({ data: parsed })
}

export async function updateLineItem(id: number, data: Partial<z.infer<typeof LineItemSchema>>) {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return prisma.invoice_line_items.update({ where: { id }, data })
}

export async function deleteLineItem(id: number) {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return prisma.invoice_line_items.delete({ where: { id } })
}

export async function getLineItemsForInvoice(invoiceId: number) {
  return prisma.invoice_line_items.findMany({
    where: { invoice_id: invoiceId },
    orderBy: { sort_order: 'asc' },
  })
}
