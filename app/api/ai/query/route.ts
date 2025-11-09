import { NextRequest, NextResponse } from 'next/server'
import { getActiveModelConfig, createProviderFromSettings } from '@/lib/ai/model-manager'
import { getCachedQuery, cacheQueryResponse, generateSystemPromptHash, generateQueryHash } from '@/lib/ai/query-cache'
import { buildSystemPromptWithContext } from '@/lib/ai/context-builder'
import { getOrCreateSessionId, setSessionId } from '@/lib/utils/session'
import { logQuery, classifyQueryIntent } from '@/lib/analytics/query-logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/query
 * 
 * Main AI Directory query endpoint
 * - Checks cache first
 * - If not cached, queries AI model
 * - Caches response for future requests
 * - Tracks session for conversion attribution
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Validate query length
    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Query too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    // Get or create session ID
    let sessionId = await getOrCreateSessionId()
    if (!sessionId) {
      sessionId = `anon_${Date.now()}`
      await setSessionId(sessionId)
    }

    // Get active model configuration
    const settings = await getActiveModelConfig()
    
    // Build system prompt with business context
    const basePrompt = settings.system_prompt || getDefaultPrompt()
    const systemPrompt = await buildSystemPromptWithContext(basePrompt)
    const systemPromptHash = generateSystemPromptHash(systemPrompt)

    // Check cache
    const cached = await getCachedQuery(query, settings.model, systemPromptHash)
    
    if (cached) {
      const duration = Date.now() - startTime
      
      console.log(`[AI Query] CACHE HIT - ${query.substring(0, 50)}... (${duration}ms)`)
      
      return NextResponse.json({
        success: true,
        response: cached.response_text,
        responseData: cached.response_data,
        cached: true,
        model: settings.model,
        provider: settings.provider,
        duration,
        sessionId
      })
    }

    // Not cached - query AI model
    console.log(`[AI Query] CACHE MISS - querying ${settings.provider}:${settings.model}`)
    
    const provider = createProviderFromSettings(settings)
    
    const aiResponse = await provider.generateResponse(query, {
      systemPrompt,
      temperature: settings.temperature,
      maxTokens: settings.max_tokens
    })

    // Cache the response
    await cacheQueryResponse(
      query,
      settings.model,
      aiResponse.text,
      null, // responseData - could be structured data in future
      systemPromptHash,
      24 // Cache for 24 hours
    )

    const duration = Date.now() - startTime

    // Log query for analytics and review
    const queryIntent = classifyQueryIntent(query)
    const queryHash = generateQueryHash(query, settings.model, systemPromptHash)
    
    const queryId = await logQuery({
      sessionId,
      queryText: query,
      queryIntent,
      queryHash,
      provider: aiResponse.provider,
      model: aiResponse.model,
      systemPromptHash,
      responseText: aiResponse.text,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      totalTokens: aiResponse.inputTokens + aiResponse.outputTokens,
      responseTimeMs: duration,
      apiCost: aiResponse.cost
    })

    console.log(
      `[AI Query] ${aiResponse.provider}:${aiResponse.model} - ` +
      `${query.substring(0, 50)}... - ` +
      `$${aiResponse.cost.toFixed(4)} - ${duration}ms - ` +
      `ID: ${queryId}`
    )

    return NextResponse.json({
      success: true,
      response: aiResponse.text,
      responseData: null,
      cached: false,
      model: aiResponse.model,
      provider: aiResponse.provider,
      cost: aiResponse.cost,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      duration,
      sessionId,
      queryId // Return queryId so client can submit feedback
    })

  } catch (error: any) {
    console.error('AI query error:', error)
    
    const duration = Date.now() - startTime
    
    return NextResponse.json(
      { 
        error: 'AI query failed',
        details: error.message,
        duration
      },
      { status: 500 }
    )
  }
}

function getDefaultPrompt(): string {
  return `You are an AI assistant for Walla Walla Travel, a premier wine country tour company in Walla Walla, Washington. 

Your role is to help visitors discover wineries, tours, and experiences that match their preferences.

Be friendly, knowledgeable, and helpful. Provide specific recommendations with details. If you don't know something, be honest and suggest contacting the office.`
}

