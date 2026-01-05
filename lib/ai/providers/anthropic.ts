// Anthropic Provider (Claude Sonnet, Claude Haiku, etc.)

import Anthropic from '@anthropic-ai/sdk'
import { AIModelProvider, AIContext, AIResponse, AIProviderConfig } from './base'
import { getModelConfig } from '@/lib/config/ai'
import { logger } from '@/lib/logger'

export class AnthropicProvider extends AIModelProvider {
  readonly name = 'Anthropic'
  readonly provider = 'anthropic' as const
  readonly supportsFineTuning = false
  readonly supportsMultimodal = true

  private client: Anthropic

  constructor(config: AIProviderConfig) {
    super(config)
    this.validate()
    
    this.client = new Anthropic({
      apiKey: this.config.apiKey
    })
  }

  async generateResponse(
    query: string,
    context: AIContext
  ): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: context.maxTokens ?? this.config.maxTokens ?? 600,
        temperature: context.temperature ?? this.config.temperature ?? 0.7,
        top_p: context.topP ?? 1,
        system: context.systemPrompt,
        messages: [
          {
            role: 'user',
            content: query
          }
        ],
        stop_sequences: context.stopSequences
      })

      const duration = Date.now() - startTime
      const textContent = response.content.find(c => c.type === 'text')

      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response')
      }

      const cost = this.calculateCost(response.usage.input_tokens, response.usage.output_tokens)

      return {
        text: textContent.text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cost,
        duration,
        model: this.config.model,
        provider: 'anthropic'
      }
    } catch (error: unknown) {
      logger.error('Anthropic API error', { error })
      throw new Error(`Anthropic error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    // Get pricing from model config
    const modelKey = this.getModelKey(this.config.model)
    const config = getModelConfig(modelKey)
    
    return (
      (inputTokens * config.costPerInputToken) +
      (outputTokens * config.costPerOutputToken)
    )
  }

  private getModelKey(model: string): string {
    // Map model name to config key
    if (model.includes('sonnet')) return 'claude-sonnet'
    if (model.includes('haiku')) return 'claude-haiku'
    return 'claude-sonnet' // default
  }
}

