/**
 * OpenAPI/Swagger specification generator
 * This generates API documentation compatible with OpenAI's GPT Actions and other integrations
 */

import { z } from 'zod';

// OpenAPI Schema Types

/** OpenAPI primitive types */
export type OpenAPIDataType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

/** OpenAPI string formats */
export type OpenAPIStringFormat = 'date' | 'date-time' | 'email' | 'uri' | 'time' | 'uuid' | 'decimal';

/** OpenAPI schema reference */
export interface OpenAPISchemaRef {
  $ref: string;
}

/** OpenAPI schema object */
export interface OpenAPISchemaObject {
  type?: OpenAPIDataType;
  format?: OpenAPIStringFormat;
  description?: string;
  enum?: string[];
  items?: OpenAPISchemaObject | OpenAPISchemaRef;
  properties?: Record<string, OpenAPISchemaObject | OpenAPISchemaRef>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  default?: unknown;
  $ref?: string;
}

/** OpenAPI parameter object */
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  schema: OpenAPISchemaObject;
  description?: string;
}

/** OpenAPI request body object */
export interface OpenAPIRequestBody {
  required?: boolean;
  content: {
    'application/json': {
      schema: OpenAPISchemaObject | OpenAPISchemaRef;
    };
  };
}

/** OpenAPI response object */
export interface OpenAPIResponse {
  description: string;
  content?: {
    'application/json': {
      schema: OpenAPISchemaObject | OpenAPISchemaRef;
    };
  };
}

/** OpenAPI operation object */
export interface OpenAPIOperation {
  summary: string;
  description: string;
  tags: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
}

/** OpenAPI path item object */
export interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
}

/** OpenAPI security scheme object */
export interface OpenAPISecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  in?: 'query' | 'header' | 'cookie';
  name?: string;
}

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name: string;
      email: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, OpenAPIPathItem>;
  components: {
    schemas: Record<string, OpenAPISchemaObject>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
  };
}

/**
 * Generate OpenAPI 3.0 specification for Walla Walla Travel API
 * This spec can be used for:
 * - OpenAI GPT Actions
 * - Swagger UI documentation
 * - API client generation
 * - Third-party integrations
 */
