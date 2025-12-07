/**
 * Corporate Request to Proposal Converter
 * Converts AI-extracted itinerary data into proposal format
 */

import { query } from '@/lib/db';
import { ParsedItinerary } from './itinerary-parser';

export interface ConversionResult {
  proposalId: number;
  proposalNumber: string;
  serviceItems: any[];
  estimatedTotal: number;
  confidence: string;
  notes: string[];
}

/**
 * Convert corporate request to proposal
 */
export async function convertCorporateRequestToProposal(
  requestId: number
): Promise<ConversionResult> {
  // Get the corporate request
  const requestResult = await query(
    'SELECT * FROM corporate_requests WHERE id = $1',
    [requestId]
  );
  
  if (requestResult.rows.length === 0) {
    throw new Error(`Corporate request ${requestId} not found`);
  }
  
  const request = requestResult.rows[0];
  const aiData: ParsedItinerary = request.ai_extracted_data;
  
  // Generate proposal number
  const proposalNumber = `PROP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  
  // Build service items from AI data
  const serviceItems: any[] = [];
  const notes: string[] = [];
  let estimatedTotal = 0;
  
  // Determine primary date
  let primaryDate = new Date();
  if (aiData?.dates && aiData.dates.length > 0) {
    primaryDate = new Date(aiData.dates[0]);
  } else if (request.preferred_dates && request.preferred_dates.length > 0) {
    primaryDate = new Date(request.preferred_dates[0]);
  }
  
  // Add wine tour service if destinations include wineries
  const wineries = aiData?.destinations?.filter(d => d.type === 'winery') || [];
  if (wineries.length > 0 || request.event_type.includes('wine')) {
    const estimatedHours = aiData?.destinations?.length 
      ? Math.max(4, Math.min(8, wineries.length * 1.5)) 
      : 6; // Default 6 hours
    
    serviceItems.push({
      service_type: 'wine_tour',
      name: 'Private Wine Tour',
      description: `Visit ${wineries.length || '3-4'} wineries in Walla Walla Valley`,
      date: primaryDate.toISOString().split('T')[0],
      party_size: request.party_size || 10,
      duration_hours: estimatedHours,
      selected_wineries: wineries.map(w => w.name),
      pricing_type: 'calculated',
      calculated_price: 0 // Will be calculated by proposal system
    });
    
    notes.push(`AI detected ${wineries.length} wineries from itinerary`);
    notes.push(`Estimated ${estimatedHours} hours based on destinations`);
  }
  
  // Add transfers if pickup/dropoff locations mentioned
  if (aiData?.transportation?.pickupLocation || aiData?.transportation?.dropoffLocation) {
    const pickup = aiData.transportation.pickupLocation || 'TBD';
    const dropoff = aiData.transportation.dropoffLocation || 'TBD';
    
    // Determine transfer type
    let transferType = 'local_transfer';
    if (pickup.toLowerCase().includes('seatac') || pickup.toLowerCase().includes('seattle')) {
      transferType = 'airport_transfer';
    }
    
    serviceItems.push({
      service_type: transferType,
      name: 'Transportation',
      description: `${pickup} to ${dropoff}`,
      date: primaryDate.toISOString().split('T')[0],
      party_size: request.party_size,
      pickup_location: pickup,
      dropoff_location: dropoff,
      transfer_type: transferType === 'airport_transfer' ? 'seatac' : undefined,
      pricing_type: 'flat',
      calculated_price: 0
    });
    
    notes.push(`Transportation: ${pickup} → ${dropoff}`);
  }
  
  // Add meals if mentioned
  const meals = aiData?.meals || [];
  if (meals.length > 0) {
    meals.forEach(meal => {
      notes.push(`Meal: ${meal.type} at ${meal.location || 'TBD'}`);
      if (meal.notes) {
        notes.push(`  - ${meal.notes}`);
      }
    });
  }
  
  // Add special requirements
  if (aiData?.specialRequirements && aiData.specialRequirements.length > 0) {
    notes.push('Special Requirements:');
    aiData.specialRequirements.forEach(req => {
      notes.push(`  - ${req}`);
    });
  }
  
  if (request.special_requirements) {
    notes.push('Customer Notes:');
    notes.push(`  ${request.special_requirements}`);
  }
  
  // Determine confidence level
  let confidence = 'low';
  if (aiData && request.ai_confidence_score >= 0.8) {
    confidence = 'high';
  } else if (aiData && request.ai_confidence_score >= 0.5) {
    confidence = 'medium';
  }
  
  // Create proposal in database
  const proposalResult = await query(`
    INSERT INTO proposals (
      proposal_number,
      customer_name,
      customer_email,
      customer_phone,
      party_size,
      tour_date,
      status,
      service_items,
      notes,
      created_from_corporate_request,
      corporate_request_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, proposal_number
  `, [
    proposalNumber,
    request.contact_name,
    request.contact_email,
    request.contact_phone,
    request.party_size,
    primaryDate,
    'draft',
    JSON.stringify(serviceItems),
    notes.join('\n'),
    true,
    requestId
  ]);
  
  const proposal = proposalResult.rows[0];
  
  // Update corporate request status
  await query(`
    UPDATE corporate_requests
    SET status = 'converted', proposal_id = $1, converted_to_proposal_at = NOW()
    WHERE id = $2
  `, [proposal.id, requestId]);
  
  return {
    proposalId: proposal.id,
    proposalNumber: proposal.proposal_number,
    serviceItems,
    estimatedTotal,
    confidence,
    notes
  };
}

/**
 * Check if proposals table has the needed columns
 */
export async function ensureProposalColumns(): Promise<void> {
  try {
    // Check if columns exist
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'proposals' 
        AND column_name IN ('created_from_corporate_request', 'corporate_request_id')
    `);
    
    const existingColumns = checkResult.rows.map(r => r.column_name);
    
    // Add missing columns
    if (!existingColumns.includes('created_from_corporate_request')) {
      await query(`
        ALTER TABLE proposals 
        ADD COLUMN IF NOT EXISTS created_from_corporate_request BOOLEAN DEFAULT FALSE
      `);
    }
    
    if (!existingColumns.includes('corporate_request_id')) {
      await query(`
        ALTER TABLE proposals 
        ADD COLUMN IF NOT EXISTS corporate_request_id INTEGER REFERENCES corporate_requests(id)
      `);
    }
  } catch (error) {
    console.error('[Proposal Converter] Error ensuring columns:', error);
    // Continue anyway - columns might already exist
  }
}

