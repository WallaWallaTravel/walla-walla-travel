import { getSession } from '@/lib/auth/session'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDriverInspections, type DriverInspection } from '@/lib/actions/compliance'
import DriverDetail from './DriverDetail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const driver = await prisma.users.findFirst({
    where: { id: Number(id), role: 'driver' },
    select: { name: true },
  })
  return {
    title: driver ? `${driver.name} | Drivers | Admin` : 'Driver Detail | Admin',
  }
}

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const driverId = Number(id)
  if (isNaN(driverId)) notFound()

  // Fetch driver profile (no relations for docs/time_cards in schema)
  const driver = await prisma.users.findFirst({
    where: { id: driverId, role: 'driver' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      is_active: true,
      hired_date: true,
      employment_status: true,
      license_number: true,
      license_state: true,
      license_class: true,
      license_expiry: true,
      cdl_endorsements: true,
      cdl_restrictions: true,
      medical_cert_number: true,
      medical_cert_expiry: true,
      medical_cert_type: true,
      medical_examiner_name: true,
      medical_examiner_registry_number: true,
      mvr_check_date: true,
      mvr_status: true,
      mvr_violations: true,
      background_check_date: true,
      background_check_status: true,
      road_test_date: true,
      road_test_passed: true,
      road_test_examiner: true,
      road_test_vehicle_type: true,
      drug_test_date: true,
      drug_test_status: true,
      annual_review_date: true,
      next_annual_review_date: true,
      dq_file_complete: true,
      dq_file_notes: true,
      dq_file_last_reviewed: true,
    },
  })

  if (!driver) notFound()

  // Fetch related data separately (no Prisma relations defined)
  const [documents, timeCards, inspections] = await Promise.all([
    prisma.driver_documents.findMany({
      where: { driver_id: driverId, is_active: true },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        document_type: true,
        document_name: true,
        document_number: true,
        expiry_date: true,
        verified: true,
        document_url: true,
      },
    }),
    prisma.time_cards.findMany({
      where: { driver_id: driverId },
      orderBy: { clock_in_time: 'desc' },
      take: 10,
      select: {
        id: true,
        date: true,
        clock_in_time: true,
        clock_out_time: true,
        driving_hours: true,
        on_duty_hours: true,
        vehicle_id: true,
        status: true,
      },
    }),
    getDriverInspections(driverId, 5),
  ])

  // Get vehicle names for time cards
  const vehicleIds = [...new Set(
    timeCards
      .map((tc) => tc.vehicle_id)
      .filter((v): v is number => v !== null)
  )]
  const vehicles = vehicleIds.length > 0
    ? await prisma.vehicles.findMany({
        where: { id: { in: vehicleIds } },
        select: { id: true, vehicle_number: true, make: true, model: true },
      })
    : []
  const vehicleMap = new Map(vehicles.map((v) => [v.id, `${v.vehicle_number} - ${v.make} ${v.model}`]))

  // Get vehicle names for inspections
  const inspVehicleIds = [...new Set(
    inspections
      .map((i) => i.vehicle_id)
      .filter((v): v is number => v !== null)
  )]
  const inspVehicles = inspVehicleIds.length > 0
    ? await prisma.vehicles.findMany({
        where: { id: { in: inspVehicleIds } },
        select: { id: true, vehicle_number: true },
      })
    : []
  const inspVehicleMap = new Map(inspVehicles.map((v) => [v.id, v.vehicle_number]))

  // Serialize for client
  const serialized = {
    id: driver.id,
    name: driver.name || 'Unnamed',
    email: driver.email || null,
    phone: driver.phone || null,
    is_active: driver.is_active ?? false,
    hired_date: driver.hired_date?.toISOString().split('T')[0] ?? null,
    employment_status: driver.employment_status || 'unknown',
    license_number: driver.license_number,
    license_state: driver.license_state,
    license_class: driver.license_class,
    license_expiry: driver.license_expiry?.toISOString().split('T')[0] ?? null,
    cdl_endorsements: driver.cdl_endorsements || [],
    cdl_restrictions: driver.cdl_restrictions || [],
    medical_cert_number: driver.medical_cert_number,
    medical_cert_expiry: driver.medical_cert_expiry?.toISOString().split('T')[0] ?? null,
    medical_cert_type: driver.medical_cert_type,
    medical_examiner_name: driver.medical_examiner_name,
    medical_examiner_registry_number: driver.medical_examiner_registry_number,
    mvr_check_date: driver.mvr_check_date?.toISOString().split('T')[0] ?? null,
    mvr_status: driver.mvr_status,
    mvr_violations: driver.mvr_violations,
    background_check_date: driver.background_check_date?.toISOString().split('T')[0] ?? null,
    background_check_status: driver.background_check_status,
    road_test_date: driver.road_test_date?.toISOString().split('T')[0] ?? null,
    road_test_passed: driver.road_test_passed,
    road_test_examiner: driver.road_test_examiner,
    road_test_vehicle_type: driver.road_test_vehicle_type,
    drug_test_date: driver.drug_test_date?.toISOString().split('T')[0] ?? null,
    drug_test_status: driver.drug_test_status,
    annual_review_date: driver.annual_review_date?.toISOString().split('T')[0] ?? null,
    next_annual_review_date: driver.next_annual_review_date?.toISOString().split('T')[0] ?? null,
    dq_file_complete: driver.dq_file_complete ?? false,
    dq_file_notes: driver.dq_file_notes,
    dq_file_last_reviewed: driver.dq_file_last_reviewed?.toISOString().split('T')[0] ?? null,
    documents: documents.map((d) => ({
      id: d.id,
      type: d.document_type,
      name: d.document_name,
      number: d.document_number,
      expiry_date: d.expiry_date?.toISOString().split('T')[0] ?? null,
      verified: d.verified ?? false,
      url: d.document_url,
    })),
    timeCards: timeCards.map((tc) => ({
      id: tc.id,
      date: tc.date?.toISOString().split('T')[0] ?? null,
      clock_in: tc.clock_in_time?.toISOString() ?? null,
      clock_out: tc.clock_out_time?.toISOString() ?? null,
      driving_hours: tc.driving_hours ? Number(tc.driving_hours) : null,
      on_duty_hours: tc.on_duty_hours ? Number(tc.on_duty_hours) : null,
      vehicle: tc.vehicle_id ? vehicleMap.get(tc.vehicle_id) ?? null : null,
      status: tc.status,
    })),
    inspections: inspections.map((i: DriverInspection) => ({
      id: i.id,
      date: i.created_at ? new Date(i.created_at).toISOString().split('T')[0] : null,
      type: i.type,
      vehicle: i.vehicle_id ? inspVehicleMap.get(i.vehicle_id) ?? null : null,
      status: i.status,
      defects_found: i.defects_found ?? false,
      defect_severity: i.defect_severity,
    })),
  }

  return <DriverDetail driver={serialized} />
}
