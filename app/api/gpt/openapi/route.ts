/**
 * OpenAPI Specification Endpoint for GPT Store / ChatGPT Actions
 *
 * This endpoint serves the OpenAPI 3.0 spec that ChatGPT uses to understand
 * the available API operations and their parameters.
 */

import { NextResponse } from 'next/server';

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Walla Walla Wine Tours API',
    description: `API for exploring and booking premium wine tours in the Walla Walla Valley, Washington.

This API allows you to:
- Search for wineries by name, style, or specialties
- Check tour availability for specific dates
- Get personalized winery recommendations
- Look up booking status
- Create booking inquiries

Walla Walla is one of the premier wine regions in the Pacific Northwest, known for exceptional Cabernet Sauvignon, Syrah, and Merlot.`,
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
    '/search-wineries': {
      get: {
        operationId: 'searchWineries',
        summary: 'Search for wineries',
        description: 'Search for wineries in Walla Walla Valley by name, wine style, or features. Returns a list of matching wineries with details about their wines, tasting fees, and visit information.',
        parameters: [
          {
            name: 'query',
            in: 'query',
            required: false,
            description: 'Search text - can be winery name, wine type (e.g., "Cabernet", "Syrah"), or feature (e.g., "outdoor seating", "dog friendly")',
            schema: { type: 'string' }
          },
          {
            name: 'style',
            in: 'query',
            required: false,
            description: 'Wine style preference',
            schema: {
              type: 'string',
              enum: ['red', 'white', 'mixed', 'sparkling']
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
            description: 'List of matching wineries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', description: 'Human-friendly summary of results' },
                    wineries: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Winery' }
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
    '/check-availability': {
      get: {
        operationId: 'checkAvailability',
        summary: 'Check tour availability',
        description: 'Check if wine tours are available on a specific date for a given party size. Returns available tour types and pricing.',
        parameters: [
          {
            name: 'date',
            in: 'query',
            required: true,
            description: 'Desired tour date in YYYY-MM-DD format',
            schema: { type: 'string', format: 'date' }
          },
          {
            name: 'party_size',
            in: 'query',
            required: true,
            description: 'Number of guests (1-14)',
            schema: { type: 'integer', minimum: 1, maximum: 14 }
          }
        ],
        responses: {
          '200': {
            description: 'Availability information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', description: 'Human-friendly availability summary' },
                    date: { type: 'string', format: 'date' },
                    party_size: { type: 'integer' },
                    available: { type: 'boolean' },
                    tour_options: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TourOption' }
                    },
                    next_available_date: {
                      type: 'string',
                      format: 'date',
                      description: 'If requested date is unavailable, the next available date'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/get-recommendations': {
      post: {
        operationId: 'getRecommendations',
        summary: 'Get personalized winery recommendations',
        description: 'Get personalized winery recommendations based on preferences like wine style, atmosphere, group size, and special interests.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  preferences: {
                    type: 'object',
                    properties: {
                      wine_styles: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Preferred wine styles (e.g., "bold red", "light white", "Cabernet")'
                      },
                      atmosphere: {
                        type: 'string',
                        enum: ['intimate', 'lively', 'rustic', 'modern', 'any'],
                        description: 'Preferred winery atmosphere'
                      },
                      features: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Desired features (e.g., "food pairing", "outdoor seating", "dog friendly", "views")'
                      },
                      price_range: {
                        type: 'string',
                        enum: ['budget', 'moderate', 'premium', 'luxury'],
                        description: 'Budget for tasting fees'
                      }
                    }
                  },
                  party_size: { type: 'integer', minimum: 1, maximum: 14 },
                  tour_date: { type: 'string', format: 'date' },
                  number_of_stops: {
                    type: 'integer',
                    minimum: 2,
                    maximum: 5,
                    description: 'How many wineries to visit'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Personalized recommendations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', description: 'Personalized recommendation summary' },
                    recommendations: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WineryRecommendation' }
                    },
                    suggested_itinerary: {
                      type: 'object',
                      properties: {
                        total_duration_hours: { type: 'number' },
                        estimated_cost_per_person: { type: 'number' },
                        stops: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              order: { type: 'integer' },
                              winery_name: { type: 'string' },
                              arrival_time: { type: 'string' },
                              duration_minutes: { type: 'integer' }
                            }
                          }
                        }
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
    '/booking-status': {
      get: {
        operationId: 'getBookingStatus',
        summary: 'Get booking status',
        description: 'Look up the status of an existing booking by booking number or customer email.',
        parameters: [
          {
            name: 'booking_number',
            in: 'query',
            required: false,
            description: 'Booking confirmation number (e.g., WWT-2024-001234)',
            schema: { type: 'string' }
          },
          {
            name: 'email',
            in: 'query',
            required: false,
            description: 'Customer email address used for the booking',
            schema: { type: 'string', format: 'email' }
          }
        ],
        responses: {
          '200': {
            description: 'Booking status information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', description: 'Human-friendly booking summary' },
                    booking: { $ref: '#/components/schemas/BookingStatus' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Booking not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', default: false },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/create-inquiry': {
      post: {
        operationId: 'createInquiry',
        summary: 'Create a booking inquiry',
        description: 'Submit a booking inquiry to request a wine tour. The Walla Walla Travel team will follow up with availability and pricing details.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'tour_date', 'party_size'],
                properties: {
                  name: { type: 'string', description: 'Guest name' },
                  email: { type: 'string', format: 'email', description: 'Contact email' },
                  phone: { type: 'string', description: 'Contact phone (optional)' },
                  tour_date: { type: 'string', format: 'date', description: 'Preferred tour date' },
                  party_size: { type: 'integer', minimum: 1, maximum: 14 },
                  tour_type: {
                    type: 'string',
                    enum: ['wine_tour', 'private_transportation', 'corporate', 'bachelorette'],
                    description: 'Type of tour requested'
                  },
                  preferences: { type: 'string', description: 'Any special requests or preferences' },
                  pickup_location: { type: 'string', description: 'Where to be picked up' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Inquiry created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', description: 'Confirmation message' },
                    inquiry_id: { type: 'string' },
                    estimated_response_time: { type: 'string' }
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
      Winery: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string', default: 'Walla Walla' },
          tasting_fee: { type: 'number', description: 'Tasting fee per person in USD' },
          average_visit_duration: { type: 'integer', description: 'Typical visit duration in minutes' },
          specialties: {
            type: 'array',
            items: { type: 'string' },
            description: 'Wine varieties they specialize in'
          },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available amenities and features'
          },
          reservation_required: { type: 'boolean' },
          website: { type: 'string', format: 'uri' }
        }
      },
      TourOption: {
        type: 'object',
        properties: {
          tour_type: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          duration_hours: { type: 'number' },
          price_per_person: { type: 'number' },
          total_price: { type: 'number' },
          includes: {
            type: 'array',
            items: { type: 'string' }
          },
          available_times: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      WineryRecommendation: {
        type: 'object',
        properties: {
          winery: { $ref: '#/components/schemas/Winery' },
          match_score: { type: 'integer', minimum: 0, maximum: 100 },
          match_reasons: {
            type: 'array',
            items: { type: 'string' },
            description: 'Why this winery matches their preferences'
          }
        }
      },
      BookingStatus: {
        type: 'object',
        properties: {
          booking_number: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'completed', 'cancelled']
          },
          tour_date: { type: 'string', format: 'date' },
          tour_time: { type: 'string' },
          party_size: { type: 'integer' },
          pickup_location: { type: 'string' },
          wineries: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names of wineries on the itinerary'
          },
          driver_name: { type: 'string' },
          driver_phone: { type: 'string' },
          total_paid: { type: 'number' },
          balance_due: { type: 'number' }
        }
      }
    }
  }
};

export async function GET() {
  return NextResponse.json(OPENAPI_SPEC, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

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
