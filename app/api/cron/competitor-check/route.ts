import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import { logger } from '@/lib/logger';
import type { ChangeType, Significance, ThreatLevel, MonitoringResult } from '@/types/competitors';

// Verify the request is from Vercel Cron
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // In development, allow without secret
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Simple HTML to text extraction
function extractText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000); // Limit to 50k chars for storage
}

// Generate content hash for change detection
function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Fetch a page and extract content
async function fetchPage(url: string): Promise<{
  success: boolean;
  content?: string;
  text?: string;
  hash?: string;
  status?: number;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WallaWallaTravel/1.0; +https://wallawalla.travel)',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      return { success: false, status: response.status, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const text = extractText(html);
    const hash = hashContent(text);

    return {
      success: true,
      content: html,
      text,
      hash,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown fetch error',
    };
  }
}

// Analyze changes using simple heuristics (AI analysis would be added separately)
function analyzeChange(oldText: string, newText: string, pageType: string): {
  changeType: ChangeType;
  significance: Significance;
  description: string;
  threatLevel: ThreatLevel;
} | null {
  const oldLower = oldText.toLowerCase();
  const newLower = newText.toLowerCase();

  // Check for pricing changes
  const pricePattern = /\$\d+(?:\.\d{2})?/g;
  const oldPrices = oldLower.match(pricePattern) || [];
  const newPrices = newLower.match(pricePattern) || [];

  if (JSON.stringify(oldPrices.sort()) !== JSON.stringify(newPrices.sort())) {
    // Prices changed
    const oldAvg = oldPrices.reduce((sum, p) => sum + parseFloat(p.replace('$', '')), 0) / (oldPrices.length || 1);
    const newAvg = newPrices.reduce((sum, p) => sum + parseFloat(p.replace('$', '')), 0) / (newPrices.length || 1);

    const percentChange = ((newAvg - oldAvg) / oldAvg) * 100;
    const significance: Significance = Math.abs(percentChange) > 15 ? 'high' : Math.abs(percentChange) > 5 ? 'medium' : 'low';
    const threatLevel: ThreatLevel = percentChange < -10 ? 'high' : percentChange < 0 ? 'medium' : 'low';

    return {
      changeType: 'pricing',
      significance,
      description: `Pricing ${percentChange < 0 ? 'decreased' : 'increased'} by approximately ${Math.abs(percentChange).toFixed(0)}%`,
      threatLevel,
    };
  }

  // Check for promotional keywords
  const promoKeywords = ['special', 'discount', 'save', 'off', 'deal', 'promotion', 'limited', 'free'];
  const hadPromo = promoKeywords.some(k => oldLower.includes(k));
  const hasPromo = promoKeywords.some(k => newLower.includes(k));

  if (!hadPromo && hasPromo) {
    return {
      changeType: 'promotion',
      significance: 'medium',
      description: 'New promotional content detected on the page',
      threatLevel: 'medium',
    };
  }

  // Check for new package/tour keywords
  const packageKeywords = ['new tour', 'new package', 'introducing', 'now offering', 'experience'];
  const hadPackage = packageKeywords.some(k => oldLower.includes(k));
  const hasPackage = packageKeywords.some(k => newLower.includes(k));

  if (!hadPackage && hasPackage) {
    return {
      changeType: 'new_offering',
      significance: 'medium',
      description: 'New tour or package offering detected',
      threatLevel: 'low',
    };
  }

  // General content change
  const changeRatio = Math.abs(newText.length - oldText.length) / Math.max(oldText.length, 1);
  if (changeRatio > 0.2) {
    return {
      changeType: 'content',
      significance: changeRatio > 0.5 ? 'medium' : 'low',
      description: `Significant content update detected (${(changeRatio * 100).toFixed(0)}% change in content length)`,
      threatLevel: 'none',
    };
  }

  return null; // No significant change
}

