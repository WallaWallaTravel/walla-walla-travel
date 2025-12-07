/**
 * OpenAPI/Swagger Specification Endpoint
 * 
 * This endpoint serves the OpenAPI 3.0 specification for our API.
 * Can be used with:
 * - Swagger UI: https://swagger.io/tools/swagger-ui/
 * - OpenAI GPT Actions: Custom GPTs can import this spec
 * - API client generators: Generate clients in any language
 * 
 * Access at: /api/openapi
 * View docs at: /api-docs (if Swagger UI is set up)
 */

import { NextResponse } from 'next/server';
import { generateOpenAPISpec } from '@/lib/api/openapi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const spec = generateOpenAPISpec();
  
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}




