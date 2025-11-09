"use client";

/**
 * Business Portal File Upload Page
 * Upload photos, documents, menus - with camera support
 */

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Business {
  id: number;
  name: string;
}

interface UploadedFile {
  id: number;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  uploaded_at: string;
}

export default function BusinessUploadPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Load business and existing files
  useEffect(() => {
    loadBusinessData();
    loadFiles();
  }, []);
  
  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  const loadBusinessData = async () => {
    try {
      const response = await fetch('/api/business-portal/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (!response.ok) throw new Error('Invalid access code');
      
      const data = await response.json();
      setBusiness(data.business);
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const loadFiles = async () => {
    // TODO: Implement file list API
    setFiles([]);
  };
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || !business) return;
    
    setUploading(true);
    setError(null);
    setSuccess(null);
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await uploadFile(file);
      }
      
      setSuccess(`✓ Uploaded ${selectedFiles.length} file(s)`);
      loadFiles();
      
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('businessId', business!.id.toString());
    formData.append('file', file);
    formData.append('category', getCategoryFromFile(file));
    
    const response = await fetch('/api/business-portal/upload-file', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Upload failed');
    }
  };
  
  const getCategoryFromFile = (file: File): string => {
    const name = file.name.toLowerCase();
    if (name.includes('menu')) return 'menu';
    if (name.includes('wine') && name.includes('list')) return 'wine_list';
    if (file.type.startsWith('image/')) return 'venue_photos';
    return 'documents';
  };
  
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };
  
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };
  
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !business) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      setUploading(true);
      setError(null);
      setSuccess(null);
      
      try {
        // Create a File from the blob
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await uploadFile(file);
        
        setSuccess('✓ Photo uploaded!');
        loadFiles();
        stopCamera();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.9);
  };
  
  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
              <p className="text-sm text-gray-600">Upload Photos & Documents</p>
            </div>
            <button
              onClick={() => router.push(`/contribute/${code}`)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Questions
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Files</h2>
          <p className="text-gray-600 mb-6">
            Add photos of your venue, menus, wine lists, or other documents to enhance your profile.
          </p>
          
          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <p className="text-green-700">{success}</p>
            </div>
          )}
          
          {/* Camera View */}
          {showCamera && (
            <div className="mb-6 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={capturePhoto}
                  disabled={uploading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  📸 {uploading ? 'Uploading...' : 'Capture Photo'}
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Upload Options */}
          {!showCamera && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Camera Button */}
              <button
                onClick={startCamera}
                disabled={uploading}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
              >
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold text-gray-700">Take Photo</span>
                <span className="text-sm text-gray-500 mt-1">Use camera</span>
              </button>
              
              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
              >
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="font-semibold text-gray-700">Choose Files</span>
                <span className="text-sm text-gray-500 mt-1">Photos, PDFs, etc.</span>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
          
          {/* File Types Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Recommended files:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>📸 Venue photos (interior, outdoor areas, views)</li>
              <li>🍷 Wine bottles & labels</li>
              <li>📋 Current menu or wine list</li>
              <li>📄 Brochures or promotional materials</li>
            </ul>
          </div>
        </div>
        
        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Uploaded Files ({files.length})</h3>
            <div className="space-y-2">
              {files.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{file.original_filename}</p>
                    <p className="text-sm text-gray-500">
                      {(file.file_size_bytes / 1024).toFixed(1)} KB • {file.file_type}
                    </p>
                  </div>
                  <span className="text-green-600">✓</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Done Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => router.push(`/contribute/${code}`)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Done Uploading
          </button>
        </div>
      </main>
    </div>
  );
}

