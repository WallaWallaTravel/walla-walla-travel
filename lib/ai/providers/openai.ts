// OpenAI Provider (GPT-4o, GPT-4o mini, etc.)

import OpenAI from 'openai'
import { AIModelProvider, AIContext, AIResponse, AIProviderConfig } from './base'
import { getModelConfig } from '@/lib/config/ai'

export class OpenAIProvider extends AIModelProvider {
  readonly name = 'OpenAI'
  readonly provider = 'openai' as const
  readonly supportsFineTuning = true
  readonly supportsMultimodal = true

  private client: OpenAI

  constructor(config: AIProviderConfig) {
    super(config)
    this.validate()
    
    this.client = new OpenAI({
      apiKey: this.config.apiKey
    })
  }

  async generateResponse(
    query: string,
    context: AIContext
  ): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: context.systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: context.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: context.maxTokens ?? this.config.maxTokens ?? 600,
        top_p: context.topP ?? 1,
        stop: context.stopSequences
      })

      const duration = Date.now() - startTime
      const choice = response.choices[0]
      const usage = response.usage

      if (!choice || !choice.message || !usage) {
        throw new Error('Invalid response from OpenAI')
      }

      const cost = this.calculateCost(usage.prompt_tokens, usage.completion_tokens)

      return {
        text: choice.message.content || '',
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cost,
        duration,
        model: this.config.model,
        provider: 'openai'
      }
    } catch (error: any) {
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI error: ${error.message}`)
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
    if (model.includes('gpt-4o-mini')) return 'gpt-4o-mini'
    if (model.includes('gpt-4o')) return 'gpt-4o'
    if (model.startsWith('ft:')) {
      // Fine-tuned model, use base model pricing
      if (model.includes('gpt-4o-mini')) return 'gpt-4o-mini'
      return 'gpt-4o'
    }
    return 'gpt-4o' // default
  }
}

