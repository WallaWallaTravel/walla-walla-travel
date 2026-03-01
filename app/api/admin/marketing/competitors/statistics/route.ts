import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';

// GET - Get monitoring statistics
export const GET = withAdminAuth(async (_request, _session) => {
  const stats = await competitorMonitoringService.getStatistics();

  return NextResponse.json(stats);
});
