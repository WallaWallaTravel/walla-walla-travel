'use client';

/**
 * Partner Detail Page
 *
 * View partner info, linked business data, and content quality/SEO scoring.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface Partner {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  business_name: string;
  business_type: string;
  winery_id: number | null;
  hotel_id: number | null;
  restaurant_id: number | null;
  status: 'pending' | 'active' | 'suspended';
  invited_by: number | null;
  invited_at: string | null;
  setup_completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LinkedWinery {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cover_photo_url: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  specialties: string[] | null;
  amenities: string[] | null;
  hours_of_operation: Record<string, unknown> | null;
  tasting_fee: string | null;
  reservation_required: boolean | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  founded_year: number | null;
  winemaker: string | null;
  keywords: string[] | null;
  logo_url: string | null;
}

interface WineryContent {
  content_type: string;
  title: string;
  content: string;
}

interface PartnerData {
  partner: Partner;
  linkedWinery: LinkedWinery | null;
  wineryContent: WineryContent[];
  insiderTipsCount: number;
  photoCount: number;
}

// ============================================================================
// SEO / Directory Quality Score
// ============================================================================

interface ScoreItem {
  key: string;
  label: string;
  status: 'good' | 'ok' | 'missing';
  tip: string;
  category: 'basics' | 'content' | 'seo' | 'media';
}

function DirectoryQualityPanel({ data }: { data: PartnerData }) {
  const items: ScoreItem[] = useMemo(() => {
    const w = data.linkedWinery;
    const content = data.wineryContent;

    if (!w) {
      return [
        {
          key: 'linked',
          label: 'Linked business',
          status: 'missing',
          tip: 'No winery/business linked yet — link a business to enable quality scoring',
          category: 'basics',
        },
      ];
    }

    const hasOriginStory = content.some(
      (c) => c.content_type === 'origin_story' && c.content.length > 50
    );
    const hasPhilosophy = content.some(
      (c) => c.content_type === 'philosophy' && c.content.length > 50
    );
    const hasUniqueStory = content.some(
      (c) => c.content_type === 'unique_story' && c.content.length > 50
    );
    const descLen = (w.short_description || '').length;

    return [
      // Basics
      {
        key: 'description',
        label: 'Business description',
        status: descLen >= 100 ? 'good' : descLen > 0 ? 'ok' : 'missing',
        tip:
          descLen >= 100
            ? `${descLen} characters — good length for search results`
            : descLen > 0
              ? `${descLen} characters — aim for 100+ for better search visibility`
              : 'Add a description — this is the first thing visitors read',
        category: 'basics',
      },
      {
        key: 'contact',
        label: 'Contact info',
        status: w.phone && w.email ? 'good' : w.phone || w.email ? 'ok' : 'missing',
        tip:
          w.phone && w.email
            ? 'Phone and email set'
            : 'Complete contact info helps visitors reach you and builds trust with search engines',
        category: 'basics',
      },
      {
        key: 'address',
        label: 'Address',
        status: w.address ? 'good' : 'missing',
        tip: w.address
          ? 'Address helps with local search (Google Maps, "near me" searches)'
          : 'Add an address — critical for local search visibility ("wineries near me")',
        category: 'basics',
      },
      {
        key: 'hours',
        label: 'Hours of operation',
        status: w.hours_of_operation ? 'good' : 'missing',
        tip: w.hours_of_operation
          ? 'Hours set — visitors know when to visit'
          : 'Add hours — Google shows this in search results and Maps',
        category: 'basics',
      },
      {
        key: 'website',
        label: 'Website URL',
        status: w.website ? 'good' : 'ok',
        tip: w.website ? 'Website linked' : 'Link your website for more visitor traffic',
        category: 'basics',
      },

      // Content / Stories
      {
        key: 'origin_story',
        label: 'Origin story',
        status: hasOriginStory ? 'good' : 'missing',
        tip: hasOriginStory
          ? 'Origin story adds personality and depth — great for AI recommendations'
          : 'Tell your founding story — this gives the AI guide rich detail to share with visitors',
        category: 'content',
      },
      {
        key: 'philosophy',
        label: 'Winemaking philosophy',
        status: hasPhilosophy ? 'good' : 'missing',
        tip: hasPhilosophy
          ? 'Philosophy helps match you with the right visitors'
          : 'Share your winemaking approach — helps the AI match you with interested visitors',
        category: 'content',
      },
      {
        key: 'unique_story',
        label: 'What makes you unique',
        status: hasUniqueStory ? 'good' : 'ok',
        tip: hasUniqueStory
          ? 'Unique differentiator helps you stand out in search and AI answers'
          : 'What sets you apart? This helps you stand out in search results and AI recommendations',
        category: 'content',
      },
      {
        key: 'insider_tips',
        label: 'Insider tips',
        status:
          data.insiderTipsCount >= 3
            ? 'good'
            : data.insiderTipsCount > 0
              ? 'ok'
              : 'missing',
        tip:
          data.insiderTipsCount >= 3
            ? `${data.insiderTipsCount} tips — gives the AI plenty to share with visitors`
            : data.insiderTipsCount > 0
              ? `${data.insiderTipsCount} tip(s) — aim for 3+ for richer AI recommendations`
              : 'Add insider tips — the AI guide uses these to give personalized recommendations',
        category: 'content',
      },
      {
        key: 'specialties',
        label: 'Wine specialties',
        status:
          w.specialties && w.specialties.length > 0 ? 'good' : 'missing',
        tip:
          w.specialties && w.specialties.length > 0
            ? `${w.specialties.length} specialties listed — helps with "best Cab Sauv in Walla Walla" searches`
            : 'List wine specialties — visitors search for specific varieties',
        category: 'content',
      },

      // SEO
      {
        key: 'meta_title',
        label: 'SEO title',
        status: w.meta_title ? 'good' : 'ok',
        tip: w.meta_title
          ? 'Custom SEO title set'
          : 'Custom SEO title helps control how you appear in Google results',
        category: 'seo',
      },
      {
        key: 'meta_description',
        label: 'SEO description',
        status: w.meta_description ? 'good' : 'ok',
        tip: w.meta_description
          ? 'Custom meta description set — this appears in Google search results'
          : 'Add a meta description — controls the snippet shown in Google results',
        category: 'seo',
      },
      {
        key: 'keywords',
        label: 'Search keywords',
        status: w.keywords && w.keywords.length > 0 ? 'good' : 'ok',
        tip:
          w.keywords && w.keywords.length > 0
            ? `${w.keywords.length} keywords set`
            : 'Add keywords to help match visitor searches',
        category: 'seo',
      },

      // Media
      {
        key: 'cover_photo',
        label: 'Cover photo',
        status: w.cover_photo_url ? 'good' : 'missing',
        tip: w.cover_photo_url
          ? 'Cover photo set — images get more clicks in search results'
          : 'Add a cover photo — listings with images get significantly more clicks',
        category: 'media',
      },
      {
        key: 'photos',
        label: 'Photo gallery',
        status:
          data.photoCount >= 5
            ? 'good'
            : data.photoCount > 0
              ? 'ok'
              : 'missing',
        tip:
          data.photoCount >= 5
            ? `${data.photoCount} photos — great visual presence`
            : data.photoCount > 0
              ? `${data.photoCount} photo(s) — aim for 5+ for a compelling listing`
              : 'Add photos — visitors expect to see what to expect before visiting',
        category: 'media',
      },
    ];
  }, [data]);

  const goodCount = items.filter((i) => i.status === 'good').length;
  const total = items.length;
  const percentage = Math.round((goodCount / total) * 100);

  const categories = [
    { key: 'basics', label: 'Basics' },
    { key: 'content', label: 'Content & Stories' },
    { key: 'seo', label: 'Search Optimization' },
    { key: 'media', label: 'Photos & Media' },
  ] as const;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Directory Listing Quality
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentage >= 80
                  ? 'bg-green-500'
                  : percentage >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-400'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span
            className={`text-sm font-medium ${
              percentage >= 80
                ? 'text-green-700'
                : percentage >= 50
                  ? 'text-amber-700'
                  : 'text-red-600'
            }`}
          >
            {goodCount}/{total}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Complete these items to maximize visibility in Google, AI assistants, and
        the Walla Walla Travel directory.
      </p>

      <div className="space-y-6">
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category === cat.key);
          if (catItems.length === 0) return null;

          return (
            <div key={cat.key}>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                {cat.label}
              </h4>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <div key={item.key} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex-shrink-0 text-sm ${
                        item.status === 'good'
                          ? 'text-green-600'
                          : item.status === 'ok'
                            ? 'text-amber-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {item.status === 'good' ? '✓' : '○'}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          item.status === 'good'
                            ? 'text-gray-900'
                            : 'text-gray-700'
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500">{item.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

const STATUS_STYLES = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  suspended: { bg: 'bg-red-100', text: 'text-red-800' },
};

const BUSINESS_TYPE_ICONS: Record<string, string> = {
  winery: '🍷',
  hotel: '🏨',
  restaurant: '🍽️',
  activity: '🎯',
  catering: '🍴',
  service: '🔧',
  other: '📍',
};

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/partners/${partnerId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load partner');
        }
        const result = await res.json();
        setData({
          partner: result.partner,
          linkedWinery: result.linkedWinery,
          wineryContent: result.wineryContent || [],
          insiderTipsCount: result.insiderTipsCount || 0,
          photoCount: result.photoCount || 0,
        });
      } catch (err) {
        logger.error('Failed to load partner', { error: err });
        setError(err instanceof Error ? err.message : 'Failed to load partner');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [partnerId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-48 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium">{error || 'Partner not found'}</p>
          <button
            onClick={() => router.push('/admin/partners')}
            className="mt-3 text-sm text-[#1E3A5F] hover:underline"
          >
            Back to Partners
          </button>
        </div>
      </div>
    );
  }

  const { partner, linkedWinery } = data;
  const statusStyle = STATUS_STYLES[partner.status] || STATUS_STYLES.pending;

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-2">
          <Link
            href="/admin/partners"
            className="text-gray-500 hover:text-gray-700"
          >
            Partners
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{partner.business_name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {BUSINESS_TYPE_ICONS[partner.business_type] || '📍'}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {partner.business_name}
              </h1>
              <p className="text-sm text-gray-600">
                {partner.business_type.charAt(0).toUpperCase() +
                  partner.business_type.slice(1)}{' '}
                partner
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {partner.status}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Partner Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Partner Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Contact Name</p>
              <p className="font-medium text-gray-900">{partner.user_name}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{partner.user_email}</p>
            </div>
            <div>
              <p className="text-gray-500">Member Since</p>
              <p className="font-medium text-gray-900">
                {new Date(partner.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Setup Completed</p>
              <p className="font-medium text-gray-900">
                {partner.setup_completed_at
                  ? new Date(partner.setup_completed_at).toLocaleDateString()
                  : 'Not yet'}
              </p>
            </div>
            {partner.notes && (
              <div className="sm:col-span-2">
                <p className="text-gray-500">Admin Notes</p>
                <p className="font-medium text-gray-900">{partner.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Linked Business Card */}
        {linkedWinery ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Linked Winery
              </h2>
              <div className="flex gap-2">
                {linkedWinery.slug && (
                  <Link
                    href={`/wineries/${linkedWinery.slug}`}
                    target="_blank"
                    className="text-sm text-[#1E3A5F] hover:underline"
                  >
                    View Public Page
                  </Link>
                )}
              </div>
            </div>

            <div className="flex gap-6">
              {linkedWinery.cover_photo_url && (
                <img
                  src={linkedWinery.cover_photo_url}
                  alt={linkedWinery.name}
                  className="w-32 h-24 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {linkedWinery.name}
                </h3>
                {linkedWinery.short_description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {linkedWinery.short_description}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                  {linkedWinery.address && (
                    <span>
                      📍 {linkedWinery.address}, {linkedWinery.city}
                    </span>
                  )}
                  {linkedWinery.phone && <span>📞 {linkedWinery.phone}</span>}
                  {linkedWinery.website && (
                    <a
                      href={linkedWinery.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1E3A5F] hover:underline"
                    >
                      🌐 Website
                    </a>
                  )}
                </div>
                {linkedWinery.specialties &&
                  linkedWinery.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {linkedWinery.specialties.map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Content summary */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.wineryContent.length}
                </p>
                <p className="text-xs text-gray-500">Stories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.insiderTipsCount}
                </p>
                <p className="text-xs text-gray-500">Insider Tips</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.photoCount}
                </p>
                <p className="text-xs text-gray-500">Photos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {linkedWinery.is_featured ? '★' : '—'}
                </p>
                <p className="text-xs text-gray-500">Featured</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <p className="text-4xl mb-3">🔗</p>
            <p className="font-medium text-gray-900">No business linked yet</p>
            <p className="text-sm text-gray-500 mt-1">
              This partner hasn&apos;t been linked to a winery, hotel, or
              restaurant in the system.
            </p>
          </div>
        )}

        {/* Directory Listing Quality Score */}
        <DirectoryQualityPanel data={data} />

        {/* Winery Content Preview */}
        {data.wineryContent.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Content Preview
            </h2>
            <div className="space-y-4">
              {data.wineryContent.map((c) => (
                <div
                  key={c.content_type}
                  className="border-l-2 border-[#1E3A5F] pl-4"
                >
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {c.content_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {c.title || c.content_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
