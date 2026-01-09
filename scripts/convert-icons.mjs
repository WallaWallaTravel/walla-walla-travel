/**
 * Convert brand SVG icons to 512x512 PNG for ChatGPT Store submission
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRANDS_DIR = path.join(__dirname, '../public/brands');

const icons = [
  { svg: 'wwt-icon.svg', png: 'wwt-icon-512.png', name: 'Walla Walla Travel' },
  { svg: 'nwtc-icon.svg', png: 'nwtc-icon-512.png', name: 'NW Touring & Concierge' },
  { svg: 'hcwt-icon.svg', png: 'hcwt-icon-512.png', name: 'Herding Cats Wine Tours' },
];

async function convertIcons() {
  console.log('Converting brand icons to 512x512 PNG...\n');

  for (const icon of icons) {
    const svgPath = path.join(BRANDS_DIR, icon.svg);
    const pngPath = path.join(BRANDS_DIR, icon.png);

    try {
      const svgBuffer = fs.readFileSync(svgPath);

      await sharp(svgBuffer)
        .resize(512, 512)
        .png()
        .toFile(pngPath);

      console.log(`✓ ${icon.name}: ${icon.png}`);
    } catch (error) {
      console.error(`✗ ${icon.name}: ${error.message}`);
    }
  }

  console.log('\nConversion complete!');
  console.log(`\nIcons saved to: ${BRANDS_DIR}`);
  console.log('\nFor ChatGPT Store submission, upload these files:');
  icons.forEach(icon => {
    console.log(`  - ${icon.png} (${icon.name})`);
  });
}

convertIcons().catch(console.error);