export const generateOpenAPISpec = (): OpenAPISchema => {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Walla Walla Travel API',
      description: 'Premium wine tour booking and itinerary management API for Walla Walla Valley',
      version: '1.0.0',
      contact: {
        name: 'Walla Walla Travel',
        email: 'info@wallawalla.travel',
        url: 'https://wallawalla.travel'
      }
    },
    servers: [
      {
        url: 'https://wallawalla.travel/api/v1',
        description: 'Production Server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Local Development'
      }
    ],
    paths: {
      '/bookings': {
        get: {
          summary: 'List all bookings',
          description: 'Retrieve a paginated list of tour bookings with optional filters',
          tags: ['Bookings'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number for pagination'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 },
              description: 'Number of results per page'
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
              description: 'Filter by booking status'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Booking' }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
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
        post: {
          summary: 'Create a new booking',
          description: 'Create a new wine tour booking',
          tags: ['Bookings'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateBookingRequest' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Booking created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Booking' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/bookings/{id}': {
        get: {
          summary: 'Get booking by ID',
          description: 'Retrieve detailed information about a specific booking',
          tags: ['Bookings'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Booking ID'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Booking' }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Booking not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/itineraries/{booking_id}': {
        get: {
          summary: 'Get itinerary for booking',
          description: 'Retrieve the detailed itinerary including stops, times, and winery information',
          tags: ['Itineraries'],
          parameters: [
            {
              name: 'booking_id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Booking ID'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Itinerary' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/proposals': {
        post: {
          summary: 'Create a custom proposal',
          description: 'Generate a custom wine tour proposal based on preferences',
          tags: ['Proposals'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateProposalRequest' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Proposal created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Proposal' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/wineries': {
        get: {
          summary: 'List wineries',
          description: 'Get a list of available wineries for tour planning',
          tags: ['Wineries'],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Winery' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/wineries/{slug}': {
        get: {
          summary: 'Get winery by slug',
          description: 'Retrieve detailed information about a specific winery by its URL slug',
          tags: ['Wineries'],
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'URL-friendly winery identifier (e.g., "lecole-no-41")'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Winery' }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Winery not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/restaurants': {
        get: {
          summary: 'List restaurants',
          description: 'Get all active restaurants in Walla Walla',
          tags: ['Restaurants'],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Restaurant' }
                      },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/events': {
        get: {
          summary: 'List events',
          description: 'Get published events in Walla Walla with filtering and pagination',
          tags: ['Events'],
          parameters: [
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by category slug'
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string', maxLength: 200 },
              description: 'Search events by title or description'
            },
            {
              name: 'startDate',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter events starting on or after this date (YYYY-MM-DD)'
            },
            {
              name: 'endDate',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter events starting on or before this date (YYYY-MM-DD)'
            },
            {
              name: 'isFree',
              in: 'query',
              schema: { type: 'boolean' },
              description: 'Filter by free events only'
            },
            {
              name: 'isFeatured',
              in: 'query',
              schema: { type: 'boolean' },
              description: 'Filter by featured events only'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
              description: 'Number of results per page'
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0, minimum: 0 },
              description: 'Number of results to skip'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Event' }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          limit: { type: 'integer' },
                          offset: { type: 'integer' },
                          hasMore: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/shared-tours': {
        get: {
          summary: 'List shared wine tours',
          description: 'Get upcoming shared/group wine tours with availability. Shared tours run Sunday-Wednesday and allow individual guests to join at per-person pricing.',
          tags: ['Shared Tours'],
          parameters: [
            {
              name: 'start_date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter tours starting on or after this date (YYYY-MM-DD)'
            },
            {
              name: 'end_date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter tours starting on or before this date (YYYY-MM-DD)'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/SharedTour' }
                      },
                      count: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/announcements': {
        get: {
          summary: 'List active announcements',
          description: 'Get currently active announcements, optionally filtered by display position',
          tags: ['Announcements'],
          parameters: [
            {
              name: 'position',
              in: 'query',
              schema: { type: 'string', enum: ['top', 'homepage', 'booking'] },
              description: 'Filter by display position'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      announcements: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Announcement' }
                      },
                      count: { type: 'integer' }
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
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique booking identifier' },
            booking_number: { type: 'string', description: 'Human-readable booking reference' },
            customer_name: { type: 'string' },
            customer_email: { type: 'string', format: 'email' },
            customer_phone: { type: 'string' },
            tour_date: { type: 'string', format: 'date' },
            party_size: { type: 'integer', minimum: 1, maximum: 14 },
            tour_type: {
              type: 'string',
              enum: ['wine_tour', 'private_transportation', 'corporate', 'airport_transfer']
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'completed', 'cancelled']
            },
            total_price: { type: 'number', format: 'decimal' },
            pickup_location: { type: 'string' },
            dropoff_location: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        CreateBookingRequest: {
          type: 'object',
          required: ['customer_name', 'customer_email', 'tour_date', 'party_size'],
          properties: {
            customer_name: { type: 'string', minLength: 2 },
            customer_email: { type: 'string', format: 'email' },
            customer_phone: { type: 'string' },
            tour_date: { type: 'string', format: 'date' },
            party_size: { type: 'integer', minimum: 1, maximum: 14 },
            tour_type: { type: 'string', enum: ['wine_tour', 'private_transportation', 'corporate', 'airport_transfer'] },
            pickup_location: { type: 'string' },
            special_requests: { type: 'string' }
          }
        },
        Itinerary: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            booking_id: { type: 'integer' },
            pickup_location: { type: 'string' },
            pickup_time: { type: 'string', format: 'time' },
            dropoff_location: { type: 'string' },
            estimated_dropoff_time: { type: 'string', format: 'time' },
            stops: {
              type: 'array',
              items: { $ref: '#/components/schemas/ItineraryStop' }
            },
            driver_notes: { type: 'string' }
          }
        },
        ItineraryStop: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            winery_id: { type: 'integer' },
            winery: { $ref: '#/components/schemas/Winery' },
            stop_order: { type: 'integer' },
            arrival_time: { type: 'string', format: 'time' },
            departure_time: { type: 'string', format: 'time' },
            duration_minutes: { type: 'integer' },
            drive_time_to_next_minutes: { type: 'integer' },
            is_lunch_stop: { type: 'boolean' },
            special_notes: { type: 'string' }
          }
        },
        Winery: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            tasting_fee: { type: 'number', format: 'decimal' },
            average_visit_duration: { type: 'integer', description: 'Average visit duration in minutes' },
            specialties: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        Proposal: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            customer_name: { type: 'string' },
            customer_email: { type: 'string', format: 'email' },
            event_type: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'sent', 'accepted', 'declined'] },
            total_price: { type: 'number', format: 'decimal' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        CreateProposalRequest: {
          type: 'object',
          required: ['customer_name', 'customer_email', 'event_type', 'party_size'],
          properties: {
            customer_name: { type: 'string' },
            customer_email: { type: 'string', format: 'email' },
            event_type: { type: 'string' },
            party_size: { type: 'integer', minimum: 1 },
            preferred_date: { type: 'string', format: 'date' },
            budget_range: { type: 'string' },
            special_requests: { type: 'string' }
          }
        },
        Restaurant: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique restaurant identifier' },
            name: { type: 'string' },
            slug: { type: 'string', description: 'URL-friendly identifier' },
            description: { type: 'string' },
            cuisine_type: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            phone: { type: 'string' },
            website: { type: 'string', format: 'uri' },
            price_range: { type: 'string', description: 'Price indicator (e.g., $$, $$$)' },
            rating: { type: 'number', format: 'decimal' },
            image_url: { type: 'string', format: 'uri' },
            is_active: { type: 'boolean' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique event identifier' },
            title: { type: 'string' },
            slug: { type: 'string', description: 'URL-friendly identifier' },
            short_description: { type: 'string' },
            description: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            start_time: { type: 'string', format: 'time' },
            end_time: { type: 'string', format: 'time' },
            is_all_day: { type: 'boolean' },
            venue_name: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            is_free: { type: 'boolean' },
            price_min: { type: 'number', format: 'decimal' },
            price_max: { type: 'number', format: 'decimal' },
            ticket_url: { type: 'string', format: 'uri' },
            organizer_name: { type: 'string' },
            featured_image_url: { type: 'string', format: 'uri' },
            is_featured: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'cancelled', 'past', 'pending_review']
            },
            tags: { type: 'array', items: { type: 'string' } }
          }
        },
        SharedTour: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Unique tour identifier' },
            tour_date: { type: 'string', format: 'date' },
            start_time: { type: 'string', format: 'time' },
            duration_hours: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            meeting_location: { type: 'string' },
            wineries_preview: { type: 'array', items: { type: 'string' }, description: 'List of planned winery names' },
            max_guests: { type: 'integer' },
            min_guests: { type: 'integer' },
            base_price_per_person: { type: 'number', format: 'decimal', description: 'Tour-only price per person' },
            lunch_price_per_person: { type: 'number', format: 'decimal', description: 'Tour with lunch price per person' },
            status: {
              type: 'string',
              enum: ['open', 'full', 'confirmed', 'cancelled', 'completed']
            },
            tickets_sold: { type: 'integer' },
            spots_available: { type: 'integer' },
            minimum_met: { type: 'boolean', description: 'Whether minimum guest count has been reached' },
            accepting_bookings: { type: 'boolean' }
          }
        },
        Announcement: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique announcement identifier' },
            title: { type: 'string' },
            message: { type: 'string' },
            link_text: { type: 'string' },
            link_url: { type: 'string', format: 'uri' },
            type: { type: 'string', description: 'Announcement type (e.g., info, warning)' },
            position: {
              type: 'string',
              enum: ['top', 'homepage', 'booking'],
              description: 'Where the announcement is displayed'
            },
            background_color: { type: 'string', description: 'CSS color value for the announcement background' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        }
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  };
};

/** Internal interface for Zod array definition */
interface ZodArrayDefInternal {
  type: z.ZodTypeAny;
}

/** Internal interface for Zod object definition */
interface ZodObjectDefInternal {
  shape: () => Record<string, z.ZodTypeAny>;
}

/**
 * Convert Zod schema to OpenAPI schema
 * This allows us to use Zod for validation and automatically generate OpenAPI specs
 */
export const zodToOpenAPI = (schema: z.ZodTypeAny): OpenAPISchemaObject => {
  // Basic implementation - can be extended with @asteasolutions/zod-to-openapi
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  if (schema instanceof z.ZodArray) {
    const arrayDef = schema._def as unknown as ZodArrayDefInternal;
    return {
      type: 'array',
      items: zodToOpenAPI(arrayDef.type)
    };
  }
  if (schema instanceof z.ZodObject) {
    const objectDef = schema._def as unknown as ZodObjectDefInternal;
    const shape = objectDef.shape();
    const properties: Record<string, OpenAPISchemaObject> = {};
    for (const key in shape) {
      properties[key] = zodToOpenAPI(shape[key]);
    }
    return {
      type: 'object',
      properties
    };
  }
  return {}; // Fallback
};




