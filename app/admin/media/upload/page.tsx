'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import ImageEditorModal from '@/components/admin/ImageEditorModal';

const MAX_WIDTH = 1920;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

interface FileEntry {
  id: string;
  file: File;
  preview: string;
  fileType: 'image' | 'video';
  title: string;
  alt_text: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  resized: boolean;
}

/**
 * Resize an image file to a max width using Canvas API.
 * Returns the original file if it's already small enough or not an image.
 */
async function resizeImage(file: File, maxWidth: number): Promise<{ file: File; resized: boolean }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.type === 'image/gif') {
    return { file, resized: false };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width <= maxWidth) {
        resolve({ file, resized: false });
        return;
      }

      const scale = maxWidth / img.width;
      const newWidth = maxWidth;
      const newHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ file, resized: false });
        return;
      }

      // Preserve original format for PNG/WebP (supports transparency), convert others to JPEG
      const preserveFormat = file.type === 'image/png' || file.type === 'image/webp';
      const outputType = preserveFormat ? file.type : 'image/jpeg';

      if (!preserveFormat) {
        // Fill white background for JPEG (no alpha support)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, newWidth, newHeight);
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
      };
      const newExt = extMap[outputType] || '.jpg';
      const newName = file.name.replace(/\.[^/.]+$/, newExt);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file, resized: false });
            return;
          }
          const resizedFile = new File([blob], newName, { type: outputType });
          resolve({ file: resizedFile, resized: true });
        },
        outputType,
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ file, resized: false });
    };

    img.src = url;
  });
}

