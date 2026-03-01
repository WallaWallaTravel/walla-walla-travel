import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';

// GET - Get price comparison matrix
export const GET = withAdminAuth(async (_request, _session) => {
  const competitors = await competitorMonitoringService.getPriceComparison();

  // NW Touring pricing (our pricing for comparison)
  // These should come from your own pricing configuration
  const nwTouring = {
    competitor_id: 0,
    competitor_name: 'NW Touring & Concierge (You)',
    priority_level: 'high' as const,
    pricing: [
      {
        type: 'hourly_rate' as const,
        name: 'Private Wine Tour (1-6 guests)',
        amount: 125,
        unit: 'hour',
        notes: '4hr minimum, all-inclusive',
      },
      {
        type: 'hourly_rate' as const,
        name: 'Group Tour (7-14 guests)',
        amount: 150,
        unit: 'hour',
        notes: '4hr minimum, Sprinter van',
      },
      {
        type: 'premium_package' as const,
        name: 'VIP Experience',
        amount: 299,
        unit: 'person',
        notes: 'Premium wineries, lunch included',
      },
      {
        type: 'group_discount' as const,
        name: 'Group Discount',
        amount: 10,
        unit: 'percent',
        notes: '10% off for groups of 8+',
      },
    ],
  };

  return NextResponse.json({
    nw_touring: nwTouring,
    competitors,
    last_updated: new Date().toISOString(),
  });
});
