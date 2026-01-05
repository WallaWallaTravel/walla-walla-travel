'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { logger } from '@/lib/logger';

// Aspect ratios by category
const CATEGORY_ASPECTS: Record<string, number> = {
  hero: 16 / 9,        // Wide landscape for hero banner
  tasting_room: 4 / 3, // Standard photo
  vineyard: 16 / 9,    // Landscape scenery
  wine: 1,             // Square for product shots
  team: 4 / 3,         // Portrait-friendly
  experience: 4 / 3,   // Flexible
};

const ASPECT_LABELS: Record<string, string> = {
  hero: '16:9 (Wide)',
  tasting_room: '4:3',
  vineyard: '16:9 (Wide)',
  wine: '1:1 (Square)',
  team: '4:3',
  experience: '4:3',
};

interface ImageCropModalProps {
  imageUrl: string;
  fileName: string;
  category: string;
  onCropComplete: (croppedImageBlob: Blob, fileName: string) => void;
  onCancel: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageCropModal({
  imageUrl,
  fileName,
  category,
  onCropComplete,
  onCancel,
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const aspect = CATEGORY_ASPECTS[category] || 4 / 3;
  const aspectLabel = ASPECT_LABELS[category] || '4:3';

  // Wait for client-side mount before rendering portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    },
    [aspect]
  );

  const getCroppedImg = useCallback(
    async (image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Calculate output dimensions (max 2000px on longest side for quality)
      const maxDimension = 2000;
      let outputWidth = pixelCrop.width * scaleX;
      let outputHeight = pixelCrop.height * scaleY;

      if (outputWidth > maxDimension || outputHeight > maxDimension) {
        const ratio = Math.min(maxDimension / outputWidth, maxDimension / outputHeight);
        outputWidth *= ratio;
        outputHeight *= ratio;
      }

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No 2d context');
      }

      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight
      );

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas is empty'));
            }
          },
          'image/jpeg',
          0.92
        );
      });
    },
    []
  );

  const handleApplyCrop = async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    setIsProcessing(true);

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      // Generate a new filename with .jpg extension
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const newFileName = `${baseName}-cropped.jpg`;
      onCropComplete(croppedBlob, newFileName);
    } catch (error) {
      logger.error('Error cropping image', { error });
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render until mounted (needed for portal)
  if (!mounted) {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
      {/* Close button */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"
        aria-label="Close"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col items-center max-w-5xl w-full mx-4">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-white">Crop Your Photo</h2>
          <p className="text-white/60 text-sm mt-1">
            Drag to reposition, drag corners to resize
          </p>
        </div>

        {/* Aspect ratio badge */}
        <div className="mb-4 px-3 py-1 bg-white/10 rounded-full">
          <span className="text-white/80 text-sm">
            Aspect ratio: <span className="font-medium text-white">{aspectLabel}</span>
          </span>
        </div>

        {/* Crop area */}
        <div className="relative max-h-[60vh] overflow-hidden rounded-lg">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-h-[60vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Required for react-image-crop ref */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[60vh] max-w-full"
              style={{ display: 'block' }}
            />
          </ReactCrop>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyCrop}
            disabled={isProcessing || !completedCrop}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Apply Crop
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <p className="text-white/40 text-xs mt-4 text-center max-w-md">
          Tip: The crop area is locked to {aspectLabel} for consistency across your listing.
          Position your image to highlight the best parts.
        </p>
      </div>
    </div>
  );

  // Use portal to render at body level, escaping any overflow containers
  return createPortal(modalContent, document.body);
}
