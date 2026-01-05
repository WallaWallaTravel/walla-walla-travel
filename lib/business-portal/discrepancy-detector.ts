/**
 * Discrepancy Detector
 * Finds conflicts, missing info, and inconsistencies in business submissions
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface Discrepancy {
  id: string;
  business_id: number;
  type: 'conflict' | 'missing' | 'vague' | 'inconsistent' | 'needs_verification';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  sources: Array<{
    type: 'voice' | 'text' | 'file';
    id: number;
    content: string;
  }>;
  suggestedResolution: string;
  draftMessage?: string;
}

/**
 * Detect all discrepancies for a business
 */
export async function detectDiscrepancies(businessId: number): Promise<Discrepancy[]> {
  logger.debug('Discrepancy Detector: Analyzing business', { businessId });

  const discrepancies: Discrepancy[] = [];

  // Get all data for the business
  const data = await getBusinessData(businessId);

  // Run all detection checks
  discrepancies.push(...detectConflicts(data));
  discrepancies.push(...detectMissingInfo(data));
  discrepancies.push(...detectVagueResponses(data));
  discrepancies.push(...detectInconsistencies(data));

  logger.debug('Discrepancy Detector: Found discrepancies', { count: discrepancies.length });

  return discrepancies;
}

interface VoiceEntry {
  id: number;
  question_id: number;
  question_number: number;
  question_text: string;
  transcription?: string;
  extracted_data?: Record<string, unknown>;
}

interface TextEntryData {
  id: number;
  question_id: number;
  question_number: number;
  question_text: string;
  response_text?: string;
  extracted_data?: Record<string, unknown>;
}

interface FileData {
  id: number;
  file_type: string;
  original_filename: string;
  ai_description?: string;
  ai_tags?: string[];
  category?: string;
}

interface BusinessData {
  business_id: number;
  business_name: string;
  voiceEntries: VoiceEntry[];
  textEntries: TextEntryData[];
  files: FileData[];
  extractedData: Map<string, Record<string, unknown>[]>; // category -> extracted data
}

/**
 * Get all business data for analysis
 */
async function getBusinessData(businessId: number): Promise<BusinessData> {
  // Get business info
  const businessResult = await query(
    'SELECT id, name FROM businesses WHERE id = $1',
    [businessId]
  );

  // Get voice entries
  const voiceResult = await query(`
    SELECT id, question_id, question_number, question_text, transcription, extracted_data
    FROM business_voice_entries
    WHERE business_id = $1 AND transcription IS NOT NULL
    ORDER BY question_number
  `, [businessId]);

  // Get text entries
  const textResult = await query(`
    SELECT id, question_id, question_number, question_text, response_text, extracted_data
    FROM business_text_entries
    WHERE business_id = $1
    ORDER BY question_number
  `, [businessId]);

  // Get files
  const filesResult = await query(`
    SELECT id, file_type, original_filename, ai_description, ai_tags, category
    FROM business_files
    WHERE business_id = $1
  `, [businessId]);

  // Organize extracted data by category
  const extractedData = new Map<string, Record<string, unknown>[]>();
  
  [...voiceResult.rows, ...textResult.rows].forEach(entry => {
    if (entry.extracted_data) {
      const category = entry.question_text || 'general';
      if (!extractedData.has(category)) {
        extractedData.set(category, []);
      }
      extractedData.get(category)!.push(entry.extracted_data);
    }
  });

  return {
    business_id: businessId,
    business_name: businessResult.rows[0]?.name || 'Unknown',
    voiceEntries: voiceResult.rows,
    textEntries: textResult.rows,
    files: filesResult.rows,
    extractedData
  };
}

/**
 * Detect conflicting information
 */
