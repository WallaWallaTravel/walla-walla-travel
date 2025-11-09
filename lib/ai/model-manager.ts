// AI Model Manager
// Manages active model configuration and provider instantiation

import { Pool } from 'pg'
import { createAIProvider, getProviderAPIKey, ProviderType } from './providers/factory'
import { AIModelProvider } from './providers/base'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export interface AISettingsRow {
  id: number
  provider: ProviderType
  model: string
  display_name: string | null
  temperature: number
  max_tokens: number
  system_prompt: string | null
  is_active: boolean
  is_fallback: boolean
  ab_test_enabled: boolean
  ab_test_percentage: number | null
  ab_test_group: 'A' | 'B' | null
}

/**
 * Get the active AI model configuration from database
 */
export async function getActiveModelConfig(): Promise<AISettingsRow> {
  const result = await pool.query<AISettingsRow>(
    'SELECT * FROM ai_settings WHERE is_active = true ORDER BY id DESC LIMIT 1'
  )

  if (result.rows.length === 0) {
    throw new Error('No active AI model configured')
  }

  return result.rows[0]
}

/**
 * Get the fallback AI model configuration
 */
export async function getFallbackModelConfig(): Promise<AISettingsRow | null> {
  const result = await pool.query<AISettingsRow>(
    'SELECT * FROM ai_settings WHERE is_fallback = true ORDER BY id DESC LIMIT 1'
  )

  return result.rows[0] || null
}

/**
 * Get models for A/B testing
 */
export async function getABTestModels(): Promise<{
  modelA: AISettingsRow | null
  modelB: AISettingsRow | null
}> {
  const result = await pool.query<AISettingsRow>(
    `SELECT * FROM ai_settings 
     WHERE ab_test_enabled = true 
     AND ab_test_group IN ('A', 'B')
     ORDER BY ab_test_group`
  )

  return {
    modelA: result.rows.find(r => r.ab_test_group === 'A') || null,
    modelB: result.rows.find(r => r.ab_test_group === 'B') || null
  }
}

/**
 * Select a model for A/B testing based on session
 */
export function selectModelForABTest(
  sessionId: string,
  modelA: AISettingsRow,
  modelB: AISettingsRow
): AISettingsRow {
  // Simple hash-based selection for consistent model per session
  const hash = sessionId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)

  return hash % 2 === 0 ? modelA : modelB
}

/**
 * Create an AI provider instance from settings
 */
export function createProviderFromSettings(settings: AISettingsRow): AIModelProvider {
  const apiKey = getProviderAPIKey(settings.provider)
  
  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${settings.provider}`)
  }

  return createAIProvider(settings.provider, {
    apiKey,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.max_tokens
  })
}

/**
 * Get the default system prompt
 */
export function getDefaultSystemPrompt(): string {
  return `You are an AI assistant for Walla Walla Travel, a premier wine country tour company in Walla Walla, Washington. 

Your role is to help visitors discover wineries, tours, and experiences that match their preferences. You have access to information about local wineries, tour options, pricing, and logistics.

Be friendly, knowledgeable, and helpful. Provide specific recommendations with details. If you don't know something, be honest and suggest contacting the office.

When discussing wineries or tours, highlight unique features, specialties, and why they're a good fit for the visitor's needs.`
}

