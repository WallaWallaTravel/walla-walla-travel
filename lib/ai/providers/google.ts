// Google Provider (Gemini Pro, Gemini Flash, etc.)

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIModelProvider, AIContext, AIResponse, AIProviderConfig } from './base'
import { getModelConfig } from '@/lib/config/ai'

export class GoogleProvider extends AIModelProvider {
  readonly name = 'Google'
  readonly provider = 'google' as const
  readonly supportsFineTuning = true
  readonly supportsMultimodal = true

  private client: GoogleGenerativeAI

  constructor(config: AIProviderConfig) {
    super(config)
    this.validate()
    
    this.client = new GoogleGenerativeAI(this.config.apiKey)
  }

  async generateResponse(
    query: string,
    context: AIContext
  ): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      const model = this.client.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          temperature: context.temperature ?? this.config.temperature ?? 0.7,
          maxOutputTokens: context.maxTokens ?? this.config.maxTokens ?? 600,
          topP: context.topP ?? 1,
          stopSequences: context.stopSequences
        },
        systemInstruction: context.systemPrompt
      })

      const result = await model.generateContent(query)
      const response = result.response
      const duration = Date.now() - startTime

      const text = response.text()
      
      // Estimate token counts (Gemini doesn't always return these)
      const inputTokens = this.estimateTokens(context.systemPrompt + query)
      const outputTokens = this.estimateTokens(text)

      const cost = this.calculateCost(inputTokens, outputTokens)

      return {
        text,
        inputTokens,
        outputTokens,
        cost,
        duration,
        model: this.config.model,
        provider: 'google'
      }
    } catch (error: unknown) {
      console.error('Google API error:', error)
      throw new Error(`Google error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    if (model.includes('flash')) return 'gemini-flash'
    if (model.includes('pro')) return 'gemini-pro'
    return 'gemini-pro' // default
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }
}

