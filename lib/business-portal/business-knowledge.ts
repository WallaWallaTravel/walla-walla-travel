/**
 * Business Knowledge Base Service
 * Aggregates all business data for AI Travel Guide queries
 */

import { query } from '@/lib/db';

export interface BusinessKnowledge {
  id: number;
  name: string;
  business_type: string;
  contact_email: string;
  status: 'approved' | 'pending' | 'draft';
  
  // Aggregated data
  structured_data: any; // Extracted from answers
  photos: Array<{
    id: number;
    url: string;
    description: string;
    tags: string[];
    category: string;
    quality_rating: string;
    detected_elements: any;
  }>;
  
  insights: Array<{
    id: number;
    type: string;
    title: string;
    content: string;
    priority: number;
    best_for: string[];
    is_public: boolean;
  }>;
  
  // Search metadata
  all_tags: string[];
  best_for: string[];
  amenities: string[];
  features: string[];
}

/**
 * Get full knowledge base for a business
 */
export async function getBusinessKnowledge(businessId: number): Promise<BusinessKnowledge | null> {
  // Get business
  const bizResult = await query(
    `SELECT id, name, business_type, contact_email, status 
     FROM businesses WHERE id = $1 AND status = 'approved'`,
    [businessId]
  );
  
  if (bizResult.rows.length === 0) return null;
  const business = bizResult.rows[0];
  
  // Get photos with AI analysis
  const photosResult = await query(
    `SELECT id, storage_url, ai_description, ai_tags, category, 
            quality_rating, detected_elements, suitable_for_directory
     FROM business_files 
     WHERE business_id = $1 
       AND file_type = 'photo' 
       AND approved = true
       AND suitable_for_directory = true
     ORDER BY quality_rating DESC`,
    [businessId]
  );
  
  const photos = photosResult.rows.map(row => ({
    id: row.id,
    url: row.storage_url,
    description: row.ai_description || '',
    tags: row.ai_tags || [],
    category: row.category || 'general',
    quality_rating: row.quality_rating || 'good',
    detected_elements: row.detected_elements || {}
  }));
  
  // Get insights
  const insightsResult = await query(
    `SELECT id, insight_type, title, content, priority, best_for, is_public
     FROM business_insights
     WHERE business_id = $1 AND is_public = true
     ORDER BY priority DESC`,
    [businessId]
  );
  
  const insights = insightsResult.rows.map(row => ({
    id: row.id,
    type: row.insight_type,
    title: row.title,
    content: row.content,
    priority: row.priority,
    best_for: row.best_for || [],
    is_public: row.is_public
  }));
  
  // Get structured data from answers
  const answersResult = await query(
    `SELECT extracted_data FROM business_voice_entries 
     WHERE business_id = $1 AND extracted_data IS NOT NULL
     UNION ALL
     SELECT extracted_data FROM business_text_entries 
     WHERE business_id = $1 AND extracted_data IS NOT NULL`,
    [businessId, businessId]
  );
  
  // Merge all extracted data
  const structured_data: any = {};
  answersResult.rows.forEach(row => {
    if (row.extracted_data) {
      Object.assign(structured_data, row.extracted_data);
    }
  });
  
  // Build search metadata
  const all_tags = new Set<string>();
  const best_for = new Set<string>();
  const amenities = new Set<string>();
  const features = new Set<string>();
  
  // From photos
  photos.forEach(photo => {
    photo.tags.forEach((tag: string) => all_tags.add(tag.toLowerCase()));
    if (photo.detected_elements?.venue) {
      photo.detected_elements.venue.forEach((v: string) => amenities.add(v.toLowerCase()));
    }
    if (photo.detected_elements?.features) {
      photo.detected_elements.features.forEach((f: string) => features.add(f.toLowerCase()));
    }
  });
  
  // From insights
  insights.forEach(insight => {
    insight.best_for.forEach((bf: string) => best_for.add(bf.toLowerCase()));
  });
  
  // From structured data
  if (structured_data.amenities) {
    Object.keys(structured_data.amenities).forEach(a => {
      if (structured_data.amenities[a]) amenities.add(a.toLowerCase());
    });
  }
  
  return {
    id: business.id,
    name: business.name,
    business_type: business.business_type,
    contact_email: business.contact_email,
    status: business.status,
    structured_data,
    photos,
    insights,
    all_tags: Array.from(all_tags),
    best_for: Array.from(best_for),
    amenities: Array.from(amenities),
    features: Array.from(features)
  };
}

