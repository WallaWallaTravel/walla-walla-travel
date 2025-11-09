// AI Provider Factory
// Creates the appropriate provider based on configuration

import { AIModelProvider, AIProviderConfig } from './base'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GoogleProvider } from './google'

export type ProviderType = 'openai' | 'anthropic' | 'google'

/**
 * Create an AI provider instance
 */
export function createAIProvider(
  provider: ProviderType,
  config: AIProviderConfig
): AIModelProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(config)
    
    case 'anthropic':
      return new AnthropicProvider(config)
    
    case 'google':
      return new GoogleProvider(config)
    
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Get API key for a provider from environment variables
 */
export function getProviderAPIKey(provider: ProviderType): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || ''
    
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || ''
    
    case 'google':
      return process.env.GOOGLE_AI_API_KEY || ''
    
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Check if a provider is configured (has API key)
 */
export function isProviderConfigured(provider: ProviderType): boolean {
  const apiKey = getProviderAPIKey(provider)
  return apiKey.length > 0
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): ProviderType[] {
  const providers: ProviderType[] = []
  
  if (isProviderConfigured('openai')) providers.push('openai')
  if (isProviderConfigured('anthropic')) providers.push('anthropic')
  if (isProviderConfigured('google')) providers.push('google')
  
  return providers
}

