/**
 * OpenAPI Specification for the Walla Walla Geology Guide GPT
 *
 * Separate spec from the Travel Concierge GPT — this serves
 * the geology-focused ChatGPT Store GPT.
 */

import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Walla Walla Geology Guide API',
    description: `API for the Walla Walla Geology Guide GPT — providing access to geology topics, geological sites, and geology tour experiences in the Walla Walla Valley.

This API allows you to:
- Search for geology education topics (Ice Age Floods, basalt, loess, terroir, etc.)
- Find geological sites and viewpoints visitors can explore in person
- List available geology tour experiences

Walla Walla's geological story — shaped by ancient lava flows, catastrophic Ice Age floods, and millennia of wind-blown loess — is what makes the region's wines unique.`,
    version: '1.0.0',
    contact: {
      name: 'Walla Walla Travel',
      email: 'info@wallawalla.travel',
      url: 'https://wallawalla.travel'
    }
  },
  servers: [
    {
      url: 'https://wallawalla.travel/api/gpt',
      description: 'Production'
    }
  ],
  paths: {
    '/geology-topics': {
      get: {
        operationId: 'searchGeologyTopics',
        summary: 'Search geology education topics',
        description: 'Search for published geology topics about Walla Walla\'s geological history, soil types, and wine connections. Topics cover Ice Age Floods, basalt formations, loess deposits, caliche, and terroir.',
        parameters: [
          {
            name: 'query',
            in: 'query',
            required: false,
            description: 'Search text — can be a topic name or keyword (e.g., "floods", "basalt", "terroir", "soil")',
            schema: { type: 'string' }
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            description: 'Filter by topic type',
            schema: {
              type: 'string',
              enum: ['ice_age_floods', 'soil_types', 'basalt', 'terroir', 'climate', 'water', 'overview', 'wine_connection']
            }
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Maximum number of results to return',
            schema: { type: 'integer', default: 10, maximum: 25 }
          }
        ],
        responses: {
          '200': {
            description: 'List of matching geology topics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', description: 'Human-friendly summary of results' },
                    topics: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/GeologyTopic' }
                    },
                    total: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/geology-sites': {
      get: {
        operationId: 'searchGeologySites',
        summary: 'Search geological sites and viewpoints',
        description: 'Search for geological sites, viewpoints, formations, and vineyard examples that visitors can explore in the Walla Walla area. Includes access information and best times to visit.',
        parameters: [
          {
            name: 'query',
            in: 'query',
            required: false,
            description: 'Search text — can be a site name or keyword (e.g., "viewpoint", "basalt", "vineyard")',
            schema: { type: 'string' }
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            description: 'Filter by site type',
            schema: {
              type: 'string',
              enum: ['viewpoint', 'formation', 'vineyard_example', 'educational_marker', 'museum', 'tour_stop']
            }
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Maximum number of results to return',
            schema: { type: 'integer', default: 10, maximum: 25 }
          }
        ],
        responses: {
          '200': {
            description: 'List of matching geological sites',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', description: 'Human-friendly summary of results' },
                    sites: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/GeologySite' }
                    },
                    total: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/geology-tours': {
      get: {
        operationId: 'searchGeologyTours',
        summary: 'List geology tour experiences',
        description: 'Get a list of active geology tour experiences available in the Walla Walla area. Tours are led by geology experts and connect the region\'s geological history to its wines.',
        parameters: [],
        responses: {
          '200': {
            description: 'List of available geology tours',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', description: 'Human-friendly summary of results' },
                    tours: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/GeologyTour' }
                    },
                    total: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      GeologyTopic: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          excerpt: { type: 'string', description: 'Short summary of the topic' },
          topic_type: {
            type: 'string',
            enum: ['ice_age_floods', 'soil_types', 'basalt', 'terroir', 'climate', 'water', 'overview', 'wine_connection']
          },
          difficulty: {
            type: 'string',
            enum: ['general', 'intermediate', 'advanced'],
            description: 'Content difficulty level'
          },
          author_name: { type: 'string', description: 'Expert author of the topic' }
        }
      },
      GeologySite: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          site_type: {
            type: 'string',
            enum: ['viewpoint', 'formation', 'vineyard_example', 'educational_marker', 'museum', 'tour_stop']
          },
          address: { type: 'string' },
          is_public_access: { type: 'boolean', description: 'Whether the site is publicly accessible' },
          requires_appointment: { type: 'boolean', description: 'Whether an appointment is needed' },
          best_time_to_visit: { type: 'string', description: 'Recommended season or time to visit' }
        }
      },
      GeologyTour: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          name: { type: 'string' },
          tagline: { type: 'string' },
          description: { type: 'string' },
          duration_hours: { type: 'number', description: 'Tour duration in hours' },
          price_per_person: { type: 'number', description: 'Price per person in USD' },
          highlights: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key highlights of the tour'
          },
          whats_included: {
            type: 'array',
            items: { type: 'string' },
            description: 'What is included in the tour'
          },
          is_featured: { type: 'boolean' }
        }
      }
    }
  }
};

export const GET = withErrorHandling(async () => {
  return NextResponse.json(OPENAPI_SPEC, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
