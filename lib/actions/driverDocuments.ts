'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MEDIA_BUCKET } from '@/lib/storage/supabase-storage'
import { stripExif } from '@/lib/utils/image-processing'
import { generateSecureString } from '@/lib/utils'
import { logger } from '@/lib/logger'

const ALLOWED_DOCUMENT_TYPES = ['cdl', 'medical_cert', 'mvr', 'insurance', 'vehicle_registration']
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadDriverDocument(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.user.role !== 'driver') {
    return { success: false, error: 'Unauthorized' }
  }

  const file = formData.get('file') as File | null
  const documentType = formData.get('document_type') as string | null
  const documentName = formData.get('document_name') as string | null
  const expiresAt = formData.get('expires_at') as string | null

  if (!file) return { success: false, error: 'Missing required file' }
  if (!documentType) return { success: false, error: 'Missing document_type' }
  if (!documentName) return { success: false, error: 'Missing document_name' }
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) return { success: false, error: 'Invalid document type' }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return { success: false, error: 'Invalid file type. JPEG, PNG, WebP, or PDF only.' }
  if (file.size > MAX_FILE_SIZE) return { success: false, error: 'File too large. Max 10MB.' }

  try {
    const timestamp = Date.now()
    const randomString = generateSecureString(7)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const storagePath = `driver-documents/${session.user.id}/${timestamp}-${randomString}.${ext}`

    const rawBuffer = Buffer.from(await file.arrayBuffer())
    const fileData = await stripExif(rawBuffer, file.type)

    const { data, error } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, fileData, { contentType: file.type, cacheControl: '3600', upsert: false })

    if (error) {
      logger.error('Document upload failed', { error, storagePath })
      return { success: false, error: `Upload failed: ${error.message}` }
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(data.path)
    const fileTypeLabel = file.type === 'application/pdf' ? 'pdf' : ext

    await prisma.$queryRawUnsafe(
      `INSERT INTO driver_documents (driver_id, document_type, document_name, document_url, file_type, file_size_bytes, expiry_date, source, original_filename, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      session.user.id, documentType, documentName, publicUrl, fileTypeLabel,
      file.size, expiresAt || null, 'upload', file.name, session.user.id
    )

    logger.info('Driver document uploaded', { driverId: session.user.id, documentType })
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return { success: false, error: message }
  }
}
