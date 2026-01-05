"use client";

/**
 * Business Portal File Upload Page
 * Upload photos, documents, menus - with camera support
 */

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

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

interface UploadProgress {
  fileName: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Load business and existing files
  useEffect(() => {
    loadBusinessData();
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
    
    // Initialize progress for all files
    const initialProgress: UploadProgress[] = Array.from(selectedFiles).map(file => ({
      fileName: file.name,
      status: 'uploading',
      progress: 0
    }));
    setUploadProgress(initialProgress);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
          await uploadFile(file, i);
          successCount++;
          
          // Mark as complete
          setUploadProgress(prev => 
            prev.map((p, idx) => 
              idx === i ? { ...p, status: 'complete', progress: 100 } : p
            )
          );
        } catch (err: unknown) {
          failCount++;
          logger.error(`Upload failed for ${file.name}`, { error: err });
          
          // Mark as error
          setUploadProgress(prev => 
            prev.map((p, idx) => 
              idx === i ? { ...p, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' } : p
            )
          );
        }
      }
      
      if (successCount > 0) {
        setSuccess(`✓ Uploaded ${successCount} file(s)${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        loadFiles();
      }
      
      if (failCount === selectedFiles.length) {
        setError('All uploads failed. Please try again.');
      }
      
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear progress after 3 seconds if all complete
      if (failCount === 0) {
        setTimeout(() => setUploadProgress([]), 3000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file: File, index: number) => {
    const formData = new FormData();
    formData.append('businessId', business!.id.toString());
    formData.append('file', file);
    formData.append('category', getCategoryFromFile(file));
    
    // Update progress to show processing
    setUploadProgress(prev => 
      prev.map((p, idx) => 
        idx === index ? { ...p, status: 'processing', progress: 50 } : p
      )
    );
    
    const response = await fetch('/api/business-portal/upload-file', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const data = await response.json();
      logger.error('Upload API error', { data });
      throw new Error(data.error || data.details || 'Upload failed');
    }
    
    const result = await response.json();
    logger.info('Upload successful', { result });
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
    } catch (_err: unknown) {
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
      
      // Create a File from the blob
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Initialize progress
      setUploadProgress([{
        fileName: file.name,
        status: 'uploading',
        progress: 0
      }]);
      
      try {
        await uploadFile(file, 0);
        
        setUploadProgress([{
          fileName: file.name,
          status: 'complete',
          progress: 100
        }]);
        
        setSuccess('✓ Photo uploaded!');
        loadFiles();
        stopCamera();
        
        // Clear progress after 3 seconds
        setTimeout(() => setUploadProgress([]), 3000);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadProgress([{
          fileName: file.name,
          status: 'error',
          progress: 0,
          error: message
        }]);
        setError(message);
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/contribute/${code}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Interview
                  </button>
                </div>
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
          
          {/* Upload Progress Tracker */}
          {uploadProgress.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Upload Progress:</h3>
              {uploadProgress.map((progress, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {progress.status === 'complete' && (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {progress.status === 'error' && (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      {(progress.status === 'uploading' || progress.status === 'processing') && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {progress.fileName}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${
                      progress.status === 'complete' ? 'text-green-600' :
                      progress.status === 'error' ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {progress.status === 'uploading' && 'Uploading...'}
                      {progress.status === 'processing' && 'Processing...'}
                      {progress.status === 'complete' && 'Complete'}
                      {progress.status === 'error' && 'Failed'}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  {(progress.status === 'uploading' || progress.status === 'processing') && (
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  {/* Error message */}
                  {progress.error && (
                    <p className="text-xs text-red-600 mt-1">{progress.error}</p>
                  )}
                </div>
              ))}
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

