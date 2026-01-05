'use client'

import { useState } from 'react'

export default function DriverDocuments() {
  const [uploading, setUploading] = useState(false)
  
  const documentTypes = [
    { id: 1, name: 'MVR', status: 'current', expires: '2025-03-15' },
    { id: 2, name: 'Background Check', status: 'expiring', expires: '2025-01-20' },
    { id: 3, name: 'Drug Test', status: 'expired', expires: '2024-12-01' },
    { id: 4, name: 'Medical Card', status: 'current', expires: '2025-06-30' },
  ]

  const handleFileUpload = async (docType: string, _file: File) => {
    setUploading(true)
    
    // TODO: Implement file storage
    // For now, just simulate upload
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    alert(`File upload for ${docType} - Coming soon!`)
    setUploading(false)
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-green-100 text-green-800';
      case 'expiring':
        return 'bg-amber-100 text-amber-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white">📄 My Documents</h1>
          <p className="text-blue-100 text-lg mt-1">Manage your certifications and compliance documents</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Alert for expired/expiring documents */}
        {documentTypes.some(d => d.status === 'expired' || d.status === 'expiring') && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-amber-800">Action Required</h3>
                <p className="text-amber-700 text-sm mt-1">
                  Some of your documents are expired or expiring soon. Please upload updated versions.
                </p>
              </div>
            </div>
          </div>
        )}

        {documentTypes.map(doc => (
          <div key={doc.id} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-gray-900">{doc.name}</h3>
                <p className="text-gray-600 mt-1">
                  Expires: {new Date(doc.expires).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusStyles(doc.status)}`}>
                {doc.status.toUpperCase()}
              </span>
            </div>
            
            <label className="block">
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(doc.name, e.target.files[0])
                  }
                }}
              />
              <span className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg cursor-pointer font-semibold transition-colors shadow-sm">
                {uploading ? 'Uploading...' : '📤 Upload New Document'}
              </span>
            </label>
          </div>
        ))}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 text-lg mb-2">📋 Document Requirements</h3>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li>• <strong>MVR (Motor Vehicle Record)</strong> - Must be updated annually</li>
            <li>• <strong>Background Check</strong> - Valid for 2 years</li>
            <li>• <strong>Drug Test</strong> - Required every 12 months</li>
            <li>• <strong>Medical Card</strong> - DOT physical required for CDL holders</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
