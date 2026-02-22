import { NextResponse } from 'next/server';

/**
 * Robots.txt Configuration for AI Discoverability
 *
 * Controls search engine and AI crawler access:
 * - Allows access to public pages for all crawlers
 * - Explicitly allows AI crawlers (GPTBot, ClaudeBot, etc.) access to public APIs
 * - Blocks access to admin, private APIs, and portal pages
 * - Points to sitemap and llms.txt locations
 *
 * Using a Route Handler instead of MetadataRoute.Robots to support
 * the custom llms.txt reference line, which the typed interface doesn't allow.
 *
 * AI Crawlers Supported:
 * - GPTBot (ChatGPT)
 * - ChatGPT-User (ChatGPT browsing)
 * - ClaudeBot (Claude/Anthropic)
 * - Claude-Web (Claude web search)
 * - anthropic-ai (Anthropic)
 * - PerplexityBot (Perplexity)
 * - Amazonbot (Amazon/Alexa)
 * - Bytespider (TikTok)
 * - Cohere-ai (Cohere)
 * - Google-Extended (Google AI training)
 * - CCBot (Common Crawl)
 * - YouBot (You.com)
 * - FacebookBot (Meta)
 * - Brave-Search (Brave)
 */

// Public API endpoints that AI crawlers CAN access
const publicApiPaths = [
  '/api/wineries',
  '/api/restaurants',
  '/api/events',
  '/api/shared-tours',
  '/api/kb/',
  '/api/v1/restaurants',
  '/api/v1/availability',
  '/api/announcements',
];

// Private paths that should be blocked for all crawlers
const privatePathsAll = [
  '/admin/',
  '/driver-portal/',
  '/winery-portal/',
  '/partner-portal/',
  '/organizer-portal/',
  '/auth/',
  '/login',
  '/signup',
  '/_next/',
  '/static/',
];

// Private API paths that should be blocked
const privateApiPaths = [
  '/api/admin/',
  '/api/partner/',
  '/api/driver/',
  '/api/organizer/',
  '/api/bookings/',
  '/api/internal/',
];

// AI crawler user agents
const aiCrawlers = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Amazonbot',
  'Bytespider',
  'Cohere-ai',
  'Google-Extended',
  'CCBot',
  'YouBot',
  'FacebookBot',
  'Brave-Search',
];

function buildRobotsTxt(): string {
  const lines: string[] = [];

  // Default rule for general crawlers (Google, Bing, etc.)
  lines.push('User-agent: *');
  lines.push('Allow: /');
  for (const path of privatePathsAll) {
    lines.push(`Disallow: ${path}`);
  }
  lines.push('Disallow: /api/');
  lines.push('');

  // AI Crawlers - explicitly allow public API access
  // This enables GPTs and AI systems to query structured data
  for (const crawler of aiCrawlers) {
    lines.push(`User-agent: ${crawler}`);
  }
  lines.push('Allow: /');
  for (const path of publicApiPaths) {
    lines.push(`Allow: ${path}`);
  }
  for (const path of privatePathsAll) {
    lines.push(`Disallow: ${path}`);
  }
  for (const path of privateApiPaths) {
    lines.push(`Disallow: ${path}`);
  }
  lines.push('');

  // Sitemap
  lines.push('Sitemap: https://wallawalla.travel/sitemap.xml');
  lines.push('');

  // LLMs.txt - AI-readable site summary for large language models
  lines.push('# LLMs.txt - AI-readable site documentation');
  lines.push('# https://wallawalla.travel/llms.txt');
  lines.push('');

  return lines.join('\n');
}

export async function GET() {
  const body = buildRobotsTxt();

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
