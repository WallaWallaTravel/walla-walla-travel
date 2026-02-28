/**
 * Admin Dashboard - Overview
 * 
 * Main landing page for administrators with key metrics and quick actions
 */

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

interface ComplianceItem {
  type: 'driver' | 'vehicle';
  entityId: number;
  entityName: string;
  field: string;
  fieldLabel: string;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: 'expired' | 'critical' | 'urgent' | 'warning';
}

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  activeDrivers: number;
  totalRevenue: number;
  recentBookings: Array<{
    id: number;
    booking_number: string;
    customer_name: string;
    tour_date: string;
    status: string;
    total_price: number;
  }>;
  pendingProposals: number;
  acceptedProposals: number;
  businessPortalSubmissions: number;
  complianceIssues: ComplianceItem[];
}

async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const bookingsCount = await query(
      `SELECT COUNT(*) as count FROM bookings`
    );
    
    const pendingCount = await query(
      `SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'`
    );
    
    const driversCount = await query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND is_active = true`
    );
    
    const revenueResult = await query(
      `SELECT COALESCE(SUM(total_price), 0) as revenue 
       FROM bookings 
       WHERE status IN ('confirmed', 'completed')`
    );
    
    const recentBookings = await query<{
      id: number;
      booking_number: string;
      customer_name: string;
      tour_date: string;
      status: string;
      total_price: number;
    }>(
      `SELECT id, booking_number, customer_name, tour_date, status, total_price
       FROM bookings
       ORDER BY created_at DESC
       LIMIT 5`
    );
    
    const proposalsCount = await query(
      `SELECT COUNT(*) as count FROM trip_proposals WHERE status IN ('draft', 'sent')`
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const acceptedProposalsCount = await query(
      `SELECT COUNT(*) as count FROM trip_proposals WHERE status = 'accepted' AND planning_phase = 'active_planning'`
    ).catch(() => ({ rows: [{ count: 0 }] }));
    
    const businessCount = await query(
      `SELECT COUNT(*) as count FROM business_portal WHERE status = 'pending'`
    ).catch(() => ({ rows: [{ count: 0 }] }));

    // Fetch compliance issues (40 days warning window)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + 40);
    const warningDateStr = warningDate.toISOString().split('T')[0];

    const complianceIssues: ComplianceItem[] = [];

    // Check driver compliance
    const driversCompliance = await query(
      `SELECT id, name, license_expiry, medical_cert_expiry
       FROM users
       WHERE role = 'driver' AND is_active = true
         AND (license_expiry <= $1 OR medical_cert_expiry <= $1)`,
      [warningDateStr]
    ).catch(() => ({ rows: [] }));

    // Severity thresholds: expired (<=0), critical (1-5 days), urgent (6-10 days), warning (11-40 days)
    const getSeverity = (daysUntil: number): 'expired' | 'critical' | 'urgent' | 'warning' => {
      if (daysUntil <= 0) return 'expired';
      if (daysUntil <= 5) return 'critical';
      if (daysUntil <= 10) return 'urgent';
      return 'warning';
    };

    for (const driver of driversCompliance.rows) {
      if (driver.license_expiry) {
        const expiry = new Date(driver.license_expiry);
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 40) {
          complianceIssues.push({
            type: 'driver',
            entityId: driver.id,
            entityName: driver.name,
            field: 'license_expiry',
            fieldLabel: 'Driver License',
            expiryDate: expiry.toISOString().split('T')[0],
            daysUntilExpiry: daysUntil,
            severity: getSeverity(daysUntil),
          });
        }
      }
      if (driver.medical_cert_expiry) {
        const expiry = new Date(driver.medical_cert_expiry);
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 40) {
          complianceIssues.push({
            type: 'driver',
            entityId: driver.id,
            entityName: driver.name,
            field: 'medical_cert_expiry',
            fieldLabel: 'Medical Certificate',
            expiryDate: expiry.toISOString().split('T')[0],
            daysUntilExpiry: daysUntil,
            severity: getSeverity(daysUntil),
          });
        }
      }
    }

    // Check vehicle compliance
    const vehiclesCompliance = await query(
      `SELECT id, name, insurance_expiry, registration_expiry
       FROM vehicles
       WHERE is_active = true
         AND (insurance_expiry <= $1 OR registration_expiry <= $1)`,
      [warningDateStr]
    ).catch(() => ({ rows: [] }));

    for (const vehicle of vehiclesCompliance.rows) {
      if (vehicle.insurance_expiry) {
        const expiry = new Date(vehicle.insurance_expiry);
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 40) {
          complianceIssues.push({
            type: 'vehicle',
            entityId: vehicle.id,
            entityName: vehicle.name,
            field: 'insurance_expiry',
            fieldLabel: 'Insurance',
            expiryDate: expiry.toISOString().split('T')[0],
            daysUntilExpiry: daysUntil,
            severity: getSeverity(daysUntil),
          });
        }
      }
      if (vehicle.registration_expiry) {
        const expiry = new Date(vehicle.registration_expiry);
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 40) {
          complianceIssues.push({
            type: 'vehicle',
            entityId: vehicle.id,
            entityName: vehicle.name,
            field: 'registration_expiry',
            fieldLabel: 'Registration',
            expiryDate: expiry.toISOString().split('T')[0],
            daysUntilExpiry: daysUntil,
            severity: getSeverity(daysUntil),
          });
        }
      }
    }

    // Sort by severity (expired first, then critical, then urgent, then warning)
    const severityOrder: Record<string, number> = { expired: 0, critical: 1, urgent: 2, warning: 3 };
    complianceIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      totalBookings: parseInt(bookingsCount.rows[0]?.count || '0'),
      pendingBookings: parseInt(pendingCount.rows[0]?.count || '0'),
      activeDrivers: parseInt(driversCount.rows[0]?.count || '0'),
      totalRevenue: parseFloat(revenueResult.rows[0]?.revenue || '0'),
      recentBookings: recentBookings.rows.map(booking => ({
        ...booking,
        total_price: parseFloat(String(booking.total_price) || '0')
      })),
      pendingProposals: parseInt(proposalsCount.rows[0]?.count || '0'),
      acceptedProposals: parseInt(acceptedProposalsCount.rows[0]?.count || '0'),
      businessPortalSubmissions: parseInt(businessCount.rows[0]?.count || '0'),
      complianceIssues,
    };
  } catch (error) {
    logger.error('[Dashboard] Error fetching stats', { error });
    return {
      totalBookings: 0,
      pendingBookings: 0,
      activeDrivers: 0,
      totalRevenue: 0,
      recentBookings: [],
      pendingProposals: 0,
      acceptedProposals: 0,
      businessPortalSubmissions: 0,
      complianceIssues: [],
    };
  }
}

export default async function AdminDashboardPage() {
  const session = await getSession();
  
  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }
  
  const stats = await getDashboardStats();
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {session.user.name}
        </h1>
        <p className="text-slate-500 mt-1">
          Here&apos;s what&apos;s happening with your business today
        </p>
      </div>
      
      {/* Action Required Alert - Trips in Planning */}
      {stats.acceptedProposals > 0 && (
        <Link
          href="/admin/bookings?tab=planning"
          className="block mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 hover:shadow-soft hover:border-emerald-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 text-white rounded-full p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Active Planning</p>
                <p className="text-base font-semibold text-slate-900">
                  {stats.acceptedProposals} Trip{stats.acceptedProposals !== 1 ? 's' : ''} Need Itinerary Planning
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-medium text-sm">
              <span>View Trips</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      )}

      {/* Compliance Alert Widget */}
      {stats.complianceIssues.length > 0 && (
        <div className="mb-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className={`px-4 py-3 flex items-center justify-between ${
            stats.complianceIssues.some(i => i.severity === 'expired')
              ? 'bg-red-50 border-b border-red-200'
              : stats.complianceIssues.some(i => i.severity === 'critical')
              ? 'bg-red-50 border-b border-red-200'
              : stats.complianceIssues.some(i => i.severity === 'urgent')
              ? 'bg-orange-50 border-b border-orange-200'
              : 'bg-yellow-50 border-b border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {stats.complianceIssues.some(i => i.severity === 'expired') ? '🔴' :
                 stats.complianceIssues.some(i => i.severity === 'critical') ? '🔴' :
                 stats.complianceIssues.some(i => i.severity === 'urgent') ? '🟠' : '🟡'}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Compliance Attention Needed
                </p>
                <p className="text-sm text-slate-700">
                  {stats.complianceIssues.filter(i => i.severity === 'expired').length > 0 && (
                    <span className="text-red-600 font-semibold mr-2">
                      {stats.complianceIssues.filter(i => i.severity === 'expired').length} expired
                    </span>
                  )}
                  {stats.complianceIssues.filter(i => i.severity === 'critical').length > 0 && (
                    <span className="text-red-500 font-semibold mr-2">
                      {stats.complianceIssues.filter(i => i.severity === 'critical').length} critical
                    </span>
                  )}
                  {stats.complianceIssues.filter(i => i.severity === 'urgent').length > 0 && (
                    <span className="text-orange-600 font-semibold mr-2">
                      {stats.complianceIssues.filter(i => i.severity === 'urgent').length} urgent
                    </span>
                  )}
                  {stats.complianceIssues.filter(i => i.severity === 'warning').length > 0 && (
                    <span className="text-yellow-700 font-semibold">
                      {stats.complianceIssues.filter(i => i.severity === 'warning').length} warning
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Link
              href="/admin/calendar"
              className="text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
            >
              View Calendar
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="p-4">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.complianceIssues.slice(0, 5).map((issue, idx) => (
                <div
                  key={`${issue.type}-${issue.entityId}-${issue.field}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      issue.severity === 'expired' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'critical' ? 'bg-red-100 text-red-600' :
                      issue.severity === 'urgent' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {issue.severity === 'expired' ? 'EXPIRED' :
                       issue.severity === 'critical' ? 'CRITICAL' :
                       issue.severity === 'urgent' ? 'URGENT' : 'WARNING'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {issue.type === 'driver' ? '👤' : '🚐'} {issue.entityName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {issue.fieldLabel} {issue.severity === 'expired' ? 'expired' : `expires ${issue.expiryDate}`}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={issue.type === 'driver' ? `/admin/users/${issue.entityId}` : `/admin/vehicles/${issue.entityId}`}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    View →
                  </Link>
                </div>
              ))}
              {stats.complianceIssues.length > 5 && (
                <p className="text-center text-sm text-slate-500 pt-2">
                  +{stats.complianceIssues.length - 5} more items
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Stats Grid - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Trips */}
        <Link
          href="/admin/bookings"
          className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-soft hover:border-[#9FB3C8] transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Trips</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats.totalBookings}
              </p>
            </div>
            <div className="bg-[#D9E2EC] rounded-lg p-2.5">
              <svg className="w-5 h-5 text-[#334E68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Link>
        
        {/* Pending Bookings */}
        <Link 
          href="/admin/bookings?status=pending"
          className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-soft hover:border-[#E8BA8F] transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-[#A5632B] mt-1">
                {stats.pendingBookings}
              </p>
              <p className="text-xs text-[#B87333] mt-0.5">View all →</p>
            </div>
            <div className="bg-[#FAEDE0] rounded-lg p-2.5">
              <svg className="w-5 h-5 text-[#A5632B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Link>
        
        {/* Active Drivers */}
        <Link 
          href="/admin/users?role=driver"
          className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-soft hover:border-emerald-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Drivers</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats.activeDrivers}
              </p>
            </div>
            <div className="bg-emerald-100 rounded-lg p-2.5">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </Link>
        
        {/* Total Revenue */}
        <Link 
          href="/admin/bookings?status=completed"
          className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-soft hover:border-emerald-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                ${Number(stats.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-emerald-100 rounded-lg p-2.5">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link 
          href="/admin/bookings" 
          className="bg-[#1E3A5F] hover:bg-[#1A3354] transition-colors rounded-lg p-5 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#BCCCDC]">Manage</p>
              <p className="text-lg font-semibold mt-0.5">Trips</p>
            </div>
            <svg className="w-6 h-6 text-[#BCCCDC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        
        <Link 
          href="/admin/users" 
          className="bg-slate-700 hover:bg-slate-800 transition-colors rounded-lg p-5 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Manage</p>
              <p className="text-lg font-semibold mt-0.5">Users</p>
            </div>
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        
        <Link 
          href="/admin/business-portal" 
          className="bg-[#A5632B] hover:bg-[#8B5225] transition-colors rounded-lg p-5 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#FAEDE0]">Review</p>
              <p className="text-lg font-semibold mt-0.5">Business Portal</p>
              {stats.businessPortalSubmissions > 0 && (
                <span className="inline-block bg-white text-[#A5632B] text-xs font-bold px-2 py-0.5 rounded mt-1">
                  {stats.businessPortalSubmissions} pending
                </span>
              )}
            </div>
            <svg className="w-6 h-6 text-[#FAEDE0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
      
      {/* Recent Bookings */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Recent Trips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Booking #
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tour Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {stats.recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    No bookings yet. Start by creating your first booking.
                  </td>
                </tr>
              ) : (
                stats.recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-[#1E3A5F]">
                      #{booking.booking_number}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-900">
                      {booking.customer_name}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-500">
                      {new Date(booking.tour_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs font-medium rounded ${
                        booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                        booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        booking.status === 'completed' ? 'bg-[#D9E2EC] text-[#1E3A5F]' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      ${parseFloat(String(booking.total_price || 0)).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm">
                      <Link 
                        href={`/admin/bookings/${booking.id}`}
                        className="text-[#334E68] hover:text-[#1A3354] font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {stats.recentBookings.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100">
            <Link 
              href="/admin/bookings"
              className="text-sm text-[#334E68] hover:text-[#1A3354] font-medium"
            >
              View all trips →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
