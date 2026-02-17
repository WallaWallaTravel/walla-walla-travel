/**
 * Admin API: Blog Content Generator
 *
 * POST - Generate a long-form blog article using Claude AI
 * GET  - List blog drafts with filters
 * PATCH - Update blog draft status
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }
  return new Anthropic({ apiKey })
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200)
}

function calculateSeoScore(content: string, keywords: string[], metaDescription: string, title: string): number {
  let score = 0
  const contentLower = content.toLowerCase()
  const titleLower = title.toLowerCase()

  // Keyword presence in content (up to 25 points)
  let keywordsFound = 0
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase()
    if (contentLower.includes(kwLower)) {
      keywordsFound++
    }
  }
  if (keywords.length > 0) {
    score += Math.round((keywordsFound / keywords.length) * 25)
  } else {
    score += 15
  }

  // Keyword in title (10 points)
  for (const kw of keywords) {
    if (titleLower.includes(kw.toLowerCase())) {
      score += 10
      break
    }
  }

  // Meta description length (15 points)
  if (metaDescription.length >= 120 && metaDescription.length <= 160) {
    score += 15
  } else if (metaDescription.length >= 80 && metaDescription.length <= 200) {
    score += 8
  }

  // Heading structure (15 points)
  const h2Count = (content.match(/^## /gm) || []).length
  const h3Count = (content.match(/^### /gm) || []).length
  if (h2Count >= 3) score += 8
  else if (h2Count >= 1) score += 4
  if (h3Count >= 2) score += 7
  else if (h3Count >= 1) score += 3

  // Word count (15 points)
  const wordCount = content.split(/\s+/).filter(Boolean).length
  if (wordCount >= 1500 && wordCount <= 2500) score += 15
  else if (wordCount >= 1000 && wordCount <= 3000) score += 10
  else if (wordCount >= 500) score += 5

  // Paragraph structure (10 points)
  const paragraphs = content.split(/\n\n/).filter(p => p.trim().length > 0)
  if (paragraphs.length >= 10) score += 10
  else if (paragraphs.length >= 5) score += 5

  // Internal linking potential / list usage (10 points)
  const hasBullets = content.includes('- ') || content.includes('* ')
  const hasNumbered = /^\d+\./m.test(content)
  if (hasBullets) score += 5
  if (hasNumbered) score += 5

  return Math.min(100, score)
}

function estimateReadTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 250))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, targetKeywords, category, tone, wordCountTarget } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!targetKeywords || !Array.isArray(targetKeywords) || targetKeywords.length === 0) {
      return NextResponse.json({ error: 'At least one target keyword is required' }, { status: 400 })
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    const wordTarget = wordCountTarget || 1500
    const articleTone = tone || 'professional'

    const anthropic = getAnthropicClient()

    const systemPrompt = `You are an expert content writer specializing in wine tourism and travel content for the Walla Walla Valley, Washington State. You write long-form, SEO-optimized blog articles that are informative, engaging, and authoritative.

Writing guidelines:
- Write in a ${articleTone} tone
- Target approximately ${wordTarget} words
- Use ## for main sections and ### for subsections
- Include relevant details about Walla Walla wine country
- Write naturally — avoid keyword stuffing
- Include practical tips and actionable information
- Reference specific aspects of the Walla Walla Valley when possible
- End with a compelling conclusion or call-to-action
- Do NOT invent specific statistics, winery names, or facts you cannot verify
- Use phrases like "many local wineries" instead of citing a specific count unless certain

IMPORTANT RULES (Walla Walla Travel business rules):
- Never mention more than 3-4 wineries per tour
- Standard tours are approximately 6 hours for 3 wineries
- Tasting fees are NOT included in tour pricing
- Transportation is via Mercedes Sprinter vans
- Do not claim specific years of experience`

    const userPrompt = `Write a comprehensive blog article with the following specifications:

Title: ${title}
Target Keywords: ${targetKeywords.join(', ')}
Category: ${category}
Target Word Count: ${wordTarget}

Write the full article in markdown format with proper heading structure (## and ###).

After the article, on a new line, provide the meta description in this exact format:
META_DESCRIPTION: [Your 150-160 character meta description here]

The article should be well-structured, informative, and optimized for the target keywords while reading naturally.`

    logger.info('Generating blog article', { title, keywords: targetKeywords, category })

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 8000,
    })

    const responseText = completion.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Extract meta description
    let metaDescription = ''
    let articleContent = responseText

    const metaMatch = responseText.match(/META_DESCRIPTION:\s*(.+?)(?:\n|$)/)
    if (metaMatch) {
      metaDescription = metaMatch[1].trim().substring(0, 320)
      articleContent = responseText.replace(/META_DESCRIPTION:\s*.+?(?:\n|$)/, '').trim()
    }

    if (!metaDescription) {
      metaDescription = `${title} - Your guide to ${targetKeywords[0]} in Walla Walla wine country.`.substring(0, 160)
    }

    const slug = slugify(title)
    const wordCount = articleContent.split(/\s+/).filter(Boolean).length
    const readTime = estimateReadTime(wordCount)
    const seoScore = calculateSeoScore(articleContent, targetKeywords, metaDescription, title)

    // Generate JSON-LD Article schema
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: metaDescription,
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      author: {
        '@type': 'Organization',
        name: 'Walla Walla Travel',
        url: 'https://wallawalla.travel',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Walla Walla Travel',
        url: 'https://wallawalla.travel',
      },
      wordCount,
      articleSection: category,
      keywords: targetKeywords.join(', '),
    }

    // Store in database
    const result = await query(`
      INSERT INTO blog_drafts (
        title, slug, meta_description, target_keywords, content,
        word_count, estimated_read_time, json_ld, category,
        status, seo_score, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        'draft', $10, NOW(), NOW()
      ) RETURNING *
    `, [
      title,
      slug,
      metaDescription,
      targetKeywords,
      articleContent,
      wordCount,
      readTime,
      JSON.stringify(jsonLd),
      category,
      seoScore,
    ])

    logger.info('Blog article generated', {
      id: result.rows[0].id,
      title,
      wordCount,
      seoScore,
    })

    return NextResponse.json({
      success: true,
      draft: result.rows[0],
    })
  } catch (error) {
    logger.error('Blog generation failed', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate blog article' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const id = searchParams.get('id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Single draft by ID
    if (id) {
      const result = await query(`
        SELECT bd.*, u.name as created_by_name
        FROM blog_drafts bd
        LEFT JOIN users u ON bd.created_by = u.id
        WHERE bd.id = $1
      `, [parseInt(id)])

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Blog draft not found' }, { status: 404 })
      }

      return NextResponse.json({ draft: result.rows[0] })
    }

    // List drafts
    let queryText = `
      SELECT
        bd.id, bd.title, bd.slug, bd.meta_description,
        bd.target_keywords, bd.word_count, bd.estimated_read_time,
        bd.category, bd.status, bd.seo_score, bd.readability_score,
        bd.published_at, bd.created_at, bd.updated_at,
        u.name as created_by_name
      FROM blog_drafts bd
      LEFT JOIN users u ON bd.created_by = u.id
      WHERE 1=1
    `
    const params: (string | number)[] = []
    let paramIndex = 1

    if (status && status !== 'all') {
      queryText += ` AND bd.status = $${paramIndex++}`
      params.push(status)
    }

    if (category && category !== 'all') {
      queryText += ` AND bd.category = $${paramIndex++}`
      params.push(category)
    }

    queryText += ` ORDER BY bd.created_at DESC LIMIT $${paramIndex++}`
    params.push(limit)

    const result = await query(queryText, params)

    return NextResponse.json({
      drafts: result.rows,
      total: result.rows.length,
    })
  } catch (error) {
    logger.error('Failed to fetch blog drafts', { error })
    return NextResponse.json(
      { error: 'Failed to fetch blog drafts' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 })
    }

    const validStatuses = ['draft', 'review', 'approved', 'published', 'archived']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updates: string[] = ['status = $2', 'updated_at = NOW()']
    const params: (string | number)[] = [id, status]

    if (status === 'published') {
      updates.push('published_at = NOW()')
    }

    const result = await query(`
      UPDATE blog_drafts
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Blog draft not found' }, { status: 404 })
    }

    logger.info('Blog draft status updated', { draftId: id, newStatus: status })

    return NextResponse.json({
      success: true,
      draft: result.rows[0],
    })
  } catch (error) {
    logger.error('Failed to update blog draft', { error })
    return NextResponse.json(
      { error: 'Failed to update blog draft' },
      { status: 500 }
    )
  }
}
