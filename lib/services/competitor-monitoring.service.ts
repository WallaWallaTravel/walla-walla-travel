/**
 * Competitor Monitoring Service
 * 
 * Provides functionality for:
 * - Tracking competitor websites
 * - Detecting changes in pricing, promotions, content
 * - AI-powered analysis and recommendations
 * - Notification handling
 */

import { Pool } from 'pg'
import crypto from 'crypto'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

interface Competitor {
  id: number
  name: string
  website_url: string
  priority_level: 'high' | 'medium' | 'low'
  monitor_pricing: boolean
  monitor_promotions: boolean
  monitor_packages: boolean
  monitor_content: boolean
  check_frequency: string
}

interface CompetitorChange {
  competitor_id: number
  change_type: 'pricing' | 'promotion' | 'package' | 'content' | 'design'
  significance: 'high' | 'medium' | 'low'
  description: string
  previous_value: string | null
  new_value: string | null
  threat_level: 'high' | 'medium' | 'low' | 'none'
  recommended_actions: string[]
}

interface WebsiteSnapshot {
  content_hash: string
  pricing_data: Record<string, unknown>
  promotions_data: Record<string, unknown>
  packages_data: Record<string, unknown>
  page_content: string
}

/**
 * Get competitors due for checking
 */
export async function getCompetitorsDueForCheck(): Promise<Competitor[]> {
  const result = await pool.query(`
    SELECT * FROM competitors 
    WHERE is_active = TRUE 
      AND (next_check_at IS NULL OR next_check_at <= NOW())
    ORDER BY 
      CASE priority_level 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        ELSE 3 
      END,
      next_check_at ASC
    LIMIT 10
  `)
  
  return result.rows
}

/**
 * Create a content hash for change detection
 */
export function createContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Compare two snapshots and detect changes
 */
export function detectChanges(
  competitor: Competitor,
  oldSnapshot: WebsiteSnapshot | null,
  newSnapshot: WebsiteSnapshot
): CompetitorChange[] {
  const changes: CompetitorChange[] = []

  if (!oldSnapshot) {
    // First snapshot, no changes to detect
    return changes
  }

  // Check for content hash change (general content change)
  if (oldSnapshot.content_hash !== newSnapshot.content_hash) {
    // Analyze what changed
    
    // Check pricing changes
    if (competitor.monitor_pricing && 
        JSON.stringify(oldSnapshot.pricing_data) !== JSON.stringify(newSnapshot.pricing_data)) {
      const pricingChange = analyzePricingChange(
        oldSnapshot.pricing_data,
        newSnapshot.pricing_data
      )
      if (pricingChange) {
        changes.push({
          competitor_id: competitor.id,
          change_type: 'pricing',
          ...pricingChange
        })
      }
    }

    // Check promotion changes
    if (competitor.monitor_promotions &&
        JSON.stringify(oldSnapshot.promotions_data) !== JSON.stringify(newSnapshot.promotions_data)) {
      const promoChange = analyzePromotionChange(
        oldSnapshot.promotions_data,
        newSnapshot.promotions_data
      )
      if (promoChange) {
        changes.push({
          competitor_id: competitor.id,
          change_type: 'promotion',
          ...promoChange
        })
      }
    }

    // Check package changes
    if (competitor.monitor_packages &&
        JSON.stringify(oldSnapshot.packages_data) !== JSON.stringify(newSnapshot.packages_data)) {
      const packageChange = analyzePackageChange(
        oldSnapshot.packages_data,
        newSnapshot.packages_data
      )
      if (packageChange) {
        changes.push({
          competitor_id: competitor.id,
          change_type: 'package',
          ...packageChange
        })
      }
    }

    // General content change if nothing specific detected
    if (changes.length === 0 && competitor.monitor_content) {
      changes.push({
        competitor_id: competitor.id,
        change_type: 'content',
        significance: 'low',
        description: 'Website content has been updated',
        previous_value: null,
        new_value: 'Content modified',
        threat_level: 'none',
        recommended_actions: ['Review competitor website for notable changes']
      })
    }
  }

  return changes
}

/**
 * Analyze pricing changes
 */
