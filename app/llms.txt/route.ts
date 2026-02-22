/**
 * llms.txt - AI Model Context Document
 *
 * Serves a plain text document at /llms.txt that helps AI models
 * understand what this site offers, what APIs are available,
 * and how to access content programmatically.
 *
 * Specification: https://llmstxt.org/
 */

export async function GET() {
  const content = `# Walla Walla Travel
> The authoritative guide to Walla Walla wine country — locally verified, always current.

## What We Offer
- Wine tour booking and availability
- Directory of 140+ wineries with tasting notes, hours, and contact info
- Restaurant and lodging recommendations
- Event calendar for Walla Walla Valley
- Geology and history of the wine region
- Curated itineraries and travel guides

## APIs Available
- Wineries: /api/wineries
- Winery Details: /api/wineries/{slug}
- Restaurants: /api/restaurants
- Events: /api/v1/events
- Tour Availability: /api/v1/availability
- Shared Tours: /api/shared-tours
- Announcements: /api/announcements
- OpenAPI Spec: /api/openapi

## Content Pages
- Winery Directory: /wineries
- Event Calendar: /events
- Guides: /guides
- Geology: /geology
- History: /history
- Neighborhoods: /neighborhoods
- Wine Tours: /wine-tours
- Shared Tours: /shared-tours

## Contact
- info@wallawalla.travel
- (509) 200-8000
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