function detectConflicts(data: BusinessData): Discrepancy[] {
  const conflicts: Discrepancy[] = [];

  // Check for capacity conflicts
  const capacityMentions: Array<{ source: VoiceEntry | TextEntryData; value: number; text: string }> = [];
  
  [...data.voiceEntries, ...data.textEntries].forEach(entry => {
    const text = ('transcription' in entry ? entry.transcription : undefined) ||
                 ('response_text' in entry ? entry.response_text : undefined) || '';
    const capacityMatch = text.match(/(\d+)\s*(people|guests|person)/i);
    
    if (capacityMatch) {
      capacityMentions.push({
        source: entry,
        value: parseInt(capacityMatch[1]),
        text: text.substring(0, 200)
      });
    }
  });

  // If we have multiple different capacity values, flag it
  if (capacityMentions.length > 1) {
    const uniqueValues = [...new Set(capacityMentions.map(m => m.value))];
    if (uniqueValues.length > 1) {
      conflicts.push({
        id: `conflict-capacity-${data.business_id}`,
        business_id: data.business_id,
        type: 'conflict',
        severity: 'high',
        title: 'Conflicting capacity information',
        description: `Found ${uniqueValues.length} different capacity values: ${uniqueValues.join(', ')}`,
        sources: capacityMentions.map(m => ({
          type: ('transcription' in m.source) ? 'voice' as const : 'text' as const,
          id: m.source.id,
          content: `"${m.text.substring(0, 100)}..."`
        })),
        suggestedResolution: 'Clarify maximum capacity for different types of visits (standard tasting vs. private events)',
        draftMessage: generateConflictMessage(data.business_name, 'capacity', capacityMentions)
      });
    }
  }

  // Check for pricing conflicts
  const priceMentions: Array<{ source: VoiceEntry | TextEntryData; value: number; text: string }> = [];
  
  [...data.voiceEntries, ...data.textEntries].forEach(entry => {
    const text = ('transcription' in entry ? entry.transcription : undefined) ||
                 ('response_text' in entry ? entry.response_text : undefined) || '';
    const priceMatch = text.match(/\$(\d+)/g);
    
    if (priceMatch) {
      priceMatch.forEach((match: string) => {
        const value = parseInt(match.replace('$', ''));
        if (value > 10 && value < 200) { // Likely tasting fees
          priceMentions.push({
            source: entry,
            value,
            text: text.substring(0, 200)
          });
        }
      });
    }
  });

  if (priceMentions.length > 1) {
    const uniquePrices = [...new Set(priceMentions.map(m => m.value))];
    if (uniquePrices.length > 1) {
      conflicts.push({
        id: `conflict-pricing-${data.business_id}`,
        business_id: data.business_id,
        type: 'conflict',
        severity: 'high',
        title: 'Multiple pricing values mentioned',
        description: `Found different prices: $${uniquePrices.join(', $')}`,
        sources: priceMentions.map(m => ({
          type: ('transcription' in m.source) ? 'voice' as const : 'text' as const,
          id: m.source.id,
          content: `"${m.text.substring(0, 100)}..."`
        })),
        suggestedResolution: 'Confirm current tasting fee and any tier options',
        draftMessage: generateConflictMessage(data.business_name, 'pricing', priceMentions)
      });
    }
  }

  return conflicts;
}

/**
 * Detect missing information
 */
function detectMissingInfo(data: BusinessData): Discrepancy[] {
  const missing: Discrepancy[] = [];

  // Check if outdoor seating is mentioned but no outdoor photos
  const hasOutdoorMention = [...data.voiceEntries, ...data.textEntries].some(entry => {
    const text = (('transcription' in entry ? entry.transcription : undefined) ||
                 ('response_text' in entry ? entry.response_text : undefined) || '').toLowerCase();
    return text.includes('outdoor') || text.includes('patio') || text.includes('deck');
  });

  const hasOutdoorPhotos = data.files.some(file => {
    const tags = file.ai_tags || [];
    return tags.some((tag: string) => tag.toLowerCase().includes('outdoor'));
  });

  if (hasOutdoorMention && !hasOutdoorPhotos) {
    missing.push({
      id: `missing-outdoor-photos-${data.business_id}`,
      business_id: data.business_id,
      type: 'missing',
      severity: 'medium',
      title: 'Missing outdoor area photos',
      description: 'Outdoor seating/patio mentioned but no photos uploaded',
      sources: [],
      suggestedResolution: 'Request photos of outdoor areas',
      draftMessage: `Hi! You mentioned outdoor seating in your responses. Could you upload a few photos of your outdoor areas? This really helps visitors visualize the space. Thanks!`
    });
  }

  // Check for missing files entirely
  if (data.files.length === 0) {
    missing.push({
      id: `missing-all-files-${data.business_id}`,
      business_id: data.business_id,
      type: 'missing',
      severity: 'low',
      title: 'No files uploaded',
      description: 'No photos or documents have been uploaded',
      sources: [],
      suggestedResolution: 'Request venue photos, menu, or wine list',
      draftMessage: `Hi! Your answers look great. Would you be able to upload a few photos of your venue and perhaps your current menu or wine list? Visual content really helps visitors get excited about visiting. Thanks!`
    });
  }

  return missing;
}

