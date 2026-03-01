import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query } from '@/lib/db'
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { socialIntelligenceService } from '@/lib/services/social-intelligence.service'

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey });
}

interface GenerateRequest {
  wineryId?: number
  platform: 'instagram' | 'facebook' | 'linkedin'
  contentType: string
  tone: string
  customPrompt?: string
}

const PLATFORM_GUIDELINES: Record<string, { maxLength: number; style: string; bestTimes: string }> = {
  instagram: {
    maxLength: 2200,
    style: 'Visual-first, emoji-friendly, story-driven. Use line breaks for readability. Include a call-to-action.',
    bestTimes: 'Wednesday 11am, Friday 10-11am, or Tuesday 9am PST',
  },
  facebook: {
    maxLength: 500,
    style: 'Conversational, community-focused. Ask questions to drive engagement. Can be slightly longer than Instagram.',
    bestTimes: 'Wednesday 11am-1pm, Thursday/Friday 1-4pm PST',
  },
  linkedin: {
    maxLength: 700,
    style: 'Professional, informative, industry-focused. Highlight business aspects, awards, winemaking expertise.',
    bestTimes: 'Tuesday-Thursday 8-10am or 12pm PST',
  },
}

const CONTENT_TYPE_PROMPTS: Record<string, string> = {
  general: 'Create general content about visiting Walla Walla wine country. Highlight the region, the experience, or why people should visit.',
  wine_spotlight: 'Feature a specific wine from their collection. Highlight tasting notes, food pairings, and what makes it special.',
  event_promo: 'Promote visiting the tasting room. Emphasize the experience, ambiance, and what visitors can expect.',
  seasonal: 'Create seasonal content tied to the current time of year (winter/New Year). Connect wine to seasonal moments.',
  educational: 'Share wine education content - could be about varietals, winemaking process, or wine terminology.',
  behind_scenes: 'Give a peek behind the scenes at winery life - vineyard work, barrel room, the people.',
  customer_story: 'Craft a post that could accompany a customer testimonial or visitor experience.',
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: 'Polished, authoritative, refined language',
  casual: 'Friendly, approachable, conversational',
  sophisticated: 'Elegant, cultured, wine-connoisseur level',
  playful: 'Fun, light-hearted, uses humor appropriately',
  educational: 'Informative, teaching-focused, accessible',
}