/**
 * Search businesses by criteria
 */
export async function searchBusinesses(criteria: {
  business_type?: string;
  tags?: string[];
  amenities?: string[];
  best_for?: string[];
  query?: string;
}): Promise<BusinessKnowledge[]> {
  // Get all approved businesses
  const bizResult = await query(
    `SELECT id FROM businesses WHERE status = 'approved'`
  );
  
  const businesses: BusinessKnowledge[] = [];
  
  for (const row of bizResult.rows) {
    const knowledge = await getBusinessKnowledge(row.id);
    if (!knowledge) continue;
    
    // Filter by business type
    if (criteria.business_type && knowledge.business_type !== criteria.business_type) {
      continue;
    }
    
    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      const hasTag = criteria.tags.some(tag => 
        knowledge.all_tags.includes(tag.toLowerCase())
      );
      if (!hasTag) continue;
    }
    
    // Filter by amenities
    if (criteria.amenities && criteria.amenities.length > 0) {
      const hasAmenity = criteria.amenities.some(amenity => 
        knowledge.amenities.includes(amenity.toLowerCase())
      );
      if (!hasAmenity) continue;
    }
    
    // Filter by "best for"
    if (criteria.best_for && criteria.best_for.length > 0) {
      const isBestFor = criteria.best_for.some(bf => 
        knowledge.best_for.includes(bf.toLowerCase())
      );
      if (!isBestFor) continue;
    }
    
    // Text search in name, insights, photo descriptions
    if (criteria.query) {
      const q = criteria.query.toLowerCase();
      const matchesName = knowledge.name.toLowerCase().includes(q);
      const matchesInsights = knowledge.insights.some(i => 
        i.title.toLowerCase().includes(q) || 
        i.content.toLowerCase().includes(q)
      );
      const matchesPhotos = knowledge.photos.some(p => 
        p.description.toLowerCase().includes(q)
      );
      
      if (!matchesName && !matchesInsights && !matchesPhotos) {
        continue;
      }
    }
    
    businesses.push(knowledge);
  }
  
  // Sort by priority (number of insights, quality of photos)
  businesses.sort((a, b) => {
    const aScore = a.insights.length * 10 + a.photos.length;
    const bScore = b.insights.length * 10 + b.photos.length;
    return bScore - aScore;
  });
  
  return businesses;
}

/**
 * Format business knowledge for AI context
 */
export function formatBusinessForAI(business: BusinessKnowledge): string {
  const sections: string[] = [];
  
  sections.push(`**${business.name}** (${business.business_type})`);
  sections.push('');
  
  // Add insights
  if (business.insights.length > 0) {
    sections.push('**Tour Operator Insights:**');
    business.insights.forEach(insight => {
      sections.push(`- ${insight.title}: ${insight.content}`);
      if (insight.best_for.length > 0) {
        sections.push(`  Best for: ${insight.best_for.join(', ')}`);
      }
    });
    sections.push('');
  }
  
  // Add structured data
  if (Object.keys(business.structured_data).length > 0) {
    sections.push('**Details:**');
    
    if (business.structured_data.hours) {
      sections.push(`- Hours: ${JSON.stringify(business.structured_data.hours)}`);
    }
    if (business.structured_data.tasting_fee) {
      sections.push(`- Tasting Fee: ${business.structured_data.tasting_fee}`);
    }
    if (business.structured_data.reservations) {
      sections.push(`- Reservations: ${business.structured_data.reservations}`);
    }
    if (business.structured_data.wines) {
      sections.push(`- Wines: ${business.structured_data.wines.join(', ')}`);
    }
    sections.push('');
  }
  
  // Add amenities
  if (business.amenities.length > 0) {
    sections.push(`**Amenities:** ${business.amenities.join(', ')}`);
    sections.push('');
  }
  
  // Add photo descriptions
  if (business.photos.length > 0) {
    sections.push('**Photos:**');
    business.photos.slice(0, 3).forEach(photo => {
      sections.push(`- ${photo.description} (${photo.tags.slice(0, 5).join(', ')})`);
    });
    sections.push('');
  }
  
  return sections.join('\n');
}

