/**
 * Embedding Generation Script
 *
 * Generates embeddings for compliance Q&A entries, wineries, and businesses
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts --target compliance_qa
 *   npx tsx scripts/generate-embeddings.ts --target wineries
 *   npx tsx scripts/generate-embeddings.ts --target all
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js openai
 */

// Note: These are optional dependencies that must be installed before running this script
// eslint-disable-next-line @typescript-eslint/no-require-imports
const OpenAI = require('openai').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js');

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 20; // Process in batches to avoid rate limits

// Target databases
const DATABASES = {
  auditors_dream: {
    url: 'https://gymsdluogchurhdvhqao.supabase.co',
    tables: ['compliance_qa']
  },
  walla_walla_travel: {
    url: 'https://jncmkunbqgbzidxbpkpx.supabase.co',
    tables: ['wineries', 'businesses', 'winery_content', 'business_content', 'events']
  }
};

// Types for the dynamically required modules
type OpenAIClient = InstanceType<typeof OpenAI>;
type SupabaseClient = ReturnType<typeof createClient>;

// Initialize clients
function getOpenAIClient(): OpenAIClient {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

function getSupabaseClient(url: string): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
  }
  return createClient(url, serviceKey);
}

// Generate embedding for text
async function generateEmbedding(openai: OpenAIClient, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS
  });
  return response.data[0].embedding;
}

// Process compliance Q&A entries
async function processComplianceQA(openai: OpenAIClient, supabase: SupabaseClient) {
  console.log('\n📋 Processing compliance_qa table...');

  // Get entries without embeddings
  const { data: entries, error } = await supabase
    .from('compliance_qa')
    .select('id, canonical_question, answer_text, category')
    .is('embedding', null);

  if (error) {
    throw new Error(`Failed to fetch compliance_qa entries: ${error.message}`);
  }

  if (!entries || entries.length === 0) {
    console.log('  ✅ All entries already have embeddings');
    return;
  }

  console.log(`  Found ${entries.length} entries without embeddings`);

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)}...`);

    for (const entry of batch) {
      // Combine question and answer for comprehensive embedding
      const text = `Question: ${entry.canonical_question}\nAnswer: ${entry.answer_text}\nCategory: ${entry.category}`;

      try {
        const embedding = await generateEmbedding(openai, text);

        // Update the entry with the embedding
        const { error: updateError } = await supabase
          .from('compliance_qa')
          .update({ embedding: embedding })
          .eq('id', entry.id);

        if (updateError) {
          console.error(`  ❌ Failed to update entry ${entry.id}: ${updateError.message}`);
        } else {
          console.log(`  ✓ Generated embedding for: ${entry.canonical_question.substring(0, 50)}...`);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: any) {
        console.error(`  ❌ Error processing entry ${entry.id}: ${err.message}`);
      }
    }
  }

  console.log('  ✅ Compliance Q&A processing complete');
}

// Process wineries
async function processWineries(openai: OpenAIClient, supabase: SupabaseClient) {
  console.log('\n🍷 Processing wineries table...');

  const { data: wineries, error } = await supabase
    .from('wineries')
    .select('id, name, ava, city, website, amenities')
    .is('embedding', null);

  if (error) {
    throw new Error(`Failed to fetch wineries: ${error.message}`);
  }

  if (!wineries || wineries.length === 0) {
    console.log('  ✅ All wineries already have embeddings');
    return;
  }

  console.log(`  Found ${wineries.length} wineries without embeddings`);

  for (let i = 0; i < wineries.length; i += BATCH_SIZE) {
    const batch = wineries.slice(i, i + BATCH_SIZE);
    console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(wineries.length / BATCH_SIZE)}...`);

    for (const winery of batch) {
      const text = `Winery: ${winery.name}
Location: ${winery.city}, ${winery.ava || 'Walla Walla Valley'}
Website: ${winery.website || 'N/A'}
Amenities: ${Array.isArray(winery.amenities) ? winery.amenities.join(', ') : 'N/A'}`;

      try {
        const embedding = await generateEmbedding(openai, text);

        const { error: updateError } = await supabase
          .from('wineries')
          .update({ embedding: embedding })
          .eq('id', winery.id);

        if (updateError) {
          console.error(`  ❌ Failed to update winery ${winery.id}: ${updateError.message}`);
        } else {
          console.log(`  ✓ Generated embedding for: ${winery.name}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: any) {
        console.error(`  ❌ Error processing winery ${winery.id}: ${err.message}`);
      }
    }
  }

  console.log('  ✅ Wineries processing complete');
}

// Process businesses
async function processBusinesses(openai: OpenAIClient, supabase: SupabaseClient) {
  console.log('\n🏪 Processing businesses table...');

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, category, subcategory, city, description, amenities, price_range')
    .is('embedding', null);

  if (error) {
    throw new Error(`Failed to fetch businesses: ${error.message}`);
  }

  if (!businesses || businesses.length === 0) {
    console.log('  ✅ All businesses already have embeddings');
    return;
  }

  console.log(`  Found ${businesses.length} businesses without embeddings`);

  for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
    const batch = businesses.slice(i, i + BATCH_SIZE);
    console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(businesses.length / BATCH_SIZE)}...`);

    for (const biz of batch) {
      const text = `Business: ${biz.name}
Category: ${biz.category}${biz.subcategory ? ` - ${biz.subcategory}` : ''}
Location: ${biz.city}
Price Range: ${biz.price_range || 'N/A'}
Description: ${biz.description || 'N/A'}
Amenities: ${Array.isArray(biz.amenities) ? biz.amenities.join(', ') : 'N/A'}`;

      try {
        const embedding = await generateEmbedding(openai, text);

        const { error: updateError } = await supabase
          .from('businesses')
          .update({ embedding: embedding })
          .eq('id', biz.id);

        if (updateError) {
          console.error(`  ❌ Failed to update business ${biz.id}: ${updateError.message}`);
        } else {
          console.log(`  ✓ Generated embedding for: ${biz.name}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: any) {
        console.error(`  ❌ Error processing business ${biz.id}: ${err.message}`);
      }
    }
  }

  console.log('  ✅ Businesses processing complete');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf('--target');
  const target = targetIndex >= 0 ? args[targetIndex + 1] : 'all';

  console.log('🚀 Embedding Generation Script');
  console.log(`   Model: ${EMBEDDING_MODEL}`);
  console.log(`   Dimensions: ${EMBEDDING_DIMENSIONS}`);
  console.log(`   Target: ${target}`);

  const openai = getOpenAIClient();

  try {
    if (target === 'compliance_qa' || target === 'all') {
      const supabase = getSupabaseClient(DATABASES.auditors_dream.url);
      await processComplianceQA(openai, supabase);
    }

    if (target === 'wineries' || target === 'all') {
      const supabase = getSupabaseClient(DATABASES.walla_walla_travel.url);
      await processWineries(openai, supabase);
    }

    if (target === 'businesses' || target === 'all') {
      const supabase = getSupabaseClient(DATABASES.walla_walla_travel.url);
      await processBusinesses(openai, supabase);
    }

    console.log('\n✨ All embedding generation complete!');
  } catch (err: any) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
