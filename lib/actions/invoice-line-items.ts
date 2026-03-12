'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const TAX_RATE = 0.091

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

// Serialized type for client components (no Decimal/Date)
export type SerializedLineItem = {
  id: number
  invoice_id: number
  description: string
  service_type: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export async function addLineItem(data: z.infer<typeof LineItemSchema>) {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const parsed = LineItemSchema.parse(data)
  const item = await prisma.invoice_line_items.create({ data: parsed })
  return serializeLineItem(item)
}

export async function updateLineItem(id: number, data: Partial<z.infer<typeof LineItemSchema>>) {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const item = await prisma.invoice_line_items.update({ where: { id }, data })
  return serializeLineItem(item)
}

export async function deleteLineItem(id: number) {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await prisma.invoice_line_items.delete({ where: { id } })
  return { success: true }
}

export async function getLineItemsForInvoice(invoiceId: number): Promise<SerializedLineItem[]> {
  const items = await prisma.invoice_line_items.findMany({
    where: { invoice_id: invoiceId },
    orderBy: { sort_order: 'asc' },
  })
  return items.map(serializeLineItem)
}

/**
 * Recalculate invoice totals from its line items
 */
export async function recalculateInvoiceTotals(invoiceId: number) {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const lineItems = await prisma.invoice_line_items.findMany({
    where: { invoice_id: invoiceId },
  })

  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount), 0)
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100

  // Get existing tip
  const invoice = await prisma.invoices.findUnique({
    where: { id: invoiceId },
    select: { tip_amount: true },
  })
  const tipAmount = invoice?.tip_amount ? Number(invoice.tip_amount) : 0
  const totalAmount = subtotal + taxAmount + tipAmount

  const updated = await prisma.invoices.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      updated_at: new Date(),
    },
  })

  return {
    subtotal: Number(updated.subtotal),
    tax_amount: updated.tax_amount != null ? Number(updated.tax_amount) : 0,
    tip_amount: updated.tip_amount != null ? Number(updated.tip_amount) : 0,
    total_amount: Number(updated.total_amount),
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(invoiceId: number, status: string) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') throw new Error('Unauthorized')

  const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled']
  if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`)

  const data: Record<string, unknown> = {
    status,
    updated_at: new Date(),
  }

  if (status === 'sent') data.sent_at = new Date()
  if (status === 'paid') data.paid_at = new Date()

  await prisma.invoices.update({
    where: { id: invoiceId },
    data,
  })

  return { success: true }
}

function serializeLineItem(item: {
  id: number
  invoice_id: number
  description: string
  service_type: string | null
  quantity: unknown
  unit_price: unknown
  amount: unknown
  sort_order: number
  notes: string | null
  created_at: Date | null
  updated_at: Date | null
}): SerializedLineItem {
  return {
    id: item.id,
    invoice_id: item.invoice_id,
    description: item.description,
    service_type: item.service_type,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    amount: Number(item.amount),
    sort_order: item.sort_order,
    notes: item.notes,
    created_at: item.created_at?.toISOString() ?? null,
    updated_at: item.updated_at?.toISOString() ?? null,
  }
}
