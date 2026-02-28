'use client';

import React, { useState, useRef, useCallback } from 'react';
import { TouchButton } from '@/components/mobile/TouchButton';

interface ReceiptPhotoCaptureProps {
  onCapture: (file: File) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

/**
 * ReceiptPhotoCapture - Camera/photo upload for receipt images
 *
 * Features:
 * - Camera capture on mobile devices
 * - File picker for photo library
 * - Image preview before upload
 * - Retake/reselect option
 */
export function ReceiptPhotoCapture({
  onCapture,
  onSkip,
  isLoading = false,
}: ReceiptPhotoCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Please select an image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image is too large. Maximum size is 5MB');
      return;
    }

    setError('');
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setError('');
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onCapture(selectedFile);
    }
  };

  // Preview mode - show captured image
  if (previewUrl && selectedFile) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Review Receipt</h2>
          <p className="text-gray-600 mt-1">Make sure the receipt is clearly visible</p>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-[3/4] max-h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="space-y-3">
          <TouchButton
            variant="primary"
            size="large"
            fullWidth
            onClick={handleConfirm}
            loading={isLoading}
          >
            Use This Photo
          </TouchButton>

          <TouchButton
            variant="ghost"
            size="large"
            fullWidth
            onClick={handleRetake}
            disabled={isLoading}
          >
            Retake Photo
          </TouchButton>
        </div>
      </div>
    );
  }

  // Capture mode - show options to take/select photo
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Add Receipt Photo</h2>
        <p className="text-gray-600 mt-1">Take a photo or select from your gallery</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Take photo with camera"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Select photo from gallery"
      />

      <div className="space-y-3">
        <TouchButton variant="primary" size="large" fullWidth onClick={handleCameraCapture}>
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Take Photo
          </span>
        </TouchButton>

        <TouchButton variant="secondary" size="large" fullWidth onClick={handleGallerySelect}>
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Choose from Gallery
          </span>
        </TouchButton>

        <TouchButton variant="ghost" size="large" fullWidth onClick={onSkip}>
          Skip - No Receipt
        </TouchButton>
      </div>
    </div>
  );
}
