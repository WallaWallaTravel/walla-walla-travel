/**
 * Test Photo Analysis
 * Process a single photo with GPT-4o Vision
 */

import { processPhotoFile } from '../../lib/business-portal/processors/photo-analyzer';

async function testPhotoAnalysis() {
  console.log('🎨 Starting photo analysis...\n');
  
  try {
    const fileId = 1; // The uploaded photo
    
    console.log(`Processing file ID: ${fileId}`);
    console.log('Sending to GPT-4o Vision...\n');
    
    const startTime = Date.now();
    const analysis = await processPhotoFile(fileId);
    const duration = Date.now() - startTime;
    
    console.log('✅ Analysis Complete!\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📝 DESCRIPTION:');
    console.log(analysis.description);
    console.log('\n');
    
    console.log('🏷️  TAGS:');
    console.log(analysis.tags.join(', '));
    console.log('\n');
    
    console.log('📂 SUGGESTED CATEGORY:');
    console.log(analysis.suggestedCategory);
    console.log('\n');
    
    console.log('⭐ QUALITY:');
    console.log(analysis.quality);
    console.log('\n');
    
    console.log('✓ USABLE FOR DIRECTORY:');
    console.log(analysis.usableForDirectory ? 'YES' : 'NO');
    console.log('\n');
    
    console.log('🔍 DETECTED ELEMENTS:');
    console.log(JSON.stringify(analysis.detectedElements, null, 2));
    console.log('\n');
    
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`⏱️  Processing time: ${duration}ms`);
    console.log(`💰 Estimated cost: $${(0.003).toFixed(4)}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testPhotoAnalysis();

