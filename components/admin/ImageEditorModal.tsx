'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { logger } from '@/lib/logger';

// Aspect ratio presets
const ASPECT_RATIOS = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
] as const;

interface ImageEditorModalProps {
  imageFile: File;
  onSave: (editedBlob: Blob, fileName: string) => void;
  onCancel: () => void;
  initialAspectRatio?: number;
  maxOutputSize?: number;
  quality?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number | undefined
): Crop {
  if (!aspect) {
    // Free-form: default to 90% of the image
    return {
      unit: '%',
      x: 5,
      y: 5,
      width: 90,
      height: 90,
    };
  }
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

export default function ImageEditorModal({
  imageFile,
  onSave,
  onCancel,
  initialAspectRatio,
  maxOutputSize = 2000,
  quality = 0.92,
}: ImageEditorModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Edit state
  const [aspect, setAspect] = useState<number | undefined>(initialAspectRatio);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Wait for client-side mount before rendering portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Create object URL from file
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    },
    [aspect]
  );

  // Update crop when aspect ratio changes
  const handleAspectChange = useCallback((newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, newAspect));
    }
  }, []);

  // Rotation handlers
  const rotateLeft = useCallback(() => {
    setRotation((prev) => ((prev - 90 + 360) % 360) as 0 | 90 | 180 | 270);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  }, []);

  // Flip handlers
  const toggleFlipH = useCallback(() => setFlipH((prev) => !prev), []);
  const toggleFlipV = useCallback(() => setFlipV((prev) => !prev), []);

  // Process the image with all edits applied
  const processImage = useCallback(
    async (image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> => {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Calculate crop dimensions in natural image coordinates
      const cropX = pixelCrop.x * scaleX;
      const cropY = pixelCrop.y * scaleY;
      const cropWidth = pixelCrop.width * scaleX;
      const cropHeight = pixelCrop.height * scaleY;

      // Determine output dimensions based on rotation
      const isRotated90or270 = rotation === 90 || rotation === 270;
      let outputWidth = isRotated90or270 ? cropHeight : cropWidth;
      let outputHeight = isRotated90or270 ? cropWidth : cropHeight;

      // Scale down if exceeds max dimension
      if (outputWidth > maxOutputSize || outputHeight > maxOutputSize) {
        const ratio = Math.min(maxOutputSize / outputWidth, maxOutputSize / outputHeight);
        outputWidth *= ratio;
        outputHeight *= ratio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No 2d context');
      }

      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Move origin to center for transformations
      ctx.translate(outputWidth / 2, outputHeight / 2);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply flip
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      // Calculate draw dimensions (after rotation, coordinates change)
      const drawWidth = isRotated90or270 ? outputHeight : outputWidth;
      const drawHeight = isRotated90or270 ? outputWidth : outputHeight;

      // Draw the cropped image centered at origin
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
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
          quality
        );
      });
    },
    [rotation, flipH, flipV, maxOutputSize, quality]
  );

  const handleApplyEdit = async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    setIsProcessing(true);

    try {
      const editedBlob = await processImage(imgRef.current, completedCrop);
      // Generate a new filename with .jpg extension
      const baseName = imageFile.name.replace(/\.[^/.]+$/, '');
      const newFileName = `${baseName}-edited.jpg`;
      onSave(editedBlob, newFileName);
    } catch (error) {
      logger.error('Error processing image', { error });
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render until mounted (needed for portal)
  if (!mounted || !imageUrl) {
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
          <h2 className="text-xl font-semibold text-white">Edit Image</h2>
          <p className="text-white/60 text-sm mt-1">
            Crop, rotate, and flip your image
          </p>
        </div>

        {/* Aspect Ratio Selection */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => handleAspectChange(ratio.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                aspect === ratio.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>

        {/* Crop area */}
        <div
          className="relative max-h-[50vh] overflow-hidden rounded-lg"
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
          }}
        >
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-h-[50vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Required for react-image-crop ref */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Edit preview"
              onLoad={onImageLoad}
              className="max-h-[50vh] max-w-full"
              style={{ display: 'block' }}
            />
          </ReactCrop>
        </div>

        {/* Transform Controls */}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {/* Rotation */}
          <div className="flex gap-2">
            <button
              onClick={rotateLeft}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
              title="Rotate Left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Rotate Left
            </button>
            <button
              onClick={rotateRight}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
              title="Rotate Right"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
              Rotate Right
            </button>
          </div>

          {/* Flip */}
          <div className="flex gap-2">
            <button
              onClick={toggleFlipH}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                flipH ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Flip Horizontal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l-4-4 4-4m10 8l4-4-4-4M3 17h18" />
              </svg>
              Flip H
            </button>
            <button
              onClick={toggleFlipV}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                flipV ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Flip Vertical"
            >
              <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l-4-4 4-4m10 8l4-4-4-4M3 17h18" />
              </svg>
              Flip V
            </button>
          </div>
        </div>

        {/* Current rotation/flip indicator */}
        {(rotation !== 0 || flipH || flipV) && (
          <div className="mt-3 px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm">
            {rotation !== 0 && `Rotation: ${rotation}°`}
            {rotation !== 0 && (flipH || flipV) && ' | '}
            {flipH && 'Flipped H'}
            {flipH && flipV && ', '}
            {flipV && 'Flipped V'}
          </div>
        )}

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
            onClick={handleApplyEdit}
            disabled={isProcessing || !completedCrop}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                Apply Edit
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <p className="text-white/40 text-xs mt-4 text-center max-w-md">
          Tip: Drag to reposition the crop area, drag corners to resize.
          Use the controls above to rotate or flip the image.
        </p>
      </div>
    </div>
  );

  // Use portal to render at body level, escaping any overflow containers
  return createPortal(modalContent, document.body);
}