export const POST = withRateLimit(rateLimiters.aiGeneration)(withAdminAuth(async (request: NextRequest, _session) => {
    const body: GenerateRequest = await request.json()
    const { wineryId, platform, contentType, tone, customPrompt } = body

    let winery = null
    let wineryContent: Array<{content_type: string, content: string}> = []
    let wineryContext = ''

    // For general content, winery is optional
    if (wineryId) {
      // Fetch winery data
      const wineryResult = await query(
        `SELECT id, name, description, short_description, specialties,
                winemaker, owner, founded_year, production_volume, price_range
         FROM wineries WHERE id = $1`,
        [wineryId]
      )

      winery = wineryResult.rows[0]

      if (!winery) {
        return NextResponse.json({ error: 'Winery not found' }, { status: 404 })
      }

      // Fetch winery content for context
      const contentResult = await query<{content_type: string, content: string}>(
        `SELECT content_type, content
         FROM winery_content
         WHERE winery_id = $1
         LIMIT 5`,
        [wineryId]
      )
      wineryContent = contentResult.rows

      // Build context from winery data
      wineryContext = `
Winery: ${winery.name}
${winery.description ? `About: ${winery.description}` : ''}
${winery.short_description ? `Summary: ${winery.short_description}` : ''}
${winery.specialties?.length ? `Specialties: ${winery.specialties.join(', ')}` : ''}
${winery.winemaker ? `Winemaker: ${winery.winemaker}` : ''}
${winery.founded_year ? `Founded: ${winery.founded_year}` : ''}
${winery.production_volume ? `Production: ${winery.production_volume}` : ''}
${winery.price_range ? `Price Range: ${winery.price_range}` : ''}

Additional Context:
${wineryContent.map(c => `- ${c.content_type}: ${c.content.substring(0, 200)}`).join('\n')}
`.trim()
    } else if (contentType !== 'general') {
      // Winery required for non-general content
      return NextResponse.json({ error: 'Winery is required for this content type' }, { status: 400 })
    }

    const platformGuideline = PLATFORM_GUIDELINES[platform]
    const contentTypePrompt = CONTENT_TYPE_PROMPTS[contentType] || ''
    const toneDescription = TONE_DESCRIPTIONS[tone] || ''

    const isGeneralContent = contentType === 'general' && !winery

    // Gather intelligence context in parallel
    const [topPosts, preferences, benchmarks, seasonalContext] = await Promise.all([
      socialIntelligenceService.getTopPerformingContent(),
      socialIntelligenceService.getLearnedPreferences(),
      socialIntelligenceService.getPerformanceBenchmarks(),
      Promise.resolve(socialIntelligenceService.getSeasonalContext()),
    ])

    // Build performance intelligence section for the prompt
    let intelligenceSection = ''

    if (topPosts.length > 0) {
      intelligenceSection += `\nTOP PERFORMING POSTS (learn from these - they got the most engagement recently):
${topPosts.slice(0, 5).map(p => `- [${p.platform}/${p.content_type || 'general'}] engagement: ${p.engagement}, impressions: ${p.impressions} — "${p.content.substring(0, 120)}..."`).join('\n')}\n`
    }

    if (benchmarks.byContentType.length > 0) {
      intelligenceSection += `\nPERFORMANCE BENCHMARKS BY CONTENT TYPE (what types work best):
${benchmarks.byContentType.map(b => `- ${b.dimension_value}: avg engagement ${b.avg_engagement}, avg impressions ${b.avg_impressions} (${b.post_count} posts)`).join('\n')}\n`
    }

    if (benchmarks.byPlatform.length > 0) {
      intelligenceSection += `\nPERFORMANCE BENCHMARKS BY PLATFORM:
${benchmarks.byPlatform.map(b => `- ${b.dimension_value}: avg engagement ${b.avg_engagement}, avg impressions ${b.avg_impressions} (${b.post_count} posts)`).join('\n')}\n`
    }

    if (benchmarks.byLengthBucket.length > 0) {
      intelligenceSection += `\nOPTIMAL CONTENT LENGTH (by engagement):
${benchmarks.byLengthBucket.map(b => `- ${b.dimension_value}: avg engagement ${b.avg_engagement} (${b.post_count} posts)`).join('\n')}\n`
    }

    if (preferences.length > 0) {
      intelligenceSection += `\nLEARNED ADMIN PREFERENCES (follow these patterns):
${preferences.map(p => `- [${p.preference_type}${p.platform ? '/' + p.platform : ''}] ${p.pattern} (confidence: ${Math.round(p.confidence_score * 100)}%)`).join('\n')}\n`
    }

    const systemPrompt = `You are a social media content expert specializing in wine industry marketing for the Walla Walla Valley wine region.
You create engaging, authentic content that drives visits and builds brand awareness.

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Season: ${seasonalContext.season}
${seasonalContext.upcomingHolidays.length > 0 ? `Upcoming holidays: ${seasonalContext.upcomingHolidays.join(', ')}` : ''}
${seasonalContext.winerySeasons.length > 0 ? `Wine seasons: ${seasonalContext.winerySeasons.join(', ')}` : ''}
Tourism context: ${seasonalContext.tourismContext}

Platform: ${platform.toUpperCase()}
Platform Guidelines: ${platformGuideline.style}
Maximum recommended length: ${platformGuideline.maxLength} characters

Content Type: ${contentType.replace('_', ' ')}
Objective: ${contentTypePrompt}

Tone: ${tone}
Tone Description: ${toneDescription}
${intelligenceSection}
IMPORTANT RULES:
${isGeneralContent ? `1. Create content about the Walla Walla Valley wine region as a whole
2. Highlight what makes Walla Walla special - over 130 wineries, beautiful scenery, friendly atmosphere
3. Encourage visitors to plan a trip to wine country` : `1. Never use generic winery content - everything must feel specific to THIS winery
2. Don't invent facts - work with the provided information`}
3. Include relevant emojis naturally (don't overdo it)
4. For Instagram, use line breaks to improve readability
5. End with a clear call-to-action appropriate to the platform
6. Keep hashtag suggestions relevant to Walla Walla wine country
7. MATCH the style, tone, and length of top-performing posts when possible
8. FOLLOW learned preferences from admin editing patterns`

    const userPrompt = isGeneralContent
      ? `Create a ${platform} post about visiting Walla Walla wine country.

The Walla Walla Valley is a premier wine destination in Washington State, known for:
- Over 130 wineries in the region
- World-class Cabernet Sauvignon, Syrah, and other varietals
- Beautiful rolling hills and Blue Mountains backdrop
- Charming downtown with tasting rooms, restaurants, and shops
- Friendly, accessible wine tasting experiences
- Award-winning wines at every price point

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Respond in this exact JSON format:
{
  "content": "The main post text here",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "imagePrompt": "A brief description of what kind of photo would pair well with this post"
}`
      : `Create a ${platform} post for ${winery?.name} winery.

${wineryContext}

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Respond in this exact JSON format:
{
  "content": "The main post text here",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "imagePrompt": "A brief description of what kind of photo would pair well with this post"
}`

    const anthropic = getAnthropicClient();
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
    })

    // Extract text from Anthropic response
    const responseText = completion.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('') || ''

    // Parse the JSON response
    let parsedResponse
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      // Fallback if JSON parsing fails
      parsedResponse = {
        content: responseText,
        hashtags: ['#WallaWallaWine', '#WineCountry', '#WashingtonWine'],
        imagePrompt: 'A beautiful shot of the winery tasting room or vineyard',
      }
    }

    return NextResponse.json({
      platform,
      content: parsedResponse.content,
      hashtags: parsedResponse.hashtags || [],
      bestTimeToPost: platformGuideline.bestTimes,
      imagePrompt: parsedResponse.imagePrompt,
    })
}));