// Main monitoring function
async function monitorCompetitors(): Promise<{
  checked: number;
  changesDetected: number;
  results: MonitoringResult[];
  errors: { competitorId: number; error: string }[];
}> {
  const competitors = await competitorMonitoringService.getCompetitors({
    activeOnly: true,
    includeChangeCounts: false,
  });

  const results: MonitoringResult[] = [];
  const errors: { competitorId: number; error: string }[] = [];
  let totalChanges = 0;

  for (const competitor of competitors) {
    if (competitor.competitor_type === 'content_benchmark') {
      // Skip content benchmarks for now (different monitoring strategy)
      continue;
    }

    const result: MonitoringResult = {
      competitor_id: competitor.id,
      competitor_name: competitor.name,
      pages_checked: 0,
      changes_detected: 0,
      changes: [],
      checked_at: new Date().toISOString(),
    };

    try {
      // Build URLs to check
      const baseUrl = competitor.website_url.replace(/\/$/, '');
      const pagesToCheck = [
        { type: 'homepage', url: baseUrl },
        { type: 'pricing', url: `${baseUrl}/pricing` },
        { type: 'tours', url: `${baseUrl}/tours` },
      ];

      for (const page of pagesToCheck) {
        // Check if we should monitor this page type
        if (page.type === 'pricing' && !competitor.monitor_pricing) continue;
        if (page.type === 'tours' && !competitor.monitor_packages) continue;

        const fetchResult = await fetchPage(page.url);
        result.pages_checked++;

        if (!fetchResult.success || !fetchResult.text || !fetchResult.hash) {
          continue; // Skip failed fetches
        }

        // Get existing snapshot
        const existingSnapshot = await competitorMonitoringService.getSnapshot(
          competitor.id,
          page.type
        );

        // Store new snapshot
        await competitorMonitoringService.upsertSnapshot({
          competitorId: competitor.id,
          pageType: page.type,
          pageUrl: page.url,
          contentHash: fetchResult.hash,
          contentText: fetchResult.text,
          httpStatus: fetchResult.status,
        });

        // Compare with existing snapshot
        if (existingSnapshot && existingSnapshot.content_hash !== fetchResult.hash) {
          const analysis = analyzeChange(
            existingSnapshot.content_text || '',
            fetchResult.text,
            page.type
          );

          if (analysis) {
            // Create change record
            await competitorMonitoringService.createChange({
              competitor_id: competitor.id,
              change_type: analysis.changeType,
              significance: analysis.significance,
              title: `${analysis.changeType.charAt(0).toUpperCase() + analysis.changeType.slice(1).replace('_', ' ')} change detected`,
              description: analysis.description,
              threat_level: analysis.threatLevel,
              source_url: page.url,
              recommended_actions: getRecommendedActions(analysis.changeType, analysis.threatLevel),
            });

            result.changes_detected++;
            result.changes.push({
              page_type: page.type as 'pricing' | 'homepage' | 'tours' | 'packages' | 'about' | 'promotions' | 'other',
              change_type: analysis.changeType,
              description: analysis.description,
            });
            totalChanges++;
          }
        }
      }

      // Update last checked timestamp
      await competitorMonitoringService.updateLastChecked(competitor.id);

    } catch (error) {
      errors.push({
        competitorId: competitor.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      logger.error('Competitor monitoring error', {
        competitorId: competitor.id,
        competitorName: competitor.name,
        error,
      });
    }

    results.push(result);

    // Small delay between competitors to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    checked: results.length,
    changesDetected: totalChanges,
    results,
    errors,
  };
}

// Get recommended actions based on change type and threat level
function getRecommendedActions(changeType: ChangeType, threatLevel: ThreatLevel): string[] {
  const actions: string[] = [];

  if (changeType === 'pricing') {
    if (threatLevel === 'high') {
      actions.push('Review your pricing strategy immediately');
      actions.push('Consider matching or highlighting value differences');
      actions.push('Prepare talking points for sales team');
    } else {
      actions.push('Monitor for further price changes');
      actions.push('Document in competitive pricing spreadsheet');
    }
  } else if (changeType === 'promotion') {
    actions.push('Evaluate if response promotion is needed');
    actions.push('Update sales team on competitor offer');
    actions.push('Consider counter-promotion if high threat');
  } else if (changeType === 'new_offering') {
    actions.push('Research the new offering details');
    actions.push('Assess if similar offering makes sense for us');
    actions.push('Update competitive comparison materials');
  } else if (changeType === 'content') {
    actions.push('Review content changes for SEO implications');
    actions.push('Update your own content if needed');
  }

  return actions;
}

// POST handler for manual triggers and Vercel Cron
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    logger.info('Starting competitor monitoring job');

    const result = await monitorCompetitors();

    const duration = Date.now() - startTime;
    logger.info('Competitor monitoring job completed', {
      duration: `${duration}ms`,
      checked: result.checked,
      changesDetected: result.changesDetected,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      competitors_checked: result.checked,
      total_changes_detected: result.changesDetected,
      results: result.results,
      errors: result.errors,
    });
  } catch (error) {
    logger.error('Competitor monitoring job failed', { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Monitoring job failed',
      },
      { status: 500 }
    );
  }
}

// GET handler for health check
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await competitorMonitoringService.getStatistics();

    return NextResponse.json({
      status: 'healthy',
      last_check: stats.lastCheckAt,
      active_competitors: stats.activeCompetitors,
      unreviewed_changes: stats.unreviewedChanges,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