function analyzePricingChange(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Omit<CompetitorChange, 'competitor_id' | 'change_type'> | null {
  // This would normally parse actual pricing data
  // For now, we generate a mock analysis
  
  const oldPrices = oldData as Record<string, number>
  const newPrices = newData as Record<string, number>
  
  // Find price changes
  for (const [key, newPrice] of Object.entries(newPrices)) {
    const oldPrice = oldPrices[key]
    if (oldPrice && newPrice !== oldPrice) {
      const percentChange = ((newPrice - oldPrice) / oldPrice) * 100
      const isDecrease = percentChange < 0
      
      return {
        significance: Math.abs(percentChange) > 10 ? 'high' : 'medium',
        description: `${key} pricing ${isDecrease ? 'reduced' : 'increased'} by ${Math.abs(percentChange).toFixed(0)}%`,
        previous_value: `$${oldPrice}`,
        new_value: `$${newPrice}`,
        threat_level: isDecrease && Math.abs(percentChange) > 10 ? 'high' : 'medium',
        recommended_actions: isDecrease 
          ? [
              'Review your pricing strategy',
              'Highlight unique value propositions',
              'Consider promotional response'
            ]
          : [
              'Monitor market positioning',
              'Opportunity to capture price-sensitive customers'
            ]
      }
    }
  }
  
  return null
}

/**
 * Analyze promotion changes
 */
function analyzePromotionChange(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Omit<CompetitorChange, 'competitor_id' | 'change_type'> | null {
  const oldPromos = (oldData.active || []) as string[]
  const newPromos = (newData.active || []) as string[]
  
  // Find new promotions
  const addedPromos = newPromos.filter(p => !oldPromos.includes(p))
  
  if (addedPromos.length > 0) {
    return {
      significance: 'medium',
      description: `New promotion launched: ${addedPromos[0]}`,
      previous_value: null,
      new_value: addedPromos[0],
      threat_level: 'medium',
      recommended_actions: [
        'Analyze competitive positioning',
        'Consider matching or differentiated offer',
        'Review seasonal promotion calendar'
      ]
    }
  }
  
  return null
}

/**
 * Analyze package changes
 */
function analyzePackageChange(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Omit<CompetitorChange, 'competitor_id' | 'change_type'> | null {
  const oldPackages = (oldData.packages || []) as string[]
  const newPackages = (newData.packages || []) as string[]
  
  const addedPackages = newPackages.filter(p => !oldPackages.includes(p))
  
  if (addedPackages.length > 0) {
    return {
      significance: 'high',
      description: `New package/service offering: ${addedPackages[0]}`,
      previous_value: null,
      new_value: addedPackages[0],
      threat_level: 'medium',
      recommended_actions: [
        'Evaluate product gap',
        'Consider launching similar offering',
        'Identify differentiation opportunities'
      ]
    }
  }
  
  return null
}

/**
 * Save a new snapshot
 */
export async function saveSnapshot(
  competitorId: number,
  snapshot: WebsiteSnapshot
): Promise<number> {
  const result = await pool.query(`
    INSERT INTO competitor_snapshots (
      competitor_id, page_content, content_hash,
      pricing_data, promotions_data, packages_data,
      snapshot_date
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id
  `, [
    competitorId,
    snapshot.page_content,
    snapshot.content_hash,
    JSON.stringify(snapshot.pricing_data),
    JSON.stringify(snapshot.promotions_data),
    JSON.stringify(snapshot.packages_data)
  ])
  
  return result.rows[0].id
}

/**
 * Get the most recent snapshot for a competitor
 */
export async function getLatestSnapshot(
  competitorId: number
): Promise<WebsiteSnapshot | null> {
  const result = await pool.query(`
    SELECT * FROM competitor_snapshots
    WHERE competitor_id = $1
    ORDER BY snapshot_date DESC
    LIMIT 1
  `, [competitorId])
  
  if (result.rows.length === 0) {
    return null
  }
  
  const row = result.rows[0]
  return {
    content_hash: row.content_hash,
    pricing_data: row.pricing_data || {},
    promotions_data: row.promotions_data || {},
    packages_data: row.packages_data || {},
    page_content: row.page_content || ''
  }
}

/**
 * Save detected changes
 */
export async function saveChanges(
  snapshotId: number,
  changes: CompetitorChange[]
): Promise<void> {
  for (const change of changes) {
    await pool.query(`
      INSERT INTO competitor_changes (
        competitor_id, snapshot_id, change_type, significance,
        description, previous_value, new_value, threat_level,
        recommended_actions, status, detected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', NOW())
    `, [
      change.competitor_id,
      snapshotId,
      change.change_type,
      change.significance,
      change.description,
      change.previous_value,
      change.new_value,
      change.threat_level,
      change.recommended_actions
    ])
  }
}

/**
 * Update competitor's last checked timestamp
 */
export async function updateLastChecked(competitorId: number): Promise<void> {
  await pool.query(`
    UPDATE competitors
    SET last_checked_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `, [competitorId])
}

/**
 * Get unreviewed changes count
 */
export async function getUnreviewedChangesCount(): Promise<number> {
  const result = await pool.query(`
    SELECT COUNT(*) FROM competitor_changes WHERE status = 'new'
  `)
  return parseInt(result.rows[0].count)
}

/**
 * Mark change as reviewed
 */
export async function markChangeReviewed(
  changeId: number,
  reviewedBy: string
): Promise<void> {
  await pool.query(`
    UPDATE competitor_changes
    SET status = 'reviewed', reviewed_by = $2, reviewed_at = NOW()
    WHERE id = $1
  `, [changeId, reviewedBy])
}

/**
 * Dismiss a change
 */
export async function dismissChange(
  changeId: number,
  notes: string
): Promise<void> {
  await pool.query(`
    UPDATE competitor_changes
    SET status = 'dismissed', notes = $2
    WHERE id = $1
  `, [changeId, notes])
}

/**
 * Generate AI recommendations for a change
 */
export function generateRecommendations(change: CompetitorChange): string[] {
  const recommendations: string[] = []
  
  switch (change.change_type) {
    case 'pricing':
      if (change.threat_level === 'high') {
        recommendations.push('URGENT: Review pricing strategy immediately')
        recommendations.push('Consider temporary promotional pricing')
        recommendations.push('Highlight unique value vs lower price')
      } else {
        recommendations.push('Monitor pricing trends')
        recommendations.push('Update competitive analysis')
      }
      break
      
    case 'promotion':
      recommendations.push('Analyze promotion terms and conditions')
      recommendations.push('Evaluate impact on your target market')
      recommendations.push('Consider timing of your next promotion')
      break
      
    case 'package':
      recommendations.push('Evaluate feature gap analysis')
      recommendations.push('Survey customers on interest in similar offering')
      recommendations.push('Identify differentiation opportunities')
      break
      
    case 'content':
      recommendations.push('Review messaging changes')
      recommendations.push('Update your content strategy if needed')
      break
  }
  
  return recommendations
}

const competitorMonitoringService = {
  getCompetitorsDueForCheck,
  createContentHash,
  detectChanges,
  saveSnapshot,
  getLatestSnapshot,
  saveChanges,
  updateLastChecked,
  getUnreviewedChangesCount,
  markChangeReviewed,
  dismissChange,
  generateRecommendations
};

export default competitorMonitoringService;







