'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PreviewData {
  business_name: string;
  slug: string;
  description: string;
  short_description: string;
  hero_image_url: string | null;
  location: string;
  price_range: string;
  features: string[];
  experience_tags: string[];
  specialties: string[];
  hours: Record<string, { open: string; close: string; closed: boolean }>;
  // Narrative content
  origin_story: string | null;
  philosophy: string | null;
  what_makes_unique: string | null;
  // Tips
  insider_tips: Array<{
    tip_type: string;
    title: string;
    content: string;
  }>;
  // Photos
  photos: Record<string, Array<{
    id: number;
    url: string;
    alt_text: string | null;
  }>>;
}

const TIP_ICONS: Record<string, string> = {
  'locals_know': '🏠',
  'best_time': '⏰',
  'what_to_ask': '💬',
  'pairing': '🧀',
  'photo_spot': '📸',
  'hidden_gem': '💎',
  'practical': '📋',
};

const TIP_LABELS: Record<string, string> = {
  'locals_know': 'What Locals Know',
  'best_time': 'Best Time to Visit',
  'what_to_ask': 'What to Ask For',
  'pairing': 'Pairing Tip',
  'photo_spot': 'Photo Spot',
  'hidden_gem': 'Hidden Gem',
  'practical': 'Practical Info',
};

