#!/usr/bin/env node

/**
 * MCP Content Server for Walla Walla Travel
 *
 * Provides read-only tools for AI systems to query Walla Walla wine country content.
 * Implements the Model Context Protocol (MCP) over stdio using JSON-RPC 2.0.
 *
 * Tools:
 *   - search_wineries: Search wineries by name, style, or features
 *   - get_winery: Get detailed info about a specific winery by slug
 *   - list_events: List upcoming events with optional category filter
 *   - list_shared_tours: List upcoming shared wine tours with availability
 *   - search_restaurants: List restaurants in Walla Walla
 *   - get_guide: Get a travel guide by slug
 *   - get_itinerary: Get a sample itinerary by slug
 *   - check_availability: Check tour availability for a date and party size
 */

const { Pool } = require('pg');
const { readFileSync } = require('fs');
const { resolve } = require('path');

// Load .env.local for DATABASE_URL
try {
  const envPath = resolve(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // .env.local may not exist
}

// ============================================================================
// Database Connection
// ============================================================================

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const requiresSsl = connectionString.includes('supabase.co') ||
  connectionString.includes('amazonaws.com') ||
  connectionString.includes('heroku');

const pool = new Pool({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  options: '-c statement_timeout=15000',
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ============================================================================
// Rate Limiting (simple per-tool counter)
// ============================================================================

const rateLimits = {};
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(toolName) {
  const now = Date.now();
  if (!rateLimits[toolName]) {
    rateLimits[toolName] = { count: 0, windowStart: now };
  }
  const limit = rateLimits[toolName];
  if (now - limit.windowStart > RATE_LIMIT_WINDOW_MS) {
    limit.count = 0;
    limit.windowStart = now;
  }
  limit.count++;
  if (limit.count > MAX_REQUESTS_PER_WINDOW) {
    throw new Error(`Rate limit exceeded for ${toolName}. Max ${MAX_REQUESTS_PER_WINDOW} requests per minute.`);
  }
}

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  {
    name: 'search_wineries',
    description: 'Search wineries in Walla Walla by name, wine style, or features. Returns a list of matching wineries with key details.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search term to match against winery name or description' },
        wine_style: { type: 'string', description: 'Filter by wine style (e.g., "Cabernet Sauvignon", "Syrah")' },
        limit: { type: 'integer', description: 'Max results to return (default 10, max 50)', default: 10 },
      },
    },
  },
  {
    name: 'get_winery',
    description: 'Get detailed information about a specific winery by its URL slug.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'URL slug of the winery (e.g., "lecole-no-41")' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'list_events',
    description: 'List upcoming events in Walla Walla wine country. Can filter by category.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by event category slug' },
        limit: { type: 'integer', description: 'Max results (default 10, max 50)', default: 10 },
      },
    },
  },
  {
    name: 'list_shared_tours',
    description: 'List upcoming shared/group wine tours with availability and pricing. Shared tours run Sunday-Wednesday.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Filter from this date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'Filter to this date (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'search_restaurants',
    description: 'List restaurants in Walla Walla.',
    inputSchema: {
      type: 'object',
      properties: {
        cuisine_type: { type: 'string', description: 'Filter by cuisine type' },
      },
    },
  },
  {
    name: 'get_guide',
    description: 'Get a Walla Walla travel guide by slug. Guides cover topics like best time to visit, wine tasting tips, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Guide slug (e.g., "best-time-to-visit")' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_itinerary',
    description: 'Get a sample wine country itinerary by slug. Includes day-by-day plans with stops and tips.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Itinerary slug (e.g., "weekend-getaway", "first-timers", "romantic-escape")' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'check_availability',
    description: 'Check wine tour availability for a specific date and party size. Returns available tour options with pricing.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Tour date in YYYY-MM-DD format' },
        party_size: { type: 'integer', description: 'Number of guests (1-14)' },
      },
      required: ['date', 'party_size'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleSearchWineries(args) {
  checkRateLimit('search_wineries');
  const limit = Math.min(args.limit || 10, 50);
  const conditions = ['w.is_active = true'];
  const params = [];
  let paramIdx = 1;

  if (args.search) {
    conditions.push(`(w.name ILIKE $${paramIdx} OR w.short_description ILIKE $${paramIdx})`);
    params.push(`%${args.search}%`);
    paramIdx++;
  }

  if (args.wine_style) {
    conditions.push(`$${paramIdx} = ANY(w.specialties)`);
    params.push(args.wine_style);
    paramIdx++;
  }

  params.push(limit);

  const result = await query(`
    SELECT w.name, w.slug, w.city as region, w.short_description as description,
           w.specialties as wine_styles, w.tasting_fee, w.reservation_required,
           w.average_rating as rating, w.review_count, w.amenities as features,
           w.address, w.phone, w.website
    FROM wineries w
    WHERE ${conditions.join(' AND ')}
    ORDER BY w.average_rating DESC NULLS LAST, w.name
    LIMIT $${paramIdx}
  `, params);

  if (result.rows.length === 0) {
    return 'No wineries found matching your criteria.';
  }

  let md = `# Walla Walla Wineries (${result.rows.length} results)\n\n`;
  for (const w of result.rows) {
    md += `## ${w.name}\n`;
    md += `- **Region**: ${w.region || 'Walla Walla'}\n`;
    if (w.description) md += `- **About**: ${w.description}\n`;
    if (w.wine_styles?.length) md += `- **Wine Styles**: ${w.wine_styles.join(', ')}\n`;
    if (w.tasting_fee) md += `- **Tasting Fee**: $${w.tasting_fee}\n`;
    md += `- **Reservations**: ${w.reservation_required ? 'Required' : 'Walk-ins welcome'}\n`;
    if (w.rating) md += `- **Rating**: ${w.rating}/5 (${w.review_count || 0} reviews)\n`;
    if (w.address) md += `- **Address**: ${w.address}\n`;
    if (w.phone) md += `- **Phone**: ${w.phone}\n`;
    if (w.website) md += `- **Website**: ${w.website}\n`;
    md += `- **More info**: https://wallawalla.travel/wineries/${w.slug}\n\n`;
  }
  return md;
}

async function handleGetWinery(args) {
  checkRateLimit('get_winery');
  const result = await query(`
    SELECT w.name, w.slug, w.city as region, w.short_description as description,
           w.specialties as wine_styles, w.tasting_fee,
           w.tasting_fee_waived_with_purchase, w.reservation_required,
           w.hours_of_operation, w.average_rating as rating, w.review_count,
           w.amenities as features, w.address, w.phone, w.website, w.email,
           w.latitude, w.longitude
    FROM wineries w
    WHERE w.slug = $1 AND w.is_active = true
  `, [args.slug]);

  if (result.rows.length === 0) {
    return `No winery found with slug "${args.slug}".`;
  }

  const w = result.rows[0];
  let md = `# ${w.name}\n\n`;
  if (w.description) md += `${w.description}\n\n`;
  md += `## Details\n`;
  md += `- **Region**: ${w.region || 'Walla Walla'}\n`;
  if (w.wine_styles?.length) md += `- **Wine Styles**: ${w.wine_styles.join(', ')}\n`;
  if (w.tasting_fee) md += `- **Tasting Fee**: $${w.tasting_fee}`;
  if (w.tasting_fee_waived_with_purchase) md += ` (waived with purchase)`;
  if (w.tasting_fee) md += `\n`;
  md += `- **Reservations**: ${w.reservation_required ? 'Required' : 'Walk-ins welcome'}\n`;
  if (w.rating) md += `- **Rating**: ${w.rating}/5 (${w.review_count || 0} reviews)\n`;
  if (w.features?.length) md += `- **Features**: ${w.features.join(', ')}\n`;
  md += `\n## Contact\n`;
  if (w.address) md += `- **Address**: ${w.address}\n`;
  if (w.phone) md += `- **Phone**: ${w.phone}\n`;
  if (w.email) md += `- **Email**: ${w.email}\n`;
  if (w.website) md += `- **Website**: ${w.website}\n`;
  md += `- **Page**: https://wallawalla.travel/wineries/${w.slug}\n`;

  if (w.hours_of_operation) {
    md += `\n## Hours\n`;
    try {
      const hours = typeof w.hours_of_operation === 'string'
        ? JSON.parse(w.hours_of_operation)
        : w.hours_of_operation;
      if (typeof hours === 'object') {
        for (const [day, time] of Object.entries(hours)) {
          md += `- **${day}**: ${time}\n`;
        }
      }
    } catch {
      md += `${w.hours_of_operation}\n`;
    }
  }

  // Get insider tips
  try {
    const tips = await query(`
      SELECT tip_type, title, content FROM winery_insider_tips
      WHERE winery_id = (SELECT id FROM wineries WHERE slug = $1)
        AND verified = true
      ORDER BY is_featured DESC, display_order
      LIMIT 5
    `, [args.slug]);

    if (tips.rows.length > 0) {
      md += `\n## Insider Tips\n`;
      for (const tip of tips.rows) {
        if (tip.title) md += `### ${tip.title}\n`;
        md += `${tip.content}\n\n`;
      }
    }
  } catch {
    // Tips table may not exist; skip silently
  }

  return md;
}

async function handleListEvents(args) {
  checkRateLimit('list_events');
  const limit = Math.min(args.limit || 10, 50);
  const conditions = ["e.status = 'published'", 'e.start_date >= CURRENT_DATE'];
  const params = [];
  let paramIdx = 1;

  if (args.category) {
    conditions.push(`ec.slug = $${paramIdx}`);
    params.push(args.category);
    paramIdx++;
  }

  params.push(limit);

  const result = await query(`
    SELECT e.title, e.slug, e.short_description, e.start_date, e.end_date,
           e.start_time, e.end_time, e.is_all_day, e.venue_name, e.address,
           e.city, e.is_free, e.price_min, e.price_max, e.ticket_url,
           e.organizer_name, ec.name as category_name
    FROM events e
    LEFT JOIN event_categories ec ON e.category_id = ec.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.start_date, e.start_time NULLS LAST
    LIMIT $${paramIdx}
  `, params);

  if (result.rows.length === 0) {
    return 'No upcoming events found.';
  }

  let md = `# Upcoming Events in Walla Walla (${result.rows.length} results)\n\n`;
  for (const e of result.rows) {
    md += `## ${e.title}\n`;
    md += `- **Date**: ${e.start_date}`;
    if (e.end_date && e.end_date !== e.start_date) md += ` to ${e.end_date}`;
    md += `\n`;
    if (!e.is_all_day && e.start_time) {
      md += `- **Time**: ${e.start_time}`;
      if (e.end_time) md += ` - ${e.end_time}`;
      md += `\n`;
    }
    if (e.venue_name) md += `- **Venue**: ${e.venue_name}\n`;
    if (e.address) md += `- **Address**: ${e.address}, ${e.city || 'Walla Walla'}\n`;
    if (e.category_name) md += `- **Category**: ${e.category_name}\n`;
    if (e.is_free) {
      md += `- **Price**: Free\n`;
    } else if (e.price_min) {
      md += `- **Price**: $${e.price_min}`;
      if (e.price_max && e.price_max !== e.price_min) md += ` - $${e.price_max}`;
      md += `\n`;
    }
    if (e.organizer_name) md += `- **Organizer**: ${e.organizer_name}\n`;
    if (e.short_description) md += `- **About**: ${e.short_description}\n`;
    if (e.ticket_url) md += `- **Tickets**: ${e.ticket_url}\n`;
    md += `- **More info**: https://wallawalla.travel/events/${e.slug}\n\n`;
  }
  return md;
}

async function handleListSharedTours(args) {
  checkRateLimit('list_shared_tours');
  const conditions = ['published = true', "status NOT IN ('cancelled', 'completed')"];
  const params = [];
  let paramIdx = 1;

  if (args.start_date) {
    conditions.push(`tour_date >= $${paramIdx}`);
    params.push(args.start_date);
    paramIdx++;
  } else {
    conditions.push('tour_date >= CURRENT_DATE');
  }

  if (args.end_date) {
    conditions.push(`tour_date <= $${paramIdx}`);
    params.push(args.end_date);
    paramIdx++;
  }

  const result = await query(`
    SELECT * FROM shared_tours_availability_view
    WHERE ${conditions.join(' AND ')}
    ORDER BY tour_date, start_time
    LIMIT 20
  `, params);

  if (result.rows.length === 0) {
    return 'No upcoming shared tours found. Visit https://wallawalla.travel/shared-tours for the latest schedule.';
  }

  let md = `# Upcoming Shared Wine Tours (${result.rows.length} tours)\n\n`;
  md += `Shared tours run Sunday-Wednesday. Individual tickets from $95/person.\n\n`;

  for (const t of result.rows) {
    md += `## ${t.title || 'Walla Walla Wine Tour'} - ${t.tour_date}\n`;
    md += `- **Date**: ${t.tour_date}\n`;
    if (t.start_time) md += `- **Start Time**: ${t.start_time}\n`;
    if (t.duration_hours) md += `- **Duration**: ${t.duration_hours} hours\n`;
    md += `- **Price**: From $${t.base_price_per_person || t.price_per_person || 95}/person\n`;
    if (t.lunch_price_per_person) md += `- **With Lunch**: $${t.lunch_price_per_person}/person\n`;
    md += `- **Spots Available**: ${t.spots_available ?? 'Check availability'}\n`;
    md += `- **Status**: ${t.status}\n`;
    if (t.wineries_preview?.length || t.planned_wineries?.length) {
      const wineries = t.wineries_preview || t.planned_wineries;
      md += `- **Planned Wineries**: ${wineries.join(', ')}\n`;
    }
    if (t.meeting_location || t.pickup_location) {
      md += `- **Meeting Point**: ${t.meeting_location || t.pickup_location}\n`;
    }
    md += `- **Book**: https://wallawalla.travel/shared-tours\n\n`;
  }
  return md;
}

async function handleSearchRestaurants(args) {
  checkRateLimit('search_restaurants');
  const conditions = ['is_active = true'];
  const params = [];
  let paramIdx = 1;

  if (args.cuisine_type) {
    conditions.push(`cuisine_type ILIKE $${paramIdx}`);
    params.push(`%${args.cuisine_type}%`);
    paramIdx++;
  }

  const result = await query(`
    SELECT name, cuisine_type, address, phone, website, menu_url, is_partner
    FROM restaurants
    WHERE ${conditions.join(' AND ')}
    ORDER BY name
  `, params);

  if (result.rows.length === 0) {
    return 'No restaurants found matching your criteria.';
  }

  let md = `# Restaurants in Walla Walla (${result.rows.length} results)\n\n`;
  for (const r of result.rows) {
    md += `## ${r.name}\n`;
    if (r.cuisine_type) md += `- **Cuisine**: ${r.cuisine_type}\n`;
    if (r.address) md += `- **Address**: ${r.address}\n`;
    if (r.phone) md += `- **Phone**: ${r.phone}\n`;
    if (r.website) md += `- **Website**: ${r.website}\n`;
    if (r.menu_url) md += `- **Menu**: ${r.menu_url}\n`;
    md += `\n`;
  }
  return md;
}

function handleGetGuide(args) {
  checkRateLimit('get_guide');
  // Load guides from static data
  try {
    // guides are in lib/data/guides.ts - we need to read the compiled version
    // Since this is a standalone script, we load the data directly
    const guidesPath = resolve(__dirname, '..', 'lib', 'data', 'guides.ts');
    const content = readFileSync(guidesPath, 'utf8');

    // Parse the guide data from the TypeScript source
    const guide = extractGuideFromSource(content, args.slug);
    if (!guide) {
      return `No guide found with slug "${args.slug}". Available guides: best-time-to-visit, wine-tasting-tips, getting-here, where-to-stay, dining-guide`;
    }
    return guide;
  } catch (err) {
    return `Error loading guide: ${err.message}`;
  }
}

function extractGuideFromSource(source, slug) {
  // Find the guide object for the given slug using regex
  const slugPattern = new RegExp(`slug:\\s*['"]${slug}['"]`);
  if (!slugPattern.test(source)) return null;

  // Extract title
  const titleMatch = source.match(new RegExp(`slug:\\s*['"]${slug}['"][\\s\\S]*?title:\\s*['"]([^'"]+)['"]`));
  const descMatch = source.match(new RegExp(`slug:\\s*['"]${slug}['"][\\s\\S]*?description:\\s*['"]([^'"]+)['"]`));

  let md = `# ${titleMatch ? titleMatch[1] : slug}\n\n`;
  if (descMatch) md += `${descMatch[1]}\n\n`;
  md += `Read the full guide at: https://wallawalla.travel/guides/${slug}\n`;
  return md;
}

function handleGetItinerary(args) {
  checkRateLimit('get_itinerary');
  try {
    const itinerariesPath = resolve(__dirname, '..', 'lib', 'data', 'itineraries.ts');
    const content = readFileSync(itinerariesPath, 'utf8');

    const slugPattern = new RegExp(`slug:\\s*['"]${args.slug}['"]`);
    if (!slugPattern.test(content)) {
      return `No itinerary found with slug "${args.slug}". Available itineraries: weekend-getaway, first-timers, romantic-escape`;
    }

    // Extract key fields
    const titleMatch = content.match(new RegExp(`slug:\\s*['"]${args.slug}['"][\\s\\S]*?title:\\s*['"]([^'"]+)['"]`));
    const descMatch = content.match(new RegExp(`slug:\\s*['"]${args.slug}['"][\\s\\S]*?description:\\s*['"]([^'"]+)['"]`));
    const durationMatch = content.match(new RegExp(`slug:\\s*['"]${args.slug}['"][\\s\\S]*?duration:\\s*['"]([^'"]+)['"]`));
    const costMatch = content.match(new RegExp(`slug:\\s*['"]${args.slug}['"][\\s\\S]*?estimatedCost:\\s*['"]([^'"]+)['"]`));

    let md = `# ${titleMatch ? titleMatch[1] : args.slug}\n\n`;
    if (descMatch) md += `${descMatch[1]}\n\n`;
    if (durationMatch) md += `- **Duration**: ${durationMatch[1]}\n`;
    if (costMatch) md += `- **Estimated Cost**: ${costMatch[1]}\n`;
    md += `\nView the full itinerary with day-by-day details at: https://wallawalla.travel/itineraries/${args.slug}\n`;
    return md;
  } catch (err) {
    return `Error loading itinerary: ${err.message}`;
  }
}

async function handleCheckAvailability(args) {
  checkRateLimit('check_availability');

  const { date, party_size } = args;
  if (!date || !party_size) {
    return 'Both date (YYYY-MM-DD) and party_size are required.';
  }
  if (party_size < 1 || party_size > 14) {
    return 'Party size must be between 1 and 14. For larger groups, contact info@wallawalla.travel.';
  }

  // Check existing bookings for that date
  const result = await query(
    `SELECT COALESCE(SUM(party_size), 0)::INTEGER as booked
     FROM bookings
     WHERE tour_date = $1 AND status NOT IN ('cancelled')`,
    [date]
  );

  const maxCapacity = 42; // 3 vehicles x 14 capacity
  const booked = result.rows[0]?.booked || 0;
  const remaining = maxCapacity - booked;
  const available = remaining >= party_size;

  const tourOptions = [
    { name: 'Classic Wine Tour', price: 125, duration: '6 hours', description: 'Visit 3 handpicked wineries with transportation and bottled water.' },
    { name: 'Private Transportation', price: 85, duration: '5 hours', description: 'Hourly private transportation. You choose the wineries.' },
    { name: 'Celebration Package', price: 165, duration: '7 hours', description: 'Special occasions with champagne toast, snacks, and decor.' },
  ];

  let md = `# Tour Availability for ${date}\n\n`;
  md += `- **Party Size**: ${party_size} guests\n`;
  md += `- **Available**: ${available ? 'Yes' : 'No'}\n\n`;

  if (available) {
    md += `## Tour Options\n\n`;
    for (const opt of tourOptions) {
      md += `### ${opt.name}\n`;
      md += `- **Price**: $${opt.price}/person ($${opt.price * party_size} total)\n`;
      md += `- **Duration**: ${opt.duration}\n`;
      md += `- ${opt.description}\n\n`;
    }
    md += `Book at: https://wallawalla.travel/inquiry\n`;
  } else {
    md += `This date is fully booked. Contact info@wallawalla.travel or call (509) 200-8000 for assistance.\n`;
  }

  return md;
}

// ============================================================================
// Tool Dispatcher
// ============================================================================

async function callTool(name, args) {
  switch (name) {
    case 'search_wineries': return await handleSearchWineries(args || {});
    case 'get_winery': return await handleGetWinery(args || {});
    case 'list_events': return await handleListEvents(args || {});
    case 'list_shared_tours': return await handleListSharedTours(args || {});
    case 'search_restaurants': return await handleSearchRestaurants(args || {});
    case 'get_guide': return handleGetGuide(args || {});
    case 'get_itinerary': return handleGetItinerary(args || {});
    case 'check_availability': return await handleCheckAvailability(args || {});
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ============================================================================
// MCP Protocol (JSON-RPC 2.0 over stdio)
// ============================================================================

const SERVER_INFO = {
  name: 'walla-walla-content',
  version: '1.0.0',
};

const SERVER_CAPABILITIES = {
  tools: {},
};

function createResponse(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n';
}

function createError(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n';
}

async function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      return createResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: SERVER_CAPABILITIES,
        serverInfo: SERVER_INFO,
      });

    case 'notifications/initialized':
      // No response needed for notifications
      return null;

    case 'tools/list':
      return createResponse(id, { tools: TOOLS });

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const result = await callTool(toolName, toolArgs);
        return createResponse(id, {
          content: [{ type: 'text', text: result }],
        });
      } catch (err) {
        return createResponse(id, {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        });
      }
    }

    case 'ping':
      return createResponse(id, {});

    default:
      if (method?.startsWith('notifications/')) {
        return null; // Silently ignore notifications
      }
      return createError(id, -32601, `Method not found: ${method}`);
  }
}

// ============================================================================
// Stdio Transport
// ============================================================================

let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  buffer += chunk;

  // Process complete messages (newline-delimited JSON)
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const msg = JSON.parse(trimmed);
      const response = await handleMessage(msg);
      if (response) {
        process.stdout.write(response);
      }
    } catch (err) {
      // Write parse error
      process.stdout.write(createError(null, -32700, `Parse error: ${err.message}`));
    }
  }
});

process.stdin.on('end', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

console.error('MCP Content Server started (walla-walla-content v1.0.0)');
