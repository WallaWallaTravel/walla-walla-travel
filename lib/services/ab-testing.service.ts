/**
 * A/B Testing Statistical Analysis Service
 * 
 * Provides statistical calculations for A/B test analysis including:
 * - Statistical significance testing (z-test for proportions)
 * - Sample size calculations
 * - Confidence intervals
 * - Lift calculations
 */

interface VariantMetrics {
  impressions: number
  conversions: number
  clicks: number
  engagement: number
}

interface TestResult {
  isSignificant: boolean
  confidenceLevel: number
  pValue: number
  winner: 'a' | 'b' | 'inconclusive'
  lift: number
  liftConfidenceInterval: [number, number]
  sampleSizeNeeded: number
  daysRemaining: number | null
}

/**
 * Normal distribution CDF approximation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

/**
 * Inverse normal CDF (approximation)
 */
function inverseNormalCDF(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  if (p === 0.5) return 0

  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.383577518672690e2,
    -3.066479806614716e1,
    2.506628277459239e0
  ]
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1
  ]
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838e0,
    -2.549732539343734e0,
    4.374664141464968e0,
    2.938163982698783e0
  ]
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996e0,
    3.754408661907416e0
  ]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q: number, r: number

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
}

/**
 * Calculate statistical significance using z-test for proportions
 */
export function calculateSignificance(
  variantA: VariantMetrics,
  variantB: VariantMetrics,
  metric: 'conversions' | 'clicks' | 'engagement' = 'conversions'
): TestResult {
  // Get metric values
  const successA = variantA[metric]
  const successB = variantB[metric]
  const nA = variantA.impressions
  const nB = variantB.impressions

  // Handle edge cases
  if (nA === 0 || nB === 0) {
    return {
      isSignificant: false,
      confidenceLevel: 0,
      pValue: 1,
      winner: 'inconclusive',
      lift: 0,
      liftConfidenceInterval: [0, 0],
      sampleSizeNeeded: 10000,
      daysRemaining: null
    }
  }

  // Calculate conversion rates
  const rateA = successA / nA
  const rateB = successB / nB

  // Calculate pooled probability
  const pooled = (successA + successB) / (nA + nB)

  // Calculate standard error
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB))

  // Handle zero standard error
  if (se === 0) {
    return {
      isSignificant: false,
      confidenceLevel: 50,
      pValue: 1,
      winner: 'inconclusive',
      lift: 0,
      liftConfidenceInterval: [0, 0],
      sampleSizeNeeded: 10000,
      daysRemaining: null
    }
  }

  // Calculate z-score
  const zScore = (rateB - rateA) / se

  // Calculate p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  // Calculate confidence level
  const confidenceLevel = (1 - pValue) * 100

  // Determine significance and winner
  const isSignificant = pValue < 0.05
  let winner: 'a' | 'b' | 'inconclusive' = 'inconclusive'
  if (isSignificant) {
    winner = rateB > rateA ? 'b' : 'a'
  }

  // Calculate lift (relative improvement)
  const lift = rateA > 0 ? ((rateB - rateA) / rateA) * 100 : 0

  // Calculate confidence interval for lift
  const z95 = 1.96
  const seLift = Math.sqrt(
    (1 - rateA) / (nA * rateA) + (1 - rateB) / (nB * rateB)
  )
  const liftLower = (lift / 100 - z95 * seLift) * 100
  const liftUpper = (lift / 100 + z95 * seLift) * 100

  // Calculate sample size needed for significance
  const sampleSizeNeeded = calculateMinimumSampleSize(
    Math.max(rateA, 0.01),
    0.1, // 10% minimum detectable effect
    0.05, // alpha
    0.8 // power
  )

  return {
    isSignificant,
    confidenceLevel: Math.min(99.9, Math.max(0, confidenceLevel)),
    pValue: Math.max(0.001, pValue),
    winner,
    lift: Math.round(lift * 10) / 10,
    liftConfidenceInterval: [
      Math.round(liftLower * 10) / 10,
      Math.round(liftUpper * 10) / 10
    ],
    sampleSizeNeeded,
    daysRemaining: null
  }
}