export default function PartnerPreviewPage() {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'story' | 'tips' | 'photos'>('overview');

  useEffect(() => {
    async function fetchPreview() {
      try {
        const response = await fetch('/api/partner/preview');
        if (response.ok) {
          const data = await response.json();
          setPreview(data.preview);
        }
      } catch (error) {
        console.error('Failed to load preview:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-amber-800">Unable to load preview. Please complete your listing first.</p>
        </div>
      </div>
    );
  }

  const hasStory = preview.origin_story || preview.philosophy || preview.what_makes_unique;
  const hasTips = preview.insider_tips && preview.insider_tips.length > 0;
  const hasPhotos = preview.photos && Object.keys(preview.photos).length > 0;
  const photoCount = hasPhotos ? Object.values(preview.photos).reduce((sum, arr) => sum + arr.length, 0) : 0;
  const heroPhoto = preview.photos?.hero?.[0]?.url || preview.hero_image_url;
  const missingContent: string[] = [];

  if (!preview.origin_story) missingContent.push('Origin Story');
  if (!preview.philosophy) missingContent.push('Winemaking Philosophy');
  if (!preview.what_makes_unique) missingContent.push('What Makes You Unique');
  if (!hasTips) missingContent.push('Insider Tips');
  if (!hasPhotos) missingContent.push('Photos');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Preview Your Listing</h1>
          <p className="text-slate-500 mt-1">This is how visitors will experience your page</p>
        </div>
        <Link
          href="/partner-portal/dashboard"
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Missing Content Alert */}
      {missingContent.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-900">Your listing is incomplete</p>
              <p className="text-sm text-amber-700 mt-1">
                Missing: {missingContent.join(', ')}.
                <span className="font-medium"> Complete these to stand out from other wineries.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Frame */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
        {/* Browser Chrome */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-md px-3 py-1.5 text-sm text-slate-500 border border-slate-200">
              wallawalla.travel/wineries/{preview.slug || 'your-winery'}
            </div>
          </div>
        </div>

        {/* Actual Preview Content */}
        <div className="max-h-[600px] overflow-y-auto">
          {/* Hero Section */}
          <div className="relative h-64 bg-gradient-to-br from-[#722F37] to-[#8B1538]">
            {heroPhoto ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${heroPhoto})` }}
              >
                <div className="absolute inset-0 bg-black/40"></div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/60 text-sm">No hero image uploaded</p>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h1 className="text-3xl font-bold">{preview.business_name}</h1>
              {preview.short_description && (
                <p className="text-lg text-white/80 mt-2">{preview.short_description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
                {preview.location && <span>📍 {preview.location}</span>}
                {preview.price_range && <span>💰 {preview.price_range}</span>}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-rose-700 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('story')}
                className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'story'
                    ? 'border-rose-700 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Our Story {!hasStory && <span className="text-amber-500">•</span>}
              </button>
              <button
                onClick={() => setActiveTab('tips')}
                className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'tips'
                    ? 'border-rose-700 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Insider Tips {!hasTips && <span className="text-amber-500">•</span>}
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'photos'
                    ? 'border-rose-700 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Photos {photoCount > 0 ? `(${photoCount})` : ''} {!hasPhotos && <span className="text-amber-500">•</span>}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Description */}
                {preview.description ? (
                  <p className="text-slate-600 leading-relaxed">{preview.description}</p>
                ) : (
                  <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center">
                    <p className="text-slate-400">No description yet</p>
                    <Link href="/partner-portal/listing" className="text-sm text-rose-700 hover:underline">
                      Add description →
                    </Link>
                  </div>
                )}

                {/* Experience Tags */}
                {preview.experience_tags && preview.experience_tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Experience Style</h3>
                    <div className="flex flex-wrap gap-2">
                      {preview.experience_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specialties */}
                {preview.specialties && preview.specialties.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Known For</h3>
                    <div className="flex flex-wrap gap-2">
                      {preview.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {preview.features && preview.features.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {preview.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'story' && (
              <div className="space-y-8">
                {preview.origin_story ? (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Our Origin Story</h3>
                    <p className="text-slate-600 leading-relaxed">{preview.origin_story}</p>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-rose-200 rounded-xl text-center bg-rose-50">
                    <p className="text-rose-700 font-medium">Origin Story Missing</p>
                    <p className="text-rose-500 text-sm mt-1">This is where visitors connect with your beginnings</p>
                    <Link href="/partner-portal/story" className="inline-block mt-3 px-4 py-2 bg-rose-700 text-white rounded-lg text-sm hover:bg-rose-800">
                      Add Your Story →
                    </Link>
                  </div>
                )}

                {preview.philosophy ? (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Our Philosophy</h3>
                    <p className="text-slate-600 leading-relaxed">{preview.philosophy}</p>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-slate-500">Philosophy section not yet added</p>
                    <Link href="/partner-portal/story" className="text-sm text-rose-700 hover:underline">
                      Add philosophy →
                    </Link>
                  </div>
                )}

                {preview.what_makes_unique ? (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">What Makes Us Unique</h3>
                    <p className="text-slate-600 leading-relaxed">{preview.what_makes_unique}</p>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-slate-500">Unique story not yet added</p>
                    <Link href="/partner-portal/story" className="text-sm text-rose-700 hover:underline">
                      Add what makes you unique →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tips' && (
              <div>
                {hasTips ? (
                  <div className="space-y-4">
                    {preview.insider_tips.map((tip, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl">
                        <span className="text-2xl">{TIP_ICONS[tip.tip_type] || '💡'}</span>
                        <div>
                          <div className="text-sm text-amber-700 font-medium">
                            {TIP_LABELS[tip.tip_type] || 'Tip'}
                          </div>
                          {tip.title && <h4 className="font-medium text-slate-900">{tip.title}</h4>}
                          <p className="text-slate-600 mt-1">{tip.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-amber-200 rounded-xl text-center bg-amber-50">
                    <p className="text-amber-700 font-medium text-lg">No Insider Tips Yet</p>
                    <p className="text-amber-600 mt-2">
                      This is where the magic happens. Insider tips make visitors feel like VIPs
                      and create memorable experiences they&apos;ll tell friends about.
                    </p>
                    <Link href="/partner-portal/tips" className="inline-block mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                      Add Insider Tips →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'photos' && (
              <div>
                {hasPhotos ? (
                  <div className="space-y-6">
                    {Object.entries(preview.photos).map(([category, categoryPhotos]) => (
                      <div key={category}>
                        <h3 className="text-sm font-medium text-slate-500 mb-3 capitalize">
                          {category.replace('_', ' ')} ({categoryPhotos.length})
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {categoryPhotos.map((photo) => (
                            <div
                              key={photo.id}
                              className="aspect-video rounded-lg overflow-hidden bg-slate-100"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={photo.alt_text || category}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-rose-200 rounded-xl text-center bg-rose-50">
                    <p className="text-rose-700 font-medium text-lg">No Photos Yet</p>
                    <p className="text-rose-700 mt-2">
                      Photos help visitors picture themselves at your winery.
                      Great photos turn browsers into visitors.
                    </p>
                    <Link href="/partner-portal/media" className="inline-block mt-4 px-4 py-2 bg-rose-700 text-white rounded-lg text-sm hover:bg-rose-800">
                      Add Photos →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Hint */}
      <div className="mt-6 bg-slate-50 rounded-xl p-4 text-center">
        <p className="text-slate-600">
          <span className="font-medium">Pro tip:</span> Visitors compare multiple wineries before deciding.
          Listings with complete stories and insider tips get <span className="text-emerald-600 font-medium">significantly more engagement</span>.
        </p>
      </div>
    </div>
  );
}
