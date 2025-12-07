/**
 * Admin Dashboard - Overview
 * 
 * Main landing page for administrators with key metrics and quick actions
 */

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db';

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
      `SELECT COUNT(*) as count FROM proposals WHERE status = 'pending'`
    ).catch(() => ({ rows: [{ count: 0 }] }));
    
    const acceptedProposalsCount = await query(
      `SELECT COUNT(*) as count FROM proposals WHERE status = 'accepted' AND converted_to_booking_id IS NULL`
    ).catch(() => ({ rows: [{ count: 0 }] }));
    
    const businessCount = await query(
      `SELECT COUNT(*) as count FROM business_portal WHERE status = 'pending'`
    ).catch(() => ({ rows: [{ count: 0 }] }));
    
    return {
      totalBookings: parseInt(bookingsCount.rows[0]?.count || '0'),
      pendingBookings: parseInt(pendingCount.rows[0]?.count || '0'),
      activeDrivers: parseInt(driversCount.rows[0]?.count || '0'),
      totalRevenue: parseFloat(revenueResult.rows[0]?.revenue || '0'),
      recentBookings: recentBookings.rows.map(booking => ({
        ...booking,
        total_price: parseFloat(booking.total_price as any || '0')
      })),
      pendingProposals: parseInt(proposalsCount.rows[0]?.count || '0'),
      acceptedProposals: parseInt(acceptedProposalsCount.rows[0]?.count || '0'),
      businessPortalSubmissions: parseInt(businessCount.rows[0]?.count || '0'),
    };
  } catch (error) {
    console.error('[Dashboard] Error fetching stats:', error);
    return {
      totalBookings: 0,
      pendingBookings: 0,
      activeDrivers: 0,
      totalRevenue: 0,
      recentBookings: [],
      pendingProposals: 0,
      acceptedProposals: 0,
      businessPortalSubmissions: 0,
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
          Here's what's happening with your business today
        </p>
      </div>
      
      {/* Action Required Alert - Accepted Proposals */}
      {stats.acceptedProposals > 0 && (
        <Link 
          href="/admin/proposals?status=accepted"
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
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Action Required</p>
                <p className="text-base font-semibold text-slate-900">
                  {stats.acceptedProposals} Accepted Proposal{stats.acceptedProposals !== 1 ? 's' : ''} Awaiting Conversion
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-medium text-sm">
              <span>Review</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      )}
      
      {/* Stats Grid - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Bookings */}
        <Link 
          href="/admin/bookings"
          className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-soft hover:border-[#9FB3C8] transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Bookings</p>
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
              <p className="text-lg font-semibold mt-0.5">Bookings</p>
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
          <h2 className="text-lg font-semibold text-slate-900">Recent Bookings</h2>
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
              View all bookings →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
