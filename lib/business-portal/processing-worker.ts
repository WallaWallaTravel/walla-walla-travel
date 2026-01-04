/**
 * Processing Worker
 * Processes queued jobs for voice transcription, text extraction, photo analysis, and PDF parsing
 */

import {
  getPendingJobs,
  markJobProcessing,
  markJobCompleted,
  markJobFailed
} from './ai-processing';
import { processVoiceEntry } from './processors/voice-transcriber';
import { processTextEntry, processVoiceTranscription } from './processors/text-extractor';
import { processPhotoFile } from './processors/photo-analyzer';
import { processPdfFile } from './processors/pdf-parser';
import { logger } from '@/lib/logger';

let isProcessing = false;

/**
 * Process all pending jobs
 * Call this from an API endpoint or cron job
 */
export async function processJobs(limit: number = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (isProcessing) {
    logger.debug('Processing Worker: Already processing, skipping');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  isProcessing = true;
  logger.info('Processing Worker: Starting job processing');

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const jobs = await getPendingJobs(limit);
    logger.info('Processing Worker: Found pending jobs', { count: jobs.length });

    for (const job of jobs) {
      processed++;
      logger.debug('Processing Worker: Processing job', { jobId: job.id, type: job.job_type });

      try {
        await markJobProcessing(job.id);

        let result: any;

        switch (job.job_type) {
          case 'voice_transcription':
            result = await processVoiceEntry(job.source_id);
            await markJobCompleted(job.id, { transcription: result });
            break;

          case 'text_extraction':
            // Determine if this is a voice entry or text entry
            // For now, assume text entry
            result = await processTextEntry(job.source_id);
            await markJobCompleted(job.id, { extracted: result });
            break;

          case 'photo_analysis':
            result = await processPhotoFile(job.source_id);
            await markJobCompleted(job.id, { analysis: result });
            break;

          case 'pdf_parsing':
            result = await processPdfFile(job.source_id);
            await markJobCompleted(job.id, { parsed: result });
            break;

          default:
            throw new Error(`Unknown job type: ${job.job_type}`);
        }

        succeeded++;
        logger.debug('Processing Worker: Job completed', { jobId: job.id });

      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Processing Worker: Job failed', { jobId: job.id, error });
        await markJobFailed(job.id, message);
      }
    }

    logger.info('Processing Worker: Finished', { processed, succeeded, failed });

  } catch (error) {
    logger.error('Processing Worker: Worker error', { error });
  } finally {
    isProcessing = false;
  }

  return { processed, succeeded, failed };
}

/**
 * Process a single job by ID
 */
export async function processJob(jobId: number): Promise<boolean> {
  logger.debug('Processing Worker: Processing single job', { jobId });

  const jobs = await getPendingJobs(100);
  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found or not pending`);
  }

  try {
    await markJobProcessing(job.id);

    let result: any;

    switch (job.job_type) {
      case 'voice_transcription':
        result = await processVoiceEntry(job.source_id);
        await markJobCompleted(job.id, { transcription: result });
        break;

      case 'text_extraction':
        result = await processTextEntry(job.source_id);
        await markJobCompleted(job.id, { extracted: result });
        break;

      case 'photo_analysis':
        result = await processPhotoFile(job.source_id);
        await markJobCompleted(job.id, { analysis: result });
        break;

      case 'pdf_parsing':
        result = await processPdfFile(job.source_id);
        await markJobCompleted(job.id, { parsed: result });
        break;

      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }

    logger.debug('Processing Worker: Job completed', { jobId });
    return true;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Processing Worker: Job failed', { jobId, error });
    await markJobFailed(job.id, message);
    return false;
  }
}

