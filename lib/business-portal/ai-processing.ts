/**
 * AI Processing Pipeline for Business Portal
 * Handles transcription, extraction, and analysis
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface ProcessingJob {
  id: number;
  business_id: number;
  job_type: 'voice_transcription' | 'text_extraction' | 'photo_analysis' | 'pdf_parsing';
  source_id: number; // ID of voice_entry, text_entry, or file
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_data?: Record<string, unknown>;
  error_message?: string;
}

/**
 * Queue a voice transcription job
 */
export async function queueVoiceTranscription(voiceEntryId: number, businessId: number): Promise<number> {
  logger.debug('AI Processing: Queueing voice transcription', { voiceEntryId });
  
  const result = await query(`
    INSERT INTO processing_jobs (
      business_id,
      job_type,
      source_id,
      status,
      created_at
    )
    VALUES ($1, 'voice_transcription', $2, 'pending', NOW())
    RETURNING id
  `, [businessId, voiceEntryId]);
  
  return result.rows[0].id;
}

/**
 * Queue a text extraction job
 */
export async function queueTextExtraction(textEntryId: number, businessId: number): Promise<number> {
  logger.debug('AI Processing: Queueing text extraction', { textEntryId });
  
  const result = await query(`
    INSERT INTO processing_jobs (
      business_id,
      job_type,
      source_id,
      status,
      created_at
    )
    VALUES ($1, 'text_extraction', $2, 'pending', NOW())
    RETURNING id
  `, [businessId, textEntryId]);
  
  return result.rows[0].id;
}

/**
 * Queue a photo analysis job
 */
export async function queuePhotoAnalysis(fileId: number, businessId: number): Promise<number> {
  logger.debug('AI Processing: Queueing photo analysis', { fileId });
  
  const result = await query(`
    INSERT INTO processing_jobs (
      business_id,
      job_type,
      source_id,
      status,
      created_at
    )
    VALUES ($1, 'photo_analysis', $2, 'pending', NOW())
    RETURNING id
  `, [businessId, fileId]);
  
  return result.rows[0].id;
}

/**
 * Queue a PDF parsing job
 */
export async function queuePdfParsing(fileId: number, businessId: number): Promise<number> {
  logger.debug('AI Processing: Queueing PDF parsing', { fileId });
  
  const result = await query(`
    INSERT INTO processing_jobs (
      business_id,
      job_type,
      source_id,
      status,
      created_at
    )
    VALUES ($1, 'pdf_parsing', $2, 'pending', NOW())
    RETURNING id
  `, [businessId, fileId]);
  
  return result.rows[0].id;
}

/**
 * Get pending processing jobs
 */
export async function getPendingJobs(limit: number = 10): Promise<ProcessingJob[]> {
  const result = await query(`
    SELECT * FROM processing_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}

/**
 * Mark job as processing
 */
export async function markJobProcessing(jobId: number): Promise<void> {
  await query(`
    UPDATE processing_jobs
    SET status = 'processing', started_at = NOW()
    WHERE id = $1
  `, [jobId]);
}

/**
 * Mark job as completed
 */
export async function markJobCompleted(jobId: number, resultData: Record<string, unknown>): Promise<void> {
  await query(`
    UPDATE processing_jobs
    SET 
      status = 'completed',
      result_data = $2,
      completed_at = NOW()
    WHERE id = $1
  `, [jobId, JSON.stringify(resultData)]);
}

/**
 * Mark job as failed
 */
export async function markJobFailed(jobId: number, error: string): Promise<void> {
  await query(`
    UPDATE processing_jobs
    SET 
      status = 'failed',
      error_message = $2,
      completed_at = NOW()
    WHERE id = $1
  `, [jobId, error]);
}

/**
 * Get processing status for a business
 */
export async function getBusinessProcessingStatus(businessId: number): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const result = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM processing_jobs
    WHERE business_id = $1
  `, [businessId]);
  
  const row = result.rows[0];
  return {
    total: parseInt(row.total || '0'),
    pending: parseInt(row.pending || '0'),
    processing: parseInt(row.processing || '0'),
    completed: parseInt(row.completed || '0'),
    failed: parseInt(row.failed || '0')
  };
}

