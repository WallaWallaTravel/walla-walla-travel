import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { competitorAIService } from '@/lib/services/competitor-ai.service';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import { logger } from '@/lib/logger';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

interface AnalyzeRequest {
  type: 'change' | 'competitor' | 'market' | 'swot_suggestions';
  change_id?: number;
  competitor_id?: number;
}

// POST - Trigger AI analysis
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const body = await request.json() as AnalyzeRequest;

    if (!body.type) {
      throw new BadRequestError('Analysis type is required');
    }

    switch (body.type) {
      case 'change': {
        if (!body.change_id) {
          throw new BadRequestError('change_id is required for change analysis');
        }

        // Get the change and competitor
        const { changes } = await competitorMonitoringService.getAllRecentChanges({ limit: 1000 });
        const change = changes.find(c => c.id === body.change_id);

        if (!change) {
          throw new NotFoundError('Change not found');
        }

        const competitor = await competitorMonitoringService.getCompetitorById(change.competitor_id);
        if (!competitor) {
          throw new NotFoundError('Competitor not found');
        }

        const analysis = await competitorAIService.analyzeChange(change, competitor);

        return NextResponse.json({
          success: true,
          analysis_type: 'change',
          analysis,
        });
      }

      case 'competitor': {
        if (!body.competitor_id) {
          throw new BadRequestError('competitor_id is required for competitor analysis');
        }

        const analysis = await competitorAIService.analyzeCompetitor(body.competitor_id);

        return NextResponse.json({
          success: true,
          analysis_type: 'competitor',
          analysis,
        });
      }

      case 'market': {
        const analysis = await competitorAIService.analyzeMarketPosition();

        return NextResponse.json({
          success: true,
          analysis_type: 'market',
          analysis,
        });
      }

      case 'swot_suggestions': {
        if (!body.competitor_id) {
          throw new BadRequestError('competitor_id is required for SWOT suggestions');
        }

        const suggestions = await competitorAIService.generateSwotSuggestions(body.competitor_id);

        return NextResponse.json({
          success: true,
          analysis_type: 'swot_suggestions',
          suggestions,
        });
      }

      default:
        throw new BadRequestError('Invalid analysis type. Use: change, competitor, market, or swot_suggestions');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof UnauthorizedError ? 401 :
                   error instanceof BadRequestError ? 400 :
                   error instanceof NotFoundError ? 404 : 500;

    logger.error('Competitor analysis error', { error: message, status });

    return NextResponse.json({ error: message }, { status });
  }
}
