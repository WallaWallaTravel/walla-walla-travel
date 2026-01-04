import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { adminDashboardService } from '@/lib/services/admin-dashboard.service';

/**
 * GET /api/admin/dashboard
 * Returns real-time supervisor dashboard data
 * 
 * ✅ REFACTORED: Service layer + admin auth wrapper
 */
export const GET = withAdminAuth(async (_request: NextRequest, session) => {

  // ✅ Use service layer for all dashboard data
  const dashboardData = await adminDashboardService.getDashboardData();

  return NextResponse.json({
    success: true,
    data: dashboardData,
    message: 'Dashboard data retrieved successfully',
    timestamp: new Date().toISOString(),
  });
});
