import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProposalEditor from './ProposalEditor'

// Serialize Prisma Decimal/Date fields to plain numbers/strings for client
function serializeProposal(p: NonNullable<Awaited<ReturnType<typeof fetchProposal>>>) {
  return {
    id: p.id,
    proposal_number: p.proposal_number,
    status: p.status || 'draft',
    customer_name: p.customer_name,
    customer_email: p.customer_email,
    customer_phone: p.customer_phone,
    customer_company: p.customer_company,
    trip_type: p.trip_type || 'wine_tour',
    trip_title: p.trip_title,
    party_size: p.party_size,
    start_date: p.start_date ? p.start_date.toISOString().split('T')[0] : '',
    end_date: p.end_date ? p.end_date.toISOString().split('T')[0] : null,
    introduction: p.introduction,
    special_notes: p.special_notes,
    internal_notes: p.internal_notes,
    discount_percentage: Number(p.discount_percentage ?? 0),
    discount_amount: Number(p.discount_amount ?? 0),
    tax_rate: Number(p.tax_rate ?? 0.091),
    taxes: Number(p.taxes ?? 0),
    gratuity_percentage: p.gratuity_percentage ?? 0,
    gratuity_amount: Number(p.gratuity_amount ?? 0),
    deposit_percentage: p.deposit_percentage ?? 50,
    deposit_amount: Number(p.deposit_amount ?? 0),
    deposit_paid: p.deposit_paid ?? false,
    subtotal: Number(p.subtotal ?? 0),
    total: Number(p.total ?? 0),
    balance_due: Number(p.balance_due ?? 0),
    days: p.trip_proposal_days.map((d) => ({
      id: d.id,
      day_number: d.day_number,
      date: d.date ? d.date.toISOString().split('T')[0] : '',
      title: d.title,
      stops: d.trip_proposal_stops.map((s) => ({
        id: s.id,
        stop_order: s.stop_order,
        stop_type: s.stop_type,
        custom_name: s.custom_name,
        custom_description: s.custom_description,
        scheduled_time: s.scheduled_time
          ? `${String(s.scheduled_time.getUTCHours()).padStart(2, '0')}:${String(s.scheduled_time.getUTCMinutes()).padStart(2, '0')}`
          : null,
        duration_minutes: s.duration_minutes,
        cost_note: s.cost_note,
      })),
    })),
    guests: p.trip_proposal_guests.map((g) => ({
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      rsvp_status: g.rsvp_status || 'pending',
      dietary_restrictions: g.dietary_restrictions,
      is_primary: g.is_primary ?? false,
    })),
    inclusions: p.trip_proposal_inclusions.map((inc) => ({
      id: inc.id,
      inclusion_type: inc.inclusion_type,
      description: inc.description,
      quantity: Number(inc.quantity ?? 1),
      unit: inc.unit,
      unit_price: Number(inc.unit_price ?? 0),
      total_price: Number(inc.total_price ?? 0),
      sort_order: inc.sort_order ?? 0,
      show_on_proposal: inc.show_on_proposal ?? true,
      notes: inc.notes,
    })),
  }
}

async function fetchProposal(id: number) {
  return prisma.trip_proposals.findUnique({
    where: { id },
    include: {
      trip_proposal_days: {
        orderBy: { day_number: 'asc' },
        include: {
          trip_proposal_stops: {
            orderBy: { stop_order: 'asc' },
          },
        },
      },
      trip_proposal_guests: {
        orderBy: { created_at: 'asc' },
      },
      trip_proposal_inclusions: {
        orderBy: { sort_order: 'asc' },
      },
    },
  })
}

export type SerializedProposal = ReturnType<typeof serializeProposal>

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const proposalId = parseInt(id, 10)

  if (isNaN(proposalId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid proposal ID</h2>
        <Link href="/admin/trip-proposals" className="text-indigo-600 hover:underline text-sm">
          Back to proposals
        </Link>
      </div>
    )
  }

  const proposal = await fetchProposal(proposalId)

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Proposal not found</h2>
        <Link href="/admin/trip-proposals" className="text-indigo-600 hover:underline text-sm">
          Back to proposals
        </Link>
      </div>
    )
  }

  const data = serializeProposal(proposal)

  return <ProposalEditor proposal={data} />
}
