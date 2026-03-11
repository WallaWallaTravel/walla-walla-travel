import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ComplianceDashboard, {
  type ComplianceData,
  type DriverCompliance,
  type ExpiringDocument,
  type VehicleCompliance,
  type VehicleAlertRow,
  type RecentInspection,
} from './ComplianceDashboard'

export const metadata = {
  title: 'Compliance Dashboard | Admin',
  description: 'FMCSA compliance overview — driver qualifications, vehicle status, and expiration tracking',
}

export default async function CompliancePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  // Fetch all data in parallel
  const [driversRaw, docsRaw, vehiclesRaw, alertsRaw, inspectionsRaw] = await Promise.all([
    // Drivers with compliance fields
    prisma.users.findMany({
      where: { role: 'driver' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        is_active: true,
        license_number: true,
        license_expiry: true,
        license_class: true,
        medical_cert_expiry: true,
        medical_cert_number: true,
        mvr_check_date: true,
        mvr_status: true,
        background_check_date: true,
        background_check_status: true,
        road_test_date: true,
        road_test_passed: true,
        drug_test_date: true,
        drug_test_status: true,
        annual_review_date: true,
        next_annual_review_date: true,
        dq_file_complete: true,
        dq_file_last_reviewed: true,
      },
    }),

    // Active driver documents with expiry dates
    prisma.driver_documents.findMany({
      where: { is_active: true },
      select: {
        id: true,
        driver_id: true,
        document_type: true,
        document_name: true,
        expiry_date: true,
        verified: true,
      },
    }),

    // Vehicles with compliance fields
    prisma.vehicles.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        vehicle_number: true,
        is_active: true,
        insurance_expiry: true,
        registration_expiry: true,
        next_service_due: true,
        last_inspection_date: true,
      },
    }),

    // Unresolved vehicle alerts
    prisma.vehicle_alerts.findMany({
      where: { resolved_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        vehicle_id: true,
        alert_type: true,
        severity: true,
        message: true,
        created_at: true,
      },
    }),

    // Recent inspections (last 30 days)
    prisma.inspections.findMany({
      where: {
        created_at: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        driver_id: true,
        vehicle_id: true,
        type: true,
        status: true,
        defects_found: true,
        defect_severity: true,
        created_at: true,
      },
    }),
  ])

  // Build driver name lookup
  const driverNameMap = new Map<number, string>()
  for (const d of driversRaw) {
    driverNameMap.set(d.id, d.name || 'Unnamed')
  }

  // Build vehicle name lookup
  const vehicleNameMap = new Map<number, string>()
  for (const v of vehiclesRaw) {
    vehicleNameMap.set(v.id, v.name || v.vehicle_number || `Vehicle #${v.id}`)
  }

  // Serialize drivers
  const drivers: DriverCompliance[] = driversRaw.map((d) => ({
    id: d.id,
    name: d.name || 'Unnamed',
    is_active: d.is_active ?? false,
    license_number: d.license_number,
    license_expiry: d.license_expiry?.toISOString().split('T')[0] ?? null,
    license_class: d.license_class,
    medical_cert_expiry: d.medical_cert_expiry?.toISOString().split('T')[0] ?? null,
    medical_cert_number: d.medical_cert_number,
    mvr_check_date: d.mvr_check_date?.toISOString().split('T')[0] ?? null,
    mvr_status: d.mvr_status,
    background_check_date: d.background_check_date?.toISOString().split('T')[0] ?? null,
    background_check_status: d.background_check_status,
    road_test_date: d.road_test_date?.toISOString().split('T')[0] ?? null,
    road_test_passed: d.road_test_passed,
    drug_test_date: d.drug_test_date?.toISOString().split('T')[0] ?? null,
    drug_test_status: d.drug_test_status,
    annual_review_date: d.annual_review_date?.toISOString().split('T')[0] ?? null,
    next_annual_review_date: d.next_annual_review_date?.toISOString().split('T')[0] ?? null,
    dq_file_complete: d.dq_file_complete ?? false,
    dq_file_last_reviewed: d.dq_file_last_reviewed?.toISOString().split('T')[0] ?? null,
  }))

  // Build expiration timeline — collect all dated items within 90 days
  const expirations: ExpiringDocument[] = []

  // Driver license expirations
  for (const d of driversRaw) {
    if (d.license_expiry && d.license_expiry <= ninetyDaysFromNow) {
      expirations.push({
        type: 'CDL',
        owner_name: d.name || 'Unnamed',
        owner_type: 'driver',
        expiry_date: d.license_expiry.toISOString().split('T')[0],
        status: d.license_expiry < now ? 'expired' : d.license_expiry <= thirtyDaysFromNow ? 'critical' : 'warning',
      })
    }
    if (d.medical_cert_expiry && d.medical_cert_expiry <= ninetyDaysFromNow) {
      expirations.push({
        type: 'Medical Certificate',
        owner_name: d.name || 'Unnamed',
        owner_type: 'driver',
        expiry_date: d.medical_cert_expiry.toISOString().split('T')[0],
        status: d.medical_cert_expiry < now ? 'expired' : d.medical_cert_expiry <= thirtyDaysFromNow ? 'critical' : 'warning',
      })
    }
    if (d.next_annual_review_date && d.next_annual_review_date <= ninetyDaysFromNow) {
      expirations.push({
        type: 'Annual Review',
        owner_name: d.name || 'Unnamed',
        owner_type: 'driver',
        expiry_date: d.next_annual_review_date.toISOString().split('T')[0],
        status: d.next_annual_review_date < now ? 'expired' : d.next_annual_review_date <= thirtyDaysFromNow ? 'critical' : 'warning',
      })
    }
  }

  // Driver document expirations
  for (const doc of docsRaw) {
    if (doc.expiry_date && doc.expiry_date <= ninetyDaysFromNow) {
      expirations.push({
        type: doc.document_type,
        owner_name: driverNameMap.get(doc.driver_id) || 'Unknown',
        owner_type: 'document',
        expiry_date: doc.expiry_date.toISOString().split('T')[0],
        status: doc.expiry_date < now ? 'expired' : doc.expiry_date <= thirtyDaysFromNow ? 'critical' : 'warning',
      })
    }
  }

  // Vehicle expirations
  for (const v of vehiclesRaw) {
    if (v.insurance_expiry && v.insurance_expiry <= ninetyDaysFromNow) {
      expirations.push({
        type: 'Insurance',
        owner_name: v.name || v.vehicle_number || `Vehicle #${v.id}`,
        owner_type: 'vehicle',
        expiry_date: v.insurance_expiry.toISOString().split('T')[0],
        status: v.insurance_expiry < now ? 'expired' : v.insurance_expiry <= thirtyDaysFromNow ? 'critical' : 'warning',
      })
    }
    if (v.registration_expiry && v.registration_expiry <= ninetyDaysFromNow) {
      expirations.push({
        type: 'Registration',
        owner_name: v.name || v.vehicle_number || `Vehicle #${v.id}`,
        owner_type: 'vehicle',
        expiry_date: v.registration_expiry.toISOString().split('T')[0],
        status: v.registration_expiry < now ? 'expired' : v.registration_expiry <= thirtyDaysFromNow ? 'critical' : 'warning',
      })
    }
    if (v.next_service_due && v.next_service_due <= ninetyDaysFromNow) {
      expirations.push({
        type: 'Service Due',
        owner_name: v.name || v.vehicle_number || `Vehicle #${v.id}`,
        owner_type: 'vehicle',
        expiry_date: v.next_service_due.toISOString().split('T')[0],
        status: v.next_service_due < now ? 'expired' : v.next_service_due <= thirtyDaysFromNow ? 'critical' : 'warning',
      })
    }
  }

  // Sort expirations by date (soonest first)
  expirations.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))

  // Serialize vehicles
  const vehicles: VehicleCompliance[] = vehiclesRaw.map((v) => ({
    id: v.id,
    name: v.name || v.vehicle_number || `Vehicle #${v.id}`,
    vehicle_number: v.vehicle_number,
    is_active: v.is_active ?? true,
    insurance_expiry: v.insurance_expiry?.toISOString().split('T')[0] ?? null,
    registration_expiry: v.registration_expiry?.toISOString().split('T')[0] ?? null,
    next_service_due: v.next_service_due?.toISOString().split('T')[0] ?? null,
    last_inspection_date: v.last_inspection_date?.toISOString().split('T')[0] ?? null,
  }))

  // Serialize vehicle alerts
  const vehicleAlerts: VehicleAlertRow[] = alertsRaw.map((a) => ({
    id: a.id,
    vehicle_id: a.vehicle_id,
    vehicle_name: vehicleNameMap.get(a.vehicle_id) || `Vehicle #${a.vehicle_id}`,
    alert_type: a.alert_type,
    severity: a.severity,
    message: a.message,
    created_at: a.created_at?.toISOString() ?? null,
  }))

  // Serialize inspections
  const inspections: RecentInspection[] = inspectionsRaw.map((i) => ({
    id: i.id,
    driver_name: driverNameMap.get(i.driver_id) || 'Unknown',
    vehicle_name: vehicleNameMap.get(i.vehicle_id) || 'Unknown',
    type: i.type,
    status: i.status,
    defects_found: i.defects_found ?? false,
    defect_severity: i.defect_severity,
    created_at: i.created_at.toISOString(),
  }))

  // Calculate summary stats
  const activeDrivers = driversRaw.filter((d) => d.is_active)
  const expiredCount = expirations.filter((e) => e.status === 'expired').length
  const criticalCount = expirations.filter((e) => e.status === 'critical').length
  const warningCount = expirations.filter((e) => e.status === 'warning').length
  const dqIncomplete = activeDrivers.filter((d) => !d.dq_file_complete).length
  const unresolvedAlerts = alertsRaw.length
  const defectInspections = inspectionsRaw.filter((i) => i.defects_found).length

  const data: ComplianceData = {
    summary: {
      total_drivers: driversRaw.length,
      active_drivers: activeDrivers.length,
      total_vehicles: vehiclesRaw.length,
      active_vehicles: vehiclesRaw.filter((v) => v.is_active).length,
      expired_items: expiredCount,
      critical_items: criticalCount,
      warning_items: warningCount,
      dq_incomplete: dqIncomplete,
      unresolved_alerts: unresolvedAlerts,
      defect_inspections: defectInspections,
    },
    drivers,
    expirations,
    vehicles,
    vehicle_alerts: vehicleAlerts,
    inspections,
  }

  return <ComplianceDashboard data={data} />
}
