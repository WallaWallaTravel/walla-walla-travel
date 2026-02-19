/**
 * GPT Store API: Search Geology Topics
 *
 * Allows ChatGPT to search for geology education topics
 * about Walla Walla's geological history and wine connections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

interface TopicRow {
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  topic_type: string;
  difficulty: string;
  author_name: string | null;
}

interface TopicResult {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  topic_type: string;
  difficulty: string;
  author_name: string;
}

// CORS headers for ChatGPT
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('query') || '';
  const topicType = searchParams.get('type') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25);

  // Build the query
  let sql = `
    SELECT
      slug, title, subtitle, excerpt, topic_type, difficulty, author_name
    FROM geology_topics
    WHERE is_published = true
  `;
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Add search filter
  if (searchQuery) {
    sql += ` AND (
      title ILIKE $${paramIndex} OR
      excerpt ILIKE $${paramIndex} OR
      content ILIKE $${paramIndex}
    )`;
    params.push(`%${searchQuery}%`);
    paramIndex++;
  }

  // Add topic type filter
  if (topicType) {
    sql += ` AND topic_type = $${paramIndex}`;
    params.push(topicType);
    paramIndex++;
  }

  sql += ` ORDER BY display_order ASC, title ASC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query<TopicRow>(sql, params);

  // Format results for GPT-friendly response
  const topics: TopicResult[] = result.rows.map(row => ({
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || '',
    excerpt: row.excerpt || '',
    topic_type: row.topic_type,
    difficulty: row.difficulty,
    author_name: row.author_name || 'Kevin Pogue'
  }));

  // Generate a human-friendly message
  let message: string;
  if (topics.length === 0) {
    if (searchQuery) {
      message = `I couldn't find any geology topics matching "${searchQuery}". Try searching for "floods", "basalt", "loess", "terroir", or "soil" — or browse all topics.`;
    } else if (topicType) {
      message = `No published topics found for the "${topicType}" category. The geology content is still being developed — check back soon!`;
    } else {
      message = 'No geology topics are available yet. The content is being developed by our geology expert. Use your knowledge file for geology information in the meantime.';
    }
  } else if (searchQuery) {
    message = `Found ${topics.length} geology ${topics.length === 1 ? 'topic' : 'topics'} matching "${searchQuery}": ${topics.slice(0, 3).map(t => t.title).join(', ')}${topics.length > 3 ? ' and more' : ''}.`;
  } else if (topicType) {
    message = `Found ${topics.length} ${topicType.replace(/_/g, ' ')} ${topics.length === 1 ? 'topic' : 'topics'}.`;
  } else {
    message = `Here are ${topics.length} geology topics about Walla Walla's geological history and wine connections.`;
  }

  return NextResponse.json(
    {
      success: true,
      message,
      topics,
      total: topics.length
    },
    { headers: corsHeaders }
  );
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}
