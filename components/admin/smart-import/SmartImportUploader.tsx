'use client';

import { useState, useRef, useCallback } from 'react';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAX_FILES } from '@/lib/import/types';
import type { SmartImportResult } from '@/lib/import/types';

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.webp';
const MAX_SIZE_MB = Math.round(MAX_FILE_SIZE / 1024 / 1024);

type ImportStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

interface SmartImportUploaderProps {
  onResult: (result: SmartImportResult) => void;
  onError: (message: string) => void;
}

function getFileIcon(type: string): string {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || type.includes('document')) return 'DOC';
  if (type.includes('sheet') || type.includes('excel')) return 'XLS';
  if (type.includes('csv')) return 'CSV';
  if (type.includes('image')) return 'IMG';
  return 'FILE';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SmartImportUploader({ onResult, onError }: SmartImportUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const allowedTypes = ALLOWED_MIME_TYPES as readonly string[];

    // Validate types
    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        onError(`"${file.name}" is not a supported file type. Use PDF, Word, Excel, CSV, or images.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        onError(`"${file.name}" exceeds the ${MAX_SIZE_MB}MB size limit.`);
        return;
      }
    }

    setFiles(prev => {
      const combined = [...prev, ...fileArray];
      if (combined.length > MAX_FILES) {
        onError(`Maximum ${MAX_FILES} files allowed.`);
        return prev;
      }
      return combined;
    });
  }, [onError]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setStatus('uploading');

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      setStatus('analyzing');

      const response = await fetch('/api/admin/trip-proposals/smart-import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        setStatus('error');
        onError(result.error || 'Import failed');
        return;
      }

      setStatus('complete');
      onResult(result.data);
    } catch {
      setStatus('error');
      onError('Network error — please check your connection and try again.');
    }
  };

  const reset = () => {
    setFiles([]);
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  const isProcessing = status === 'uploading' || status === 'analyzing';

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!isProcessing && status !== 'complete' && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload files for smart import. Drop files here or press Enter to browse."
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleKeyDown}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
            dragOver
              ? 'border-brand bg-brand-light'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <div className="text-gray-700">
            <p className="font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-600 mt-1">
              PDF, Word, Excel, CSV, or images — up to {MAX_FILES} files, {MAX_SIZE_MB}MB each
            </p>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && !isProcessing && status !== 'complete' && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 shrink-0">
                  {getFileIcon(file.type)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-gray-600 hover:text-red-600 text-sm font-medium ml-2 shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Progress indicator */}
      {isProcessing && (
        <div className="flex flex-col items-center py-8 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-brand" />
          <div className="text-center">
            <p className="font-medium text-gray-900">
              {status === 'uploading' ? 'Uploading files...' : 'AI is analyzing your documents...'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {status === 'analyzing' && 'This typically takes 5-15 seconds'}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isProcessing && status !== 'complete' && files.length > 0 && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors"
          >
            Analyze Files
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Error state retry */}
      {status === 'error' && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
