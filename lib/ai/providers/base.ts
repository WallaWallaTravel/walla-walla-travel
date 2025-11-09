// Base AI Provider Interface

export interface AIContext {
  systemPrompt: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stopSequences?: string[]
}

export interface AIResponse {
  text: string
  inputTokens: number
  outputTokens: number
  cost: number
  duration: number
  model: string
  provider: string
}

export interface AIProviderConfig {
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
}

/**
 * Base class for all AI providers
 * Provides common interface for OpenAI, Anthropic, Google, etc.
 */
export abstract class AIModelProvider {
  abstract readonly name: string
  abstract readonly provider: 'openai' | 'anthropic' | 'google'
  abstract readonly supportsFineTuning: boolean
  abstract readonly supportsMultimodal: boolean
  
  protected config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  /**
   * Generate a text response from the AI model
   */
  abstract generateResponse(
    query: string,
    context: AIContext
  ): Promise<AIResponse>

  /**
   * Calculate cost based on token usage
   */
  abstract calculateCost(inputTokens: number, outputTokens: number): number

  /**
   * Validate that the provider is properly configured
   */
  validate(): void {
    if (!this.config.apiKey) {
      throw new Error(`${this.name}: API key is required`)
    }
    if (!this.config.model) {
      throw new Error(`${this.name}: Model name is required`)
    }
  }

  /**
   * Get provider name for logging
   */
  getProviderName(): string {
    return `${this.provider}:${this.config.model}`
  }
}

