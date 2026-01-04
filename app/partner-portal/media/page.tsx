'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ImageCropModal from '@/components/partner/ImageCropModal';

// Pending image for cropping
interface PendingImage {
  file: File;
  url: string;
  category: string;
}

// Photo category definitions
const PHOTO_CATEGORIES = [
  {
    id: 'hero',
    title: 'Hero Photo',
    subtitle: 'The shot that represents your winery',
    description: 'This appears at the top of your listing. Make it count.',
    tip: 'Wide shots of your building or vineyard with great lighting work best.',
    icon: '🏆',
    maxPhotos: 1,
    aspectRatio: '16:9',
  },
  {
    id: 'tasting_room',
    title: 'Tasting Room',
    subtitle: 'Where the magic happens',
    description: 'Show visitors the space where they\'ll enjoy your wines.',
    tip: 'Natural light works best. Capture the atmosphere, not just the furniture.',
    icon: '🍷',
    maxPhotos: 5,
    aspectRatio: '4:3',
  },
  {
    id: 'vineyard',
    title: 'Vineyard & Grounds',
    subtitle: 'Your slice of wine country',
    description: 'The landscape that makes Walla Walla special.',
    tip: 'Golden hour (early morning or sunset) creates stunning vineyard shots.',
    icon: '🌿',
    maxPhotos: 5,
    aspectRatio: '16:9',
  },
  {
    id: 'wine',
    title: 'Wine & Products',
    subtitle: 'What you\'re proud to pour',
    description: 'Showcase your bottles, labels, and signature wines.',
    tip: 'Clean backgrounds and consistent styling help bottles stand out.',
    icon: '🍾',
    maxPhotos: 5,
    aspectRatio: '4:3',
  },
  {
    id: 'team',
    title: 'Team & Hospitality',
    subtitle: 'The faces behind the wine',
    description: 'People connect with people. Show your team\'s personality.',
    tip: 'Candid moments often feel more authentic than posed portraits.',
    icon: '👥',
    maxPhotos: 5,
    aspectRatio: '4:3',
  },
  {
    id: 'experience',
    title: 'Experience Moments',
    subtitle: 'Guests enjoying your space',
    description: 'Help visitors imagine themselves at your winery.',
    tip: 'Photos of people enjoying your space perform better than empty rooms.',
    icon: '✨',
    maxPhotos: 5,
    aspectRatio: '4:3',
  },
];

interface Photo {
  id: number;
  media_id: number;
  url: string;
  category: string;
  alt_text: string;
  display_order: number;
  is_primary?: boolean;
  created_at?: string;
}

interface CategoryPhotos {
  [key: string]: Photo[];
}

