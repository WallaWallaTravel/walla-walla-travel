import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { sharedTourService } from '@/lib/services/shared-tour.service'
import { prisma } from '@/lib/prisma'
import SharedTourDetailClient from './SharedTourDetailClient'

export default async function AdminSharedTourDetailPage({
  params,
}: {
  params: Promise<{ tour_id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { tour_id } = await params

  const tour = await sharedTourService.getTourWithAvailability(tour_id)
  if (!tour) redirect('/admin/shared-tours')

  const [tickets, manifest, { vehicles: availableVehicles, currentTicketsSold }] = await Promise.all([
    sharedTourService.getTicketsForTour(tour_id),
    sharedTourService.getTourManifest(tour_id),
    sharedTourService.getAvailableVehiclesForTour(tour_id),
  ])

  // Get vehicle info if assigned
  let vehicleInfo = null
  if (tour.vehicle_id) {
    const vehicleRows = await prisma.$queryRaw<{
      id: number
      make: string
      model: string
      capacity: number
      status: string
    }[]>`
      SELECT id, make, model, capacity, status
      FROM vehicles
      WHERE id = ${tour.vehicle_id}
    `
    if (vehicleRows[0]) {
      const v = vehicleRows[0]
      vehicleInfo = {
        id: v.id,
        name: `${v.make} ${v.model}`,
        capacity: v.capacity,
        status: v.status,
      }
    }
  }

  // Get trip_proposal_id
  const proposalLinkRows = await prisma.$queryRaw<{ trip_proposal_id: number | null }[]>`
    SELECT trip_proposal_id FROM shared_tours WHERE id = ${tour_id}
  `
  const tripProposalId = proposalLinkRows[0]?.trip_proposal_id || null

  // If linked to a proposal, get proposal info
  let linkedProposal = null
  if (tripProposalId) {
    const proposalRows = await prisma.$queryRaw<{ id: number; proposal_number: string; title: string; status: string }[]>`
      SELECT id, proposal_number, title, status FROM trip_proposals WHERE id = ${tripProposalId}
    `
    linkedProposal = proposalRows[0] || null
  }

  // Get ticket IDs on proposal
  const ticketIds = (tickets as Array<{ id: string }>).map(t => t.id)
  let ticketsOnProposal: string[] = []
  if (ticketIds.length > 0) {
    const crossRefRows = await prisma.$queryRaw<{ shared_tour_ticket_id: number }[]>`
      SELECT DISTINCT shared_tour_ticket_id
      FROM trip_proposal_guests
      WHERE shared_tour_ticket_id = ANY(${ticketIds}::int[])
    `
    ticketsOnProposal = crossRefRows.map(r => String(r.shared_tour_ticket_id))
  }

  // Get trip proposals for dropdown (limit 200)
  const tripProposalRows = await prisma.$queryRaw<{ id: number; proposal_number: string; title: string; status: string }[]>`
    SELECT id, proposal_number, title, status
    FROM trip_proposals
    ORDER BY created_at DESC
    LIMIT 200
  `

  // Suppress unused variable warning for manifest (fetched for side effects / future use)
  void manifest

  return (
    <SharedTourDetailClient
      tourId={tour_id}
      initialTour={tour}
      initialTickets={tickets}
      initialVehicleInfo={vehicleInfo}
      initialAvailableVehicles={availableVehicles}
      initialTicketsSold={currentTicketsSold}
      initialTripProposalId={tripProposalId}
      initialLinkedProposal={linkedProposal}
      initialTicketsOnProposal={ticketsOnProposal}
      initialTripProposals={tripProposalRows}
    />
  )
}
