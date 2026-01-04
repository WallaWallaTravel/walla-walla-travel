import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getActiveModelConfig, createProviderFromSettings } from '@/lib/ai/model-manager'
import { getCachedQuery, cacheQueryResponse, generateSystemPromptHash, generateQueryHash } from '@/lib/ai/query-cache'
import { buildSystemPromptWithContext } from '@/lib/ai/context-builder'
import { getOrCreateVisitor, setVisitorCookie } from '@/lib/visitor/visitor-tracking'
import { logQuery, classifyQueryIntent } from '@/lib/analytics/query-logger'
import { query as dbQuery } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/query
 * 
 * Main Travel Guide query endpoint
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

    // Get or create visitor
    const visitor = await getOrCreateVisitor(request)
    const sessionId = visitor.visitor_uuid

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
      
      logger.info('AI Query cache hit', { query: query.substring(0, 50), duration, visitorId: visitor.visitor_uuid })
      
      // Update visitor query count for cached responses too
      await dbQuery(
        'UPDATE visitors SET total_queries = total_queries + 1, updated_at = NOW() WHERE id = $1',
        [visitor.id]
      )
      
      const response = NextResponse.json({
        success: true,
        response: cached.response_text,
        responseData: cached.response_data,
        cached: true,
        model: settings.model,
        provider: settings.provider,
        duration,
        sessionId,
        visitor: {
          visitor_uuid: visitor.visitor_uuid,
          total_queries: visitor.total_queries + 1,
          email: visitor.email,
        }
      })
      
      // Set visitor cookie
      setVisitorCookie(response, visitor)
      return response
    }

    // Not cached - query AI model
    logger.info('AI Query cache miss', { provider: settings.provider, model: settings.model })
    
    const provider = createProviderFromSettings(settings)
    
    const aiResponse = await provider.generateResponse(query, {
      systemPrompt,
      temperature: parseFloat(String(settings.temperature)),
      maxTokens: parseInt(String(settings.max_tokens))
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

    // Update visitor query count and link query to visitor
    await dbQuery(
      'UPDATE visitors SET total_queries = total_queries + 1, updated_at = NOW() WHERE id = $1',
      [visitor.id]
    )
    await dbQuery(
      'UPDATE ai_queries SET visitor_id = $1 WHERE id = $2',
      [visitor.id, queryId]
    )

    logger.info('AI Query completed', {
      provider: aiResponse.provider,
      model: aiResponse.model,
      query: query.substring(0, 50),
      cost: aiResponse.cost.toFixed(4),
      duration,
      queryId,
      visitorId: visitor.visitor_uuid
    })

    const response = NextResponse.json({
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
      queryId, // Return queryId so client can submit feedback
      visitor: {
        visitor_uuid: visitor.visitor_uuid,
        total_queries: visitor.total_queries + 1,
        email: visitor.email,
      }
    })

    // Set visitor cookie
    setVisitorCookie(response, visitor)
    return response

  } catch (error) {
    logger.error('AI query error', { error })

    const duration = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'AI query failed',
        details: message,
        duration
      },
      { status: 500 }
    )
  }
}

function getDefaultPrompt(): string {
  return `You are the Walla Walla Valley Travel Guide, an intelligent assistant for Walla Walla Travel, a premier wine country tour company in the Walla Walla Valley. 

Your role is to help visitors discover wineries, tours, and experiences that match their preferences across the entire Walla Walla Valley (Washington and Oregon).

Be friendly, knowledgeable, and helpful. Provide specific recommendations with details. If you don't know something, be honest and suggest contacting the office.`
}