export default function MediaUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-file state
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Shared metadata for batch
  const [batchCategory, setBatchCategory] = useState('winery');
  const [batchTags, setBatchTags] = useState('');
  const [batchIsHero, setBatchIsHero] = useState(false);

  // Single-file editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [pendingEditorFile, setPendingEditorFile] = useState<File | null>(null);

  const categories = [
    { value: 'winery', label: 'Winery', icon: '🍷' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { value: 'lodging', label: 'Lodging', icon: '🏨' },
    { value: 'shop', label: 'Shop', icon: '🛍️' },
    { value: 'service', label: 'Service', icon: '🚐' },
    { value: 'vehicle', label: 'Vehicle', icon: '🚙' },
    { value: 'location', label: 'Location', icon: '📍' },
    { value: 'brand', label: 'Brand', icon: '✨' },
  ];

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const validFiles: FileEntry[] = [];

    for (const file of Array.from(newFiles)) {
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) continue;

      // Auto-resize images client-side
      const { file: processedFile, resized } = isImage
        ? await resizeImage(file, MAX_WIDTH)
        : { file, resized: false };

      const preview = URL.createObjectURL(processedFile);
      const title = file.name.replace(/\.[^/.]+$/, '');

      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: processedFile,
        preview,
        fileType: isImage ? 'image' : 'video',
        title,
        alt_text: title,
        status: 'pending',
        progress: 0,
        resized,
      });
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      // Reset input so the same files can be re-selected
      e.target.value = '';
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFileField = (id: string, field: 'title' | 'alt_text', value: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  // Editor
  const handleOpenEditor = (entry: FileEntry) => {
    if (entry.fileType === 'image') {
      setEditingFileId(entry.id);
      setPendingEditorFile(entry.file);
      setShowEditor(true);
    }
  };

  const handleEditorSave = (editedBlob: Blob, fileName: string) => {
    if (!editingFileId) return;
    const editedFile = new File([editedBlob], fileName, { type: 'image/jpeg' });

    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === editingFileId) {
          URL.revokeObjectURL(f.preview);
          const newPreview = URL.createObjectURL(editedFile);
          return { ...f, file: editedFile, preview: newPreview, resized: true };
        }
        return f;
      })
    );

    setShowEditor(false);
    setEditingFileId(null);
    setPendingEditorFile(null);
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditingFileId(null);
    setPendingEditorFile(null);
  };

  // Upload all files
  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setUploadComplete(false);

    let successCount = 0;
    let errorCount = 0;

    for (const entry of pendingFiles) {
      // Mark uploading
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' as const, progress: 10 } : f))
      );

      try {
        const data = new FormData();
        data.append('file', entry.file);
        data.append('category', batchCategory);
        data.append('title', entry.title);
        data.append('alt_text', entry.alt_text);
        data.append('tags', batchTags);
        data.append('is_hero', batchIsHero.toString());
        data.append('subcategory', '');
        data.append('description', '');

        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, progress: 40 } : f))
        );

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: data,
        });

        const result = await response.json();

        if (result.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id ? { ...f, status: 'done' as const, progress: 100 } : f
            )
          );
          successCount++;
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: 'error' as const, progress: 0, error: result.error }
                : f
            )
          );
          errorCount++;
        }
      } catch (error) {
        logger.error('Upload error', { error, fileId: entry.id });
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'error' as const, progress: 0, error: 'Network error' }
              : f
          )
        );
        errorCount++;
      }
    }

    setUploading(false);
    setUploadComplete(true);

    if (errorCount === 0 && successCount > 0) {
      // All succeeded — redirect after a short delay
      setTimeout(() => router.push('/admin/media'), 1500);
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/media"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-bold mb-4"
          >
            ← Back to Media Library
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Upload Media</h1>
          <p className="text-gray-700">
            Add photos or videos to your media library. Select multiple files at once.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer mb-6 bg-white"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileInputChange}
            className="hidden"
            multiple
          />
          <div className="text-5xl mb-4">📸</div>
          <p className="text-lg font-bold text-gray-900 mb-2">
            Click to select files or drag and drop
          </p>
          <p className="text-sm text-gray-700">
            JPG, PNG, WebP, GIF, MP4, or WebM — select multiple files at once
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Images larger than 1920px wide are automatically resized
          </p>
        </div>

        {/* File Queue */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </h2>
                <div className="flex items-center gap-3 text-sm">
                  {doneCount > 0 && (
                    <span className="text-green-700 font-medium">{doneCount} uploaded</span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-red-700 font-medium">{errorCount} failed</span>
                  )}
                  {pendingCount > 0 && (
                    <span className="text-gray-600">{pendingCount} pending</span>
                  )}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {files.map((entry) => (
                <div key={entry.id} className="p-4 flex gap-4 items-start">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                    {entry.fileType === 'image' ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={entry.preview}
                        alt={entry.alt_text}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-gray-200">
                        🎬
                      </div>
                    )}
                    {entry.resized && (
                      <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-[10px] text-center py-0.5 font-medium">
                        Resized
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      value={entry.title}
                      onChange={(e) => updateFileField(entry.id, 'title', e.target.value)}
                      placeholder="Title"
                      aria-label={`Title for ${entry.file.name}`}
                      disabled={entry.status !== 'pending'}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50 disabled:text-gray-600"
                    />
                    <input
                      type="text"
                      value={entry.alt_text}
                      onChange={(e) => updateFileField(entry.id, 'alt_text', e.target.value)}
                      placeholder="Alt text (for accessibility)"
                      aria-label={`Alt text for ${entry.file.name}`}
                      disabled={entry.status !== 'pending'}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50 disabled:text-gray-600"
                    />
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>{(entry.file.size / 1024).toFixed(0)} KB</span>
                      <span>·</span>
                      <span>{entry.file.type}</span>
                    </div>
                  </div>

                  {/* Status / Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {entry.status === 'pending' && (
                      <div className="flex gap-1">
                        {entry.fileType === 'image' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditor(entry)}
                            className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(entry.id)}
                          className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {entry.status === 'uploading' && (
                      <div className="w-24">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all duration-300"
                            style={{ width: `${entry.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1 text-center">Uploading...</p>
                      </div>
                    )}
                    {entry.status === 'done' && (
                      <span className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium">
                        Uploaded
                      </span>
                    )}
                    {entry.status === 'error' && (
                      <div className="text-right">
                        <span className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg font-medium">
                          Failed
                        </span>
                        {entry.error && (
                          <p className="text-xs text-red-600 mt-1">{entry.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch Settings */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Batch Settings</h2>
            <p className="text-sm text-gray-700 mb-4">
              These settings apply to all files in this upload batch.
            </p>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">Category</label>
              <div className="grid grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setBatchCategory(cat.value)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      batchCategory === cat.value
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <div className="text-xs font-bold text-gray-900">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Tags (applied to all files)
              </label>
              <input
                type="text"
                value={batchTags}
                onChange={(e) => setBatchTags(e.target.value)}
                placeholder="wine, tasting, outdoor, summer (comma-separated)"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
              <p className="text-sm text-gray-600 mt-2">
                Tags help the AI match images to content suggestions automatically
              </p>
            </div>

            {/* Hero Image */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchIsHero}
                  onChange={(e) => setBatchIsHero(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-bold text-gray-900">
                  Set as hero images for this category
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {pendingCount > 0 && (
          <button
            onClick={handleUploadAll}
            disabled={uploading}
            className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-sm mb-6"
          >
            {uploading
              ? 'Uploading...'
              : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
          </button>
        )}

        {/* Success Banner */}
        {uploadComplete && errorCount === 0 && doneCount > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-6 text-center">
            All {doneCount} file{doneCount !== 1 ? 's' : ''} uploaded successfully! Redirecting...
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Tips for Great Media</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              <strong>Auto-Resize:</strong> Images wider than 1920px are automatically resized before
              upload, saving storage and bandwidth
            </li>
            <li>
              <strong>Tags Matter:</strong> Tags like &quot;wine&quot;, &quot;vineyard&quot;, &quot;event&quot; help the AI automatically
              match photos to content suggestions
            </li>
            <li>
              <strong>Good Lighting:</strong> Well-lit photos perform better on social media
            </li>
            <li>
              <strong>Alt Text:</strong> Improves accessibility and search rankings
            </li>
            <li>
              <strong>Edit Images:</strong> Use the Edit button to crop, rotate, or flip before
              uploading
            </li>
          </ul>
        </div>
      </div>

      {/* Image Editor Modal */}
      {showEditor && pendingEditorFile && (
        <ImageEditorModal
          imageFile={pendingEditorFile}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  );
}
