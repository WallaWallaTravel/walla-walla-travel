'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadDriverDocument } from '@/lib/actions/driverDocuments'

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'cdl', label: 'CDL License' },
  { value: 'medical_cert', label: 'Medical Certificate' },
  { value: 'mvr', label: 'MVR Report' },
  { value: 'insurance', label: 'Insurance Card' },
  { value: 'vehicle_registration', label: 'Vehicle Registration' },
]

interface Props {
  documentType?: string
  documentName?: string
  onSuccess?: () => void
}

export default function DocumentUploadClient({ documentType, documentName, onSuccess }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form fields shown only when no pre-filled props
  const [selectedType, setSelectedType] = useState(documentType ?? '')
  const [nameValue, setNameValue] = useState(documentName ?? '')
  const [expiresAt, setExpiresAt] = useState('')

  const isCompact = !!documentType

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSuccessMessage(null)
    setErrorMessage(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType ?? selectedType)
    formData.append('document_name', documentName ?? nameValue)
    if (expiresAt) formData.append('expires_at', expiresAt)

    // Reset file input so the same file can be re-selected if needed
    e.target.value = ''

    startTransition(async () => {
      const result = await uploadDriverDocument(formData)
      if (result.success) {
        setSuccessMessage('Document uploaded successfully.')
        onSuccess?.()
        router.refresh()
      } else {
        setErrorMessage(result.error ?? 'Upload failed. Please try again.')
      }
    })
  }

  const triggerFilePicker = () => {
    if (!isCompact) {
      if (!selectedType) { setErrorMessage('Please select a document type.'); return }
      if (!nameValue.trim()) { setErrorMessage('Please enter a document name.'); return }
    }
    setErrorMessage(null)
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />

      {/* Expanded form — shown when no pre-filled type */}
      {!isCompact && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Document Type <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] disabled:opacity-50"
            >
              <option value="">Select type...</option>
              {DOCUMENT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Document Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Commercial Driver's License"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Expiry Date <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] disabled:opacity-50"
            />
          </div>
        </div>
      )}

      {/* Expiry date for compact mode */}
      {isCompact && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Expiry Date <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] disabled:opacity-50"
          />
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={triggerFilePicker}
        disabled={isPending}
        style={isCompact ? { backgroundColor: '#B87333' } : { backgroundColor: '#1E3A5F' }}
        className={
          isCompact
            ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity'
            : 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm disabled:opacity-50 transition-opacity'
        }
      >
        {isPending ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <span>↑</span>
            {isCompact ? 'Upload Replacement' : 'Choose File & Upload'}
          </>
        )}
      </button>

      {/* Feedback messages */}
      {successMessage && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {successMessage}
        </p>
      )}
      {errorMessage && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
