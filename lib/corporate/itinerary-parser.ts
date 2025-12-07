/**
 * AI Itinerary Parser
 * Extracts structured data from uploaded itinerary documents/photos
 * Uses GPT-4o Vision for images, GPT-4o for text documents
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedItinerary {
  // Event details
  eventType?: string;
  companyName?: string;
  dates?: string[];
  partySize?: number;
  
  // Itinerary items
  destinations?: Array<{
    name: string;
    type: 'winery' | 'restaurant' | 'hotel' | 'activity' | 'other';
    time?: string;
    duration?: string;
    notes?: string;
  }>;
  
  // Requirements
  transportation?: {
    pickupLocation?: string;
    dropoffLocation?: string;
    vehicleType?: string;
  };
  
  meals?: Array<{
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    location?: string;
    notes?: string;
  }>;
  
  specialRequirements?: string[];
  budget?: {
    total?: number;
    perPerson?: number;
    range?: string;
  };
  
  // Metadata
  rawText?: string;
  confidence: number;
  notes?: string;
}

/**
 * Parse itinerary from image (photo of document, screenshot, etc.)
 */
export async function parseItineraryFromImage(
  base64Image: string,
  mimeType: string
): Promise<ParsedItinerary> {
  const prompt = `Analyze this itinerary document for a wine country tour/corporate event.

Extract the following information in JSON format:
{
  "eventType": "corporate event | team building | wine tour | celebration | other",
  "companyName": "company name if mentioned",
  "dates": ["YYYY-MM-DD"], // array of dates mentioned
  "partySize": number, // total number of people
  "destinations": [
    {
      "name": "destination name",
      "type": "winery | restaurant | hotel | activity | other",
      "time": "HH:MM AM/PM if mentioned",
      "duration": "duration if mentioned",
      "notes": "any specific notes"
    }
  ],
  "transportation": {
    "pickupLocation": "where to pick up",
    "dropoffLocation": "where to drop off",
    "vehicleType": "type of vehicle if mentioned"
  },
  "meals": [
    {
      "type": "breakfast | lunch | dinner | snack",
      "location": "where",
      "notes": "dietary restrictions, preferences"
    }
  ],
  "specialRequirements": ["list any special needs, accessibility, etc."],
  "budget": {
    "total": number or null,
    "perPerson": number or null,
    "range": "budget range if mentioned as text"
  },
  "confidence": 0.0-1.0, // how confident you are in the extraction
  "notes": "any important details or ambiguities"
}

Be thorough but conservative. If something isn't clear, note it in the notes field.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("GPT-4o Vision did not return content.");
  }

  return JSON.parse(content);
}

/**
 * Parse itinerary from text document (PDF converted to text, plain text, etc.)
 */
export async function parseItineraryFromText(
  text: string
): Promise<ParsedItinerary> {
  const prompt = `Analyze this itinerary text for a wine country tour/corporate event.

Extract the following information in JSON format:
{
  "eventType": "corporate event | team building | wine tour | celebration | other",
  "companyName": "company name if mentioned",
  "dates": ["YYYY-MM-DD"], // array of dates mentioned
  "partySize": number, // total number of people
  "destinations": [
    {
      "name": "destination name",
      "type": "winery | restaurant | hotel | activity | other",
      "time": "HH:MM AM/PM if mentioned",
      "duration": "duration if mentioned",
      "notes": "any specific notes"
    }
  ],
  "transportation": {
    "pickupLocation": "where to pick up",
    "dropoffLocation": "where to drop off",
    "vehicleType": "type of vehicle if mentioned"
  },
  "meals": [
    {
      "type": "breakfast | lunch | dinner | snack",
      "location": "where",
      "notes": "dietary restrictions, preferences"
    }
  ],
  "specialRequirements": ["list any special needs, accessibility, etc."],
  "budget": {
    "total": number or null,
    "perPerson": number or null,
    "range": "budget range if mentioned as text"
  },
  "confidence": 0.0-1.0, // how confident you are in the extraction
  "notes": "any important details or ambiguities"
}

Itinerary text:
${text}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("GPT-4o did not return content.");
  }

  const parsed = JSON.parse(content);
  parsed.rawText = text;
  
  return parsed;
}

/**
 * Determine best parser based on file type
 */
export async function parseItineraryFile(
  fileDataUrl: string,
  mimeType: string,
  originalFilename: string
): Promise<ParsedItinerary> {
  // Image files - use Vision
  if (mimeType.startsWith('image/')) {
    const base64Data = fileDataUrl.split(',')[1];
    return await parseItineraryFromImage(base64Data, mimeType);
  }
  
  // PDF files - would need PDF parsing library
  // For now, return placeholder
  if (mimeType === 'application/pdf') {
    return {
      confidence: 0,
      notes: 'PDF parsing not yet implemented. Please upload as image or text.'
    };
  }
  
  // Text files
  if (mimeType.startsWith('text/')) {
    // Extract text from data URL
    const base64Data = fileDataUrl.split(',')[1];
    const text = Buffer.from(base64Data, 'base64').toString('utf-8');
    return await parseItineraryFromText(text);
  }
  
  return {
    confidence: 0,
    notes: `Unsupported file type: ${mimeType}. Please upload image, text, or PDF.`
  };
}

