// AI Configuration and Model Registry

export interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'google'
  model: string
  displayName: string
  costPerInputToken: number
  costPerOutputToken: number
  supportsFineTuning: boolean
  supportsMultimodal: boolean
  description: string
  maxTokens: number
}

export const AI_MODELS: Record<string, AIModelConfig> = {
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o (Recommended)',
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.00001,
    supportsFineTuning: true,
    supportsMultimodal: true,
    description: 'Best quality, supports images and fine-tuning',
    maxTokens: 4096
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
    supportsFineTuning: true,
    supportsMultimodal: true,
    description: 'Budget-friendly, still excellent quality',
    maxTokens: 4096
  },
  'claude-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    supportsFineTuning: false,
    supportsMultimodal: true,
    description: 'Excellent reasoning, no fine-tuning support',
    maxTokens: 8192
  },
  'claude-haiku': {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    costPerInputToken: 0.000001,
    costPerOutputToken: 0.000005,
    supportsFineTuning: false,
    supportsMultimodal: true,
    description: 'Fast and affordable',
    maxTokens: 8192
  },
  'gemini-pro': {
    provider: 'google',
    model: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    costPerInputToken: 0.00000125,
    costPerOutputToken: 0.000005,
    supportsFineTuning: true,
    supportsMultimodal: true,
    description: 'Google\'s flagship model',
    maxTokens: 8192
  },
  'gemini-flash': {
    provider: 'google',
    model: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    costPerInputToken: 0.000000075,
    costPerOutputToken: 0.0000003,
    supportsFineTuning: true,
    supportsMultimodal: true,
    description: 'Very fast and cheap',
    maxTokens: 8192
  }
}

export const DEFAULT_MODEL = 'gpt-4o'
export const DEFAULT_TEMPERATURE = 0.7
export const DEFAULT_MAX_TOKENS = 600

export function getModelConfig(modelKey: string): AIModelConfig {
  const config = AI_MODELS[modelKey]
  if (!config) {
    throw new Error(`Unknown model: ${modelKey}`)
  }
  return config
}

export function calculateCost(modelKey: string, inputTokens: number, outputTokens: number): number {
  const config = getModelConfig(modelKey)
  return (inputTokens * config.costPerInputToken) + (outputTokens * config.costPerOutputToken)
}

