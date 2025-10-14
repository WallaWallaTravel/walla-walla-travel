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

  const handleFileUpload = async (docType: string, file: File) => {
    setUploading(true)
    
    // TODO: Implement file storage
    // For now, just simulate upload
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    alert(`File upload for ${docType} - Coming soon!`)
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold">My Documents</h1>
      </header>

      <div className="p-4 space-y-3">
        {documentTypes.map(doc => (
          <div key={doc.id} className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                <p className="text-sm text-gray-600">
                  Expires: {new Date(doc.expires).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                doc.status === 'current' ? 'bg-green-100 text-green-800' :
                doc.status === 'expiring' ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
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
              <span className="block w-full text-center bg-gray-800 text-white py-2 rounded-lg cursor-pointer hover:bg-gray-700">
                {uploading ? 'Uploading...' : 'Upload New'}
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