/**
 * Calculate minimum sample size needed for desired statistical power
 */
export function calculateMinimumSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  alpha: number = 0.05,
  power: number = 0.80
): number {
  // Ensure valid inputs
  if (baselineRate <= 0 || baselineRate >= 1) {
    return 10000 // Default fallback
  }

  const p1 = baselineRate
  const p2 = baselineRate * (1 + minimumDetectableEffect)

  // Clamp p2 to valid range
  const p2Clamped = Math.min(0.99, Math.max(0.01, p2))

  const pBar = (p1 + p2Clamped) / 2

  // Z-scores for alpha and power
  const zAlpha = inverseNormalCDF(1 - alpha / 2)
  const zBeta = inverseNormalCDF(power)

  // Sample size formula for two proportions
  const n = Math.pow(zAlpha + zBeta, 2) *
    (p1 * (1 - p1) + p2Clamped * (1 - p2Clamped)) /
    Math.pow(p2Clamped - p1, 2)

  return Math.ceil(Math.max(100, n))
}

/**
 * Calculate estimated days remaining for test completion
 */
export function calculateDaysRemaining(
  currentImpressions: number,
  targetImpressions: number,
  daysElapsed: number
): number | null {
  if (daysElapsed <= 0 || currentImpressions <= 0) {
    return null
  }

  const dailyRate = currentImpressions / daysElapsed
  const impressionsNeeded = targetImpressions - currentImpressions

  if (impressionsNeeded <= 0) {
    return 0
  }

  return Math.ceil(impressionsNeeded / dailyRate)
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(metrics: VariantMetrics): number {
  if (metrics.impressions === 0) return 0
  return (metrics.engagement / metrics.impressions) * 100
}

/**
 * Calculate click-through rate
 */
export function calculateCTR(metrics: VariantMetrics): number {
  if (metrics.impressions === 0) return 0
  return (metrics.clicks / metrics.impressions) * 100
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(metrics: VariantMetrics): number {
  if (metrics.clicks === 0) return 0
  return (metrics.conversions / metrics.clicks) * 100
}

/**
 * Generate AI-like insights based on test results
 */
export function generateInsights(
  testName: string,
  variantA: VariantMetrics & { name: string },
  variantB: VariantMetrics & { name: string },
  result: TestResult
): string[] {
  const insights: string[] = []

  if (result.isSignificant) {
    const winner = result.winner === 'a' ? variantA : variantB
    const loser = result.winner === 'a' ? variantB : variantA
    
    insights.push(
      `✅ ${winner.name} outperformed ${loser.name} with ${result.confidenceLevel.toFixed(1)}% confidence`
    )
    insights.push(
      `📈 ${Math.abs(result.lift)}% ${result.lift > 0 ? 'improvement' : 'decrease'} in conversions`
    )
  } else {
    insights.push(
      `⏳ Test not yet significant (${result.confidenceLevel.toFixed(1)}% confidence, need 95%+)`
    )
    insights.push(
      `📊 Need approximately ${(result.sampleSizeNeeded - variantA.impressions).toLocaleString()} more impressions`
    )
  }

  // Add engagement comparison
  const engA = calculateEngagementRate(variantA)
  const engB = calculateEngagementRate(variantB)
  if (Math.abs(engA - engB) > 1) {
    const betterEng = engA > engB ? variantA.name : variantB.name
    insights.push(
      `👍 ${betterEng} has higher engagement (${Math.max(engA, engB).toFixed(1)}% vs ${Math.min(engA, engB).toFixed(1)}%)`
    )
  }

  return insights
}

export default {
  calculateSignificance,
  calculateMinimumSampleSize,
  calculateDaysRemaining,
  calculateEngagementRate,
  calculateCTR,
  calculateConversionRate,
  generateInsights
}

