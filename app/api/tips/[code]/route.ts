/**
 * GET /api/tips/[code]
 *
 * Get tip page data for the public tip payment page
 * No authentication required - validates the tip code
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { tipService } from '@/lib/services/tip.service';
import { TipCodeSchema } from '@/lib/validation/schemas/tip.schemas';

export const GET = withErrorHandling(
  async (_request: NextRequest, { params }: { params: Promise<{ code: string }> }) => {
    const resolvedParams = await params;
    const code = resolvedParams.code.toUpperCase();

    // Validate tip code format
    const codeResult = TipCodeSchema.safeParse(code);
    if (!codeResult.success) {
      throw new BadRequestError('Invalid tip code format');
    }

    // Get tip page data
    const pageData = await tipService.getTipPageData(code);
    if (!pageData) {
      throw new NotFoundError('Invalid or expired tip code');
    }

    if (!pageData.tips_enabled) {
      throw new BadRequestError('Tips are not enabled for this tour');
    }

    // Return data needed for the tip payment page
    return NextResponse.json({
      success: true,
      data: {
        driver_name: pageData.driver_name,
        tour_date: pageData.tour_date,
        tour_total: pageData.tour_total,
        brand_name: pageData.brand_name,
        brand_logo_url: pageData.brand_logo_url,
        tip_code: pageData.tip_code,
        // Calculate suggested tip amounts
        suggested_tips: {
          fifteen_percent: Math.round(pageData.tour_total * 0.15 * 100) / 100,
          twenty_percent: Math.round(pageData.tour_total * 0.20 * 100) / 100,
          twenty_five_percent: Math.round(pageData.tour_total * 0.25 * 100) / 100,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }
);