/**
 * Detect vague or incomplete responses
 */
function detectVagueResponses(data: BusinessData): Discrepancy[] {
  const vague: Discrepancy[] = [];

  const vaguePatterns = [
    /we'?re open most days/i,
    /varies/i,
    /it depends/i,
    /usually/i,
    /sometimes/i
  ];

  [...data.voiceEntries, ...data.textEntries].forEach(entry => {
    const text = ('transcription' in entry ? entry.transcription : undefined) ||
                 ('response_text' in entry ? entry.response_text : undefined) || '';
    
    vaguePatterns.forEach(pattern => {
      if (pattern.test(text)) {
        vague.push({
          id: `vague-q${entry.question_number}-${data.business_id}`,
          business_id: data.business_id,
          type: 'vague',
          severity: 'low',
          title: `Question ${entry.question_number}: Vague response`,
          description: `Response contains vague language that could be more specific`,
          sources: [{
            type: ('transcription' in entry) ? 'voice' as const : 'text' as const,
            id: entry.id,
            content: text.substring(0, 150)
          }],
          suggestedResolution: 'Request more specific details',
          draftMessage: `Hi! For question ${entry.question_number}, could you provide more specific details? For example, exact hours or specific policies help visitors plan better. Thanks!`
        });
      }
    });
  });

  return vague;
}

/**
 * Detect other inconsistencies
 */
function detectInconsistencies(_data: BusinessData): Discrepancy[] {
  const inconsistencies: Discrepancy[] = [];

  // Add more sophisticated checks here
  // E.g., check if "reservations required" but no booking info provided

  return inconsistencies;
}

/**
 * Generate a draft message for conflicts
 */
function generateConflictMessage(
  businessName: string,
  conflictType: string,
  mentions: Array<{ source: VoiceEntry | TextEntryData; value: number; text: string }>
): string {
  return `Hi!

Thank you for completing your ${businessName} profile. We're excited to feature you!

We noticed a small discrepancy regarding ${conflictType}:

${mentions.map((m) => `• In question ${m.source.question_number}, you mentioned: ${m.value}`).join('\n')}

Could you clarify which is correct, or if there are different ${conflictType} options for different situations?

You can reply to this email or update your portal directly.

Thanks!
Ryan
Walla Walla Travel`;
}

/**
 * Save discrepancies to database for review
 */
export async function saveDiscrepancies(discrepancies: Discrepancy[]): Promise<void> {
  for (const discrepancy of discrepancies) {
    await query(`
      INSERT INTO business_discrepancies (
        business_id,
        discrepancy_id,
        type,
        severity,
        title,
        description,
        sources,
        suggested_resolution,
        draft_message,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
      ON CONFLICT (discrepancy_id) DO UPDATE
      SET 
        description = $6,
        sources = $7,
        updated_at = NOW()
    `, [
      discrepancy.business_id,
      discrepancy.id,
      discrepancy.type,
      discrepancy.severity,
      discrepancy.title,
      discrepancy.description,
      JSON.stringify(discrepancy.sources),
      discrepancy.suggestedResolution,
      discrepancy.draftMessage
    ]);
  }
}

