import { MetadataRoute } from 'next';

/**
 * Robots.txt Configuration for AI Discoverability
 *
 * Controls search engine and AI crawler access:
 * - Allows access to public pages for all crawlers
 * - Explicitly allows AI crawlers (GPTBot, ClaudeBot, etc.) access to public APIs
 * - Blocks access to admin, private APIs, and portal pages
 * - Points to sitemap location
 *
 * AI Crawlers Supported:
 * - GPTBot (ChatGPT)
 * - ChatGPT-User (ChatGPT browsing)
 * - ClaudeBot (Claude/Anthropic)
 * - anthropic-ai (Anthropic)
 * - PerplexityBot (Perplexity)
 * - Amazonbot (Amazon/Alexa)
 * - Bytespider (TikTok)
 * - Cohere-ai (Cohere)
 */
export default function robots(): MetadataRoute.Robots {
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

  return {
    rules: [
      // Default rule for general crawlers (Google, Bing, etc.)
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          ...privatePathsAll,
          '/api/', // Block all APIs by default for general crawlers
        ],
      },
      // AI Crawlers - explicitly allow public API access
      // This enables GPTs and AI systems to query structured data
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'anthropic-ai',
          'PerplexityBot',
          'Amazonbot',
          'Bytespider',
          'Cohere-ai',
          'Google-Extended', // Google AI training
          'CCBot', // Common Crawl (used for AI training)
        ],
        allow: [
          '/',
          ...publicApiPaths,
        ],
        disallow: [
          ...privatePathsAll,
          ...privateApiPaths,
        ],
      },
    ],
    sitemap: 'https://wallawalla.travel/sitemap.xml',
  };
}
