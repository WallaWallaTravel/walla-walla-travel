import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const photosBasePath = '/Users/temp/Library/CloudStorage/Dropbox/My Pictures DB/NW Touring My Pictures DB';

// Photos to upload
const photos = [
  // Featured wineries
  {
    localPath: `${photosBasePath}/L'ecole/5S9A3066.JPG`,
    storagePath: 'wineries/lecole-pond.jpg',
    wineryId: 3,
    name: "L'Ecole No 41"
  },
  {
    localPath: `${photosBasePath}/Landscape Etc/5S9A3050.JPG`,
    storagePath: 'wineries/woodward-canyon-landscape.jpg',
    wineryId: 4,
    name: 'Woodward Canyon'
  },
  {
    localPath: `${photosBasePath}/Walla Walla Vintners/5S9A3505.JPG`,
    storagePath: 'wineries/walla-walla-vintners-vineyard.jpg',
    wineryId: 5,
    name: 'Walla Walla Vintners'
  },
  {
    localPath: `${photosBasePath}/Abeja/5S9A3238.JPG`,
    storagePath: 'wineries/abeja-evening.jpg',
    wineryId: 25,
    name: 'Abeja'
  },
  // Explore section images
  {
    localPath: `${photosBasePath}/Landscape Etc/5S9A4447.JPG`,
    storagePath: 'explore/wine-districts-hills.jpg',
    type: 'explore',
    name: 'Wine Districts'
  },
  {
    localPath: `${photosBasePath}/Downtown/2024-06-20 17.15.29.jpg`,
    storagePath: 'explore/downtown-building.jpg',
    type: 'explore',
    name: 'Downtown'
  },
  {
    localPath: `${photosBasePath}/Landscape Etc/5S9A3050.JPG`,
    storagePath: 'explore/winter-vineyard.jpg',
    type: 'explore',
    name: 'Winter Vineyard'
  }
];

async function uploadPhotos() {
  console.log('Starting photo uploads to Supabase storage...\n');

  const uploadedUrls = {};

  for (const photo of photos) {
    try {
      // Check if file exists
      if (!fs.existsSync(photo.localPath)) {
        console.log(`❌ File not found: ${photo.localPath}`);
        continue;
      }

      // Read file
      const fileBuffer = fs.readFileSync(photo.localPath);

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(photo.storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.log(`❌ Error uploading ${photo.name}: ${error.message}`);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(photo.storagePath);

      const publicUrl = urlData.publicUrl;
      uploadedUrls[photo.name] = publicUrl;

      console.log(`✓ Uploaded ${photo.name}`);
      console.log(`  URL: ${publicUrl}\n`);

      // Update winery record if this is a winery photo
      if (photo.wineryId) {
        const { error: updateError } = await supabase
          .from('wineries')
          .update({ cover_photo_url: publicUrl })
          .eq('id', photo.wineryId);

        if (updateError) {
          console.log(`  ⚠️ Could not update winery ${photo.wineryId}: ${updateError.message}`);
        } else {
          console.log(`  ✓ Updated winery ${photo.wineryId} cover_photo_url\n`);
        }
      }

    } catch (err) {
      console.log(`❌ Error processing ${photo.name}: ${err.message}`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Uploaded URLs for page.tsx Explore section:');
  for (const [name, url] of Object.entries(uploadedUrls)) {
    console.log(`${name}: ${url}`);
  }
}

uploadPhotos();