export default function PhotosMediaPage() {
  const [photos, setPhotos] = useState<CategoryPhotos>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['hero']));
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Crop modal state
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  // Fetch existing photos on mount
  useEffect(() => {
    async function fetchPhotos() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/partner/photos');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch photos');
        }

        if (data.success && data.photos) {
          setPhotos(data.photos);
        }
      } catch (err) {
        console.error('Error fetching photos:', err);
        setError(err instanceof Error ? err.message : 'Failed to load photos');
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, []);

  // Calculate progress
  const categoriesWithPhotos = PHOTO_CATEGORIES.filter(
    cat => (photos[cat.id]?.length || 0) > 0
  ).length;
  const progressPercent = Math.round((categoriesWithPhotos / PHOTO_CATEGORIES.length) * 100);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Open crop modal when file is selected
  const handleFileSelect = useCallback((categoryId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const category = PHOTO_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    const currentPhotos = photos[categoryId] || [];
    const remainingSlots = category.maxPhotos - currentPhotos.length;

    if (remainingSlots <= 0) {
      alert(`Maximum ${category.maxPhotos} photo(s) allowed for ${category.title}`);
      return;
    }

    // Take first file only (crop one at a time)
    const file = files[0];

    // Validate file
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // Allow larger files since we'll compress during crop
      alert('File size must be under 10MB.');
      return;
    }

    // Create object URL for preview and open crop modal
    const imageUrl = URL.createObjectURL(file);
    setPendingImage({ file, url: imageUrl, category: categoryId });
    setCropModalOpen(true);
  }, [photos]);

  // Handle cropped image upload
  const handleCropComplete = useCallback(async (croppedBlob: Blob, fileName: string) => {
    if (!pendingImage) return;

    const categoryId = pendingImage.category;

    // Clean up the object URL
    URL.revokeObjectURL(pendingImage.url);
    setCropModalOpen(false);
    setPendingImage(null);
    setUploading(categoryId);

    try {
      // Create a File from the Blob
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', croppedFile);
      formData.append('category', categoryId);

      const response = await fetch('/api/partner/photos', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to upload photo');
      }

      // Add the uploaded photo to state
      const newPhoto: Photo = {
        id: data.photo.id,
        media_id: data.photo.media_id,
        url: data.photo.url,
        category: categoryId,
        alt_text: data.photo.alt_text || '',
        display_order: data.photo.display_order,
      };

      setPhotos(prev => ({
        ...prev,
        [categoryId]: [...(prev[categoryId] || []), newPhoto],
      }));
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(null);
    }
  }, [pendingImage]);

  // Handle crop cancel
  const handleCropCancel = useCallback(() => {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.url);
    }
    setCropModalOpen(false);
    setPendingImage(null);

    // Reset file input
    if (pendingImage) {
      const inputRef = fileInputRefs.current[pendingImage.category];
      if (inputRef) {
        inputRef.value = '';
      }
    }
  }, [pendingImage]);

  const handleDrop = useCallback((categoryId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    handleFileSelect(categoryId, e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((categoryId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(categoryId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const removePhoto = useCallback(async (categoryId: string, photoId: number) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      const response = await fetch(`/api/partner/photos?id=${photoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete photo');
      }

      // Remove from state
      setPhotos(prev => ({
        ...prev,
        [categoryId]: (prev[categoryId] || []).filter(p => p.id !== photoId),
      }));
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete photo');
    }
  }, []);

  const triggerFileInput = (categoryId: string) => {
    fileInputRefs.current[categoryId]?.click();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Photos & Media</h1>
          <p className="text-slate-500 mt-1">Show visitors what makes your space special</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
          <span className="ml-3 text-slate-500">Loading your photos...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Photos & Media</h1>
          <p className="text-slate-500 mt-1">Show visitors what makes your space special</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Photos & Media</h1>
        <p className="text-slate-500 mt-1">Show visitors what makes your space special</p>
      </div>

      {/* Why Photos Matter - TOP of page */}
      <div className="bg-gradient-to-br from-purple-50 to-amber-50 rounded-2xl p-6 mb-8 border border-purple-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
            📸
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Why Photos Matter</h2>
            <p className="text-slate-600 mt-2">
              Visitors browse dozens of wineries before deciding where to go. Your photos help them
              picture themselves at <strong>your</strong> tasting bar, in <strong>your</strong> vineyard,
              meeting <strong>your</strong> team. Great photos turn browsers into visitors.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">👁️</div>
                <div className="text-xs text-slate-500">first impressions</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">💭</div>
                <div className="text-xs text-slate-500">help visitors imagine</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">🎯</div>
                <div className="text-xs text-slate-500">stand out from others</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Photo Coverage</span>
          <span className="text-sm text-slate-500">{categoriesWithPhotos} of {PHOTO_CATEGORIES.length} categories</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {progressPercent === 100 && (
          <p className="text-emerald-600 text-sm mt-2 font-medium">
            Great job! All categories have photos.
          </p>
        )}
      </div>

      {/* Photo Categories */}
      <div className="space-y-4 mb-8">
        {PHOTO_CATEGORIES.map((category) => {
          const categoryPhotos = photos[category.id] || [];
          const isExpanded = expandedCategories.has(category.id);
          const hasPhotos = categoryPhotos.length > 0;
          const isFull = categoryPhotos.length >= category.maxPhotos;

          return (
            <div
              key={category.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{category.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">{category.title}</div>
                    <div className="text-sm text-slate-500">{category.subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Photo count badge */}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    hasPhotos
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {categoryPhotos.length}/{category.maxPhotos}
                  </div>
                  {/* Expand/collapse icon */}
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-slate-100">
                  {/* Category description and tip */}
                  <div className="py-4">
                    <p className="text-slate-600 text-sm">{category.description}</p>
                    <div className="mt-2 flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
                      <span>💡</span>
                      <span className="text-sm">{category.tip}</span>
                    </div>
                  </div>

                  {/* Existing photos */}
                  {categoryPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {categoryPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 group"
                        >
                          <img
                            src={photo.url}
                            alt={photo.alt_text || category.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removePhoto(category.id, photo.id)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload zone */}
                  {!isFull && (
                    <div
                      onDrop={(e) => handleDrop(category.id, e)}
                      onDragOver={(e) => handleDragOver(category.id, e)}
                      onDragLeave={handleDragLeave}
                      onClick={() => triggerFileInput(category.id)}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                        dragOver === category.id
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                      } ${uploading === category.id ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <input
                        ref={(el) => { fileInputRefs.current[category.id] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple={category.maxPhotos > 1}
                        onChange={(e) => handleFileSelect(category.id, e.target.files)}
                        className="hidden"
                      />
                      {uploading === category.id ? (
                        <div className="text-slate-500">
                          <div className="w-8 h-8 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                          Uploading...
                        </div>
                      ) : (
                        <>
                          <div className="text-4xl mb-2">📤</div>
                          <p className="text-slate-600 font-medium">
                            Drop photos here or click to browse
                          </p>
                          <p className="text-slate-400 text-sm mt-1">
                            JPG, PNG, or WebP up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {isFull && (
                    <div className="bg-emerald-50 rounded-lg p-3 text-center text-emerald-700 text-sm">
                      ✓ Maximum photos reached for this category
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Photo Guidelines (collapsible) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
        <button
          onClick={() => setShowGuidelines(!showGuidelines)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <span className="font-semibold text-slate-900">Photo Guidelines</span>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${showGuidelines ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showGuidelines && (
          <div className="px-6 pb-6 border-t border-slate-100">
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              {/* Recommended */}
              <div>
                <h3 className="font-medium text-emerald-700 mb-3 flex items-center gap-2">
                  <span>✓</span> Recommended
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    Landscape orientation for most photos
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    Natural lighting when possible
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    Real moments, not staged
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    Minimum 1200px wide for quality
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    Include people when appropriate
                  </li>
                </ul>
              </div>

              {/* Avoid */}
              <div>
                <h3 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                  <span>✗</span> Avoid
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Blurry or low-resolution images
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Stock photos (visitors want authenticity)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Heavy filters or extreme editing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Cluttered or messy backgrounds
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Photos with visible dates/timestamps
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600">
                <strong>Pro tip:</strong> Photos showing people enjoying your space perform better than empty rooms.
                Visitors want to see themselves in your winery.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Link */}
      <div className="bg-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Preview Your Photos</h3>
            <p className="text-slate-400 text-sm">See how your photos appear to visitors</p>
          </div>
          <a
            href="/partner-portal/preview"
            className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            Preview Listing →
          </a>
        </div>
      </div>

      {/* Crop Modal */}
      {cropModalOpen && pendingImage && (
        <ImageCropModal
          imageUrl={pendingImage.url}
          fileName={pendingImage.file.name}
          category={pendingImage.category}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
