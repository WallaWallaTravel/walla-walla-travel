import { NextRequest, NextResponse } from 'next/server'
import { getActiveModelConfig, createProviderFromSettings, getDefaultSystemPrompt } from '@/lib/ai/model-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/test
 * 
 * Test endpoint for AI model providers
 * Returns AI-generated response with metadata
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Get active model configuration
    const settings = await getActiveModelConfig()
    
    // Create provider instance
    const provider = createProviderFromSettings(settings)

    // Generate response
    const systemPrompt = settings.system_prompt || getDefaultSystemPrompt()
    
    const response = await provider.generateResponse(query, {
      systemPrompt,
      temperature: settings.temperature,
      maxTokens: settings.max_tokens
    })

    console.log(`[AI Test] ${response.provider}:${response.model} - ${query.substring(0, 50)}... - $${response.cost.toFixed(4)}`)

    return NextResponse.json({
      success: true,
      response: response.text,
      model: response.model,
      provider: response.provider,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      cost: response.cost,
      duration: response.duration
    })

  } catch (error: any) {
    console.error('AI test error:', error)
    
    return NextResponse.json(
      { 
        error: 'AI test failed',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

