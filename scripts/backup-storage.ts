/**
 * Supabase Storage Backup Script
 *
 * Downloads all files from all Supabase storage buckets and creates
 * a timestamped tar.gz archive for disaster recovery.
 *
 * Daily Supabase backups only cover the database — this script covers
 * the Storage API (media, winery photos, receipts, etc.).
 *
 * Usage:
 *   npx tsx scripts/backup-storage.ts
 *
 * Environment variables (reads .env.local automatically):
 *   SUPABASE_URL          — Supabase project URL
 *   SUPABASE_SERVICE_KEY  — Service role key (bypasses RLS)
 *
 * Output:
 *   backups/storage-backup-YYYY-MM-DD-HHmmss.tar.gz
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Load .env.local if running locally (CI provides env vars directly)
// ---------------------------------------------------------------------------
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Validate environment
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  if (!SUPABASE_URL) console.error('  - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Recursively list all files in a bucket under a given prefix.
 * Supabase storage.list() returns max 100 items per call and includes
 * folders (items with id = null). We recurse into folders.
 */
async function listAllFiles(
  bucket: string,
  prefix: string = ''
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      console.error(`  Error listing ${bucket}/${prefix}: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id === null) {
        // It's a folder — recurse
        const subFiles = await listAllFiles(bucket, fullPath);
        paths.push(...subFiles);
      } else {
        paths.push(fullPath);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return paths;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(60));
  console.log('  Supabase Storage Backup');
  console.log('='.repeat(60));
  console.log(`  URL: ${SUPABASE_URL}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('');

  // 1. List all buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error(`Failed to list buckets: ${bucketsError.message}`);
    process.exit(1);
  }

  if (!buckets || buckets.length === 0) {
    console.log('No storage buckets found. Nothing to back up.');
    process.exit(0);
  }

  console.log(`Found ${buckets.length} bucket(s): ${buckets.map((b) => b.name).join(', ')}`);
  console.log('');

  // 2. Create temp directory
  const ts = timestamp();
  const projectRoot = join(__dirname, '..');
  const tmpDir = join(projectRoot, 'backups', `storage-${ts}`);
  const backupsDir = join(projectRoot, 'backups');
  mkdirSync(backupsDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });

  let totalFiles = 0;
  let totalBytes = 0;
  let failedFiles = 0;

  // 3. Download each bucket
  for (const bucket of buckets) {
    console.log(`--- Bucket: ${bucket.name} ---`);

    const files = await listAllFiles(bucket.name);

    if (files.length === 0) {
      console.log('  (empty)');
      console.log('');
      continue;
    }

    console.log(`  ${files.length} file(s) to download`);

    const bucketDir = join(tmpDir, bucket.name);
    mkdirSync(bucketDir, { recursive: true });

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const progress = `[${i + 1}/${files.length}]`;

      const { data, error } = await supabase.storage
        .from(bucket.name)
        .download(filePath);

      if (error || !data) {
        console.error(`  ${progress} FAILED: ${filePath} — ${error?.message || 'no data'}`);
        failedFiles++;
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const destPath = join(bucketDir, filePath);
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, buffer);

      totalFiles++;
      totalBytes += buffer.length;

      // Print progress every 10 files or for the last file
      if ((i + 1) % 10 === 0 || i === files.length - 1) {
        console.log(`  ${progress} ${filePath} (${formatBytes(buffer.length)})`);
      }
    }

    console.log('');
  }

  // 4. Write manifest
  const manifest = {
    created: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    buckets: buckets.map((b) => b.name),
    totalFiles,
    totalBytes,
    failedFiles,
  };
  writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // 5. Create tar.gz archive
  const archiveName = `storage-backup-${ts}.tar.gz`;
  const archivePath = join(backupsDir, archiveName);

  console.log('Creating archive...');
  execSync(`tar -czf "${archivePath}" -C "${backupsDir}" "storage-${ts}"`, { stdio: 'pipe' });

  // Get archive size
  const archiveSize = require('fs').statSync(archivePath).size;

  // 6. Clean up temp directory
  rmSync(tmpDir, { recursive: true, force: true });

  // 7. Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('  BACKUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Files:    ${totalFiles}`);
  console.log(`  Failed:   ${failedFiles}`);
  console.log(`  Raw size: ${formatBytes(totalBytes)}`);
  console.log(`  Archive:  ${archiveName} (${formatBytes(archiveSize)})`);
  console.log(`  Location: backups/${archiveName}`);
  console.log('='.repeat(60));

  // Exit with error if any files failed
  if (failedFiles > 0) {
    console.error(`\nWarning: ${failedFiles} file(s) failed to download.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
