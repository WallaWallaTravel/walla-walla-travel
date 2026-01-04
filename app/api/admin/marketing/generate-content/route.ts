import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface GenerateRequest {
  wineryId: number
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

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { wineryId, platform, contentType, tone, customPrompt } = body

    // Fetch winery data
    const winery = await prisma.wineries.findUnique({
      where: { id: wineryId },
      select: {
        id: true,
        name: true,
        description: true,
        short_description: true,
        specialties: true,
        winemaker: true,
        owner: true,
        founded_year: true,
        production_volume: true,
        price_range: true,
      },
    })

    if (!winery) {
      return NextResponse.json({ error: 'Winery not found' }, { status: 404 })
    }

    // Fetch winery content for context
    const wineryContent = await prisma.$queryRaw<Array<{content_type: string, content: string}>>`
      SELECT content_type, content
      FROM winery_content
      WHERE winery_id = ${wineryId}
      LIMIT 5
    `

    const platformGuideline = PLATFORM_GUIDELINES[platform]
    const contentTypePrompt = CONTENT_TYPE_PROMPTS[contentType] || ''
    const toneDescription = TONE_DESCRIPTIONS[tone] || ''

    // Build context from winery data
    const wineryContext = `
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

    const systemPrompt = `You are a social media content expert specializing in wine industry marketing for the Walla Walla Valley wine region.
You create engaging, authentic content that drives visits and builds brand awareness.

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Current season: Winter

Platform: ${platform.toUpperCase()}
Platform Guidelines: ${platformGuideline.style}
Maximum recommended length: ${platformGuideline.maxLength} characters

Content Type: ${contentType.replace('_', ' ')}
Objective: ${contentTypePrompt}

Tone: ${tone}
Tone Description: ${toneDescription}

IMPORTANT RULES:
1. Never use generic winery content - everything must feel specific to THIS winery
2. Don't invent facts - work with the provided information
3. Include relevant emojis naturally (don't overdo it)
4. For Instagram, use line breaks to improve readability
5. End with a clear call-to-action appropriate to the platform
6. Keep hashtag suggestions relevant to Walla Walla wine country`

    const userPrompt = `Create a ${platform} post for ${winery.name} winery.

${wineryContext}

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Respond in this exact JSON format:
{
  "content": "The main post text here",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "imagePrompt": "A brief description of what kind of photo would pair well with this post"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    })

    const responseText = completion.choices[0]?.message?.content || ''

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
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    )
  }
}
