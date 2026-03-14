import { getDriverDocuments } from '@/lib/actions/driver-queries'
import DocumentUploadClient from './DocumentsClient'

interface DriverDocument {
  id: number
  document_type: string
  document_name: string
  document_url: string
  expiry_date: string | null
  verified: boolean
  notes: string | null
  created_at: string
  status: 'current' | 'expiring' | 'expired' | 'unknown'
}

function StatusBadge({ status }: { status: DriverDocument['status'] }) {
  const config = {
    current: { bg: 'bg-green-100', text: 'text-green-800', label: 'Current' },
    expiring: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Expiring Soon' },
    expired: { bg: 'bg-red-100', text: 'text-red-800', label: 'Expired' },
    unknown: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Unknown' },
  }
  const { bg, text, label } = config[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}

function formatDocType(type: string): string {
  const labels: Record<string, string> = {
    cdl: 'CDL License',
    medical_cert: 'Medical Certificate',
    mvr: 'MVR Report',
    insurance: 'Insurance Card',
    vehicle_registration: 'Vehicle Registration',
  }
  return labels[type] ?? type.replace(/_/g, ' ')
}

export default async function DocumentsPage() {
  const result = await getDriverDocuments()
  const documents: DriverDocument[] = result.success && result.data
    ? (result.data as { documents: DriverDocument[] }).documents
    : []

  const hasWarnings = documents.some(d => d.status === 'expired' || d.status === 'expiring')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: '#1E3A5F' }} className="px-4 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white">My Documents</h1>
          <p className="text-blue-200 mt-1 text-sm">Manage your certifications and required files</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Warning alert */}
        {hasWarnings && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
            <div>
              <p className="text-amber-800 font-medium text-sm">Action required</p>
              <p className="text-amber-700 text-sm mt-0.5">
                One or more documents are expired or expiring soon. Please upload updated versions.
              </p>
            </div>
          </div>
        )}

        {/* Documents list */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-gray-500 text-base">No documents on file.</p>
            <p className="text-gray-400 text-sm mt-1">Upload your first document below.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{doc.document_name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDocType(doc.document_type)}</p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  {doc.expiry_date && (
                    <span>
                      <span className="font-medium text-gray-700">Expires:</span>{' '}
                      {new Date(doc.expiry_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {doc.verified && (
                    <span className="text-green-700 font-medium">✓ Verified</span>
                  )}
                </div>

                {doc.notes && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-4">{doc.notes}</p>
                )}

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Replace Document</p>
                  <DocumentUploadClient
                    documentType={doc.document_type}
                    documentName={doc.document_name}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Document */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Add New Document</h2>
          <p className="text-sm text-gray-500 mb-4">Upload a new certification or required file.</p>
          <DocumentUploadClient />
        </div>
      </div>
    </div>
  )
}
