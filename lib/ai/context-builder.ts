// Context Builder
// Builds rich context for AI from database

import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export interface WineryInfo {
  id: number
  name: string
  description: string | null
  features: string[]
  location: string | null
}

export interface TourInfo {
  id: number
  name: string
  description: string | null
  duration_hours: number
  price: number
  max_guests: number
}

export interface BusinessContext {
  wineries: WineryInfo[]
  tours: TourInfo[]
  policies: {
    pickupAvailable: boolean
    minAge: number
    cancellationPolicy: string
  }
}

/**
 * Get winery information for AI context
 */
export async function getWineryContext(): Promise<WineryInfo[]> {
  try {
    const result = await pool.query(`
      SELECT id, name, description, location
      FROM wineries
      WHERE active = true
      ORDER BY name
      LIMIT 20
    `)

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      features: [],
      location: row.location
    }))
  } catch (error) {
    console.warn('[Context Builder] Wineries table not available:', error)
    return []
  }
}

/**
 * Get tour information for AI context
 */
export async function getTourContext(): Promise<TourInfo[]> {
  try {
    const result = await pool.query(`
      SELECT id, name, description, duration_hours, base_price, max_passengers
      FROM tours
      WHERE active = true
      ORDER BY name
      LIMIT 10
    `)

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      duration_hours: row.duration_hours || 4,
      price: parseFloat(row.base_price) || 0,
      max_guests: row.max_passengers || 14
    }))
  } catch (error) {
    console.warn('[Context Builder] Tours table not available:', error)
    return []
  }
}

/**
 * Build complete business context
 */
export async function buildBusinessContext(): Promise<BusinessContext> {
  const [wineries, tours] = await Promise.all([
    getWineryContext(),
    getTourContext()
  ])

  return {
    wineries,
    tours,
    policies: {
      pickupAvailable: true,
      minAge: 21,
      cancellationPolicy: '24 hours notice required for full refund'
    }
  }
}

/**
 * Format context for AI system prompt
 */
export function formatContextForPrompt(context: BusinessContext): string {
  let prompt = ''

  // Wineries
  if (context.wineries.length > 0) {
    prompt += '\n\n## Available Wineries:\n'
    context.wineries.forEach(w => {
      prompt += `\n**${w.name}**`
      if (w.description) {
        prompt += `\n${w.description}`
      }
      if (w.location) {
        prompt += `\nLocation: ${w.location}`
      }
      prompt += '\n'
    })
  }

  // Tours
  if (context.tours.length > 0) {
    prompt += '\n\n## Available Tours:\n'
    context.tours.forEach(t => {
      prompt += `\n**${t.name}** - $${t.price} per person`
      if (t.description) {
        prompt += `\n${t.description}`
      }
      prompt += `\nDuration: ${t.duration_hours} hours`
      prompt += `\nMax guests: ${t.max_guests} people\n`
    })
  }

  // Policies
  prompt += '\n\n## Policies:\n'
  prompt += `- Minimum age: ${context.policies.minAge}+\n`
  prompt += `- Hotel pickup: ${context.policies.pickupAvailable ? 'Yes, complimentary within Walla Walla' : 'No'}\n`
  prompt += `- Cancellation: ${context.policies.cancellationPolicy}\n`

  return prompt
}

/**
 * Build full system prompt with context
 */
export async function buildSystemPromptWithContext(basePrompt: string): Promise<string> {
  const context = await buildBusinessContext()
  const contextStr = formatContextForPrompt(context)
  
  return `${basePrompt}${contextStr}`
}

