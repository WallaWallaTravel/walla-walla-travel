'use client';

import React, { useRef, useState, useEffect } from 'react';
import { TouchButton } from './TouchButton';

interface SignatureCanvasProps {
  onSave: (signature: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  existingSignature?: string;
}

/**
 * SignatureCanvas - Touch-optimized signature capture
 * 
 * Features:
 * - Smooth drawing with touch or mouse
 * - Returns base64 PNG image
 * - Clear/Reset functionality
 * - Responsive canvas sizing
 * - Works on all mobile devices
 * 
 * Usage:
 * <SignatureCanvas
 *   onSave={(signature) => saveToDatabase(signature)}
 *   onClear={() => resetForm()}
 * />
 */
export function SignatureCanvas({
  onSave,
  onClear,
  disabled = false,
  existingSignature,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Drawing settings
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Load existing signature if provided
      if (existingSignature) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setIsEmpty(false);
        };
        img.src = existingSignature;
      }
    };

    updateSize();
    setContext(ctx);

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [existingSignature]);

  // Get position (works for both touch and mouse)
  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDrawing(true);
    
    const pos = getPosition(e);
    context?.beginPath();
    context?.moveTo(pos.x, pos.y);
    setIsEmpty(false);
  };

  // Draw
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    
    e.preventDefault();
    const pos = getPosition(e);
    context?.lineTo(pos.x, pos.y);
    context?.stroke();
  };

  // Stop drawing
  const stopDrawing = () => {
    setIsDrawing(false);
    context?.closePath();
  };

  // Clear canvas
  const handleClear = () => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    
    if (onClear) {
      onClear();
    }
  };

  // Save signature
  const handleSave = () => {
    if (isEmpty || disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert to base64 PNG
    const signature = canvas.toDataURL('image/png');
    onSave(signature);
  };

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-48 touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Helper text */}
      <p className="text-sm text-gray-800 text-center">
        {isEmpty ? 'Sign above with your finger or stylus' : 'Signature captured'}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        <TouchButton
          variant="secondary"
          size="medium"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          fullWidth
        >
          Clear
        </TouchButton>
        <TouchButton
          variant="primary"
          size="medium"
          onClick={handleSave}
          disabled={disabled || isEmpty}
          fullWidth
        >
          Save Signature
        </TouchButton>
      </div>
    </div>
  );
}
