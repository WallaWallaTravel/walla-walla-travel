/**
 * Geology Landing Page
 *
 * Public page showcasing Walla Walla's unique geological story.
 */

import { query } from '@/lib/db';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Geology of Walla Walla Wine Country | Walla Walla Travel',
  description:
    'Discover the fascinating geological history that makes Walla Walla one of the most unique wine regions in the world. From Ice Age floods to volcanic basalt.',
};

// ============================================================================
// Types
// ============================================================================

interface Topic {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  topic_type: string;
  difficulty: string;
  hero_image_url: string | null;
  is_featured: boolean;
}

interface Fact {
  id: number;
  fact_text: string;
  fact_type: string | null;
}

interface Site {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  site_type: string | null;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getPublishedTopics(): Promise<Topic[]> {
  try {
    const result = await query<Topic>(`
      SELECT id, slug, title, subtitle, excerpt, topic_type, difficulty,
             hero_image_url, is_featured
      FROM geology_topics
      WHERE is_published = true
      ORDER BY is_featured DESC, display_order ASC, created_at DESC
    `);
    return result.rows;
  } catch {
    return [];
  }
}

async function getFeaturedFacts(): Promise<Fact[]> {
  try {
    const result = await query<Fact>(`
      SELECT id, fact_text, fact_type
      FROM geology_facts
      WHERE is_featured = true
      ORDER BY display_order ASC
      LIMIT 6
    `);
    return result.rows;
  } catch {
    return [];
  }
}

async function getPublishedSites(): Promise<Site[]> {
  try {
    const result = await query<Site>(`
      SELECT id, name, slug, description, site_type
      FROM geology_sites
      WHERE is_published = true
      ORDER BY name ASC
      LIMIT 6
    `);
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================================================
// Components
// ============================================================================

function TopicTypeBadge({ type }: { type: string }) {
  const typeLabels: Record<string, { label: string; color: string }> = {
    ice_age_floods: { label: 'Ice Age Floods', color: 'bg-blue-100 text-blue-800' },
    soil_types: { label: 'Soil Types', color: 'bg-amber-100 text-amber-800' },
    basalt: { label: 'Basalt', color: 'bg-gray-100 text-gray-800' },
    terroir: { label: 'Terroir', color: 'bg-purple-100 text-purple-800' },
    climate: { label: 'Climate', color: 'bg-sky-100 text-sky-800' },
    water: { label: 'Water', color: 'bg-cyan-100 text-cyan-800' },
    overview: { label: 'Overview', color: 'bg-green-100 text-green-800' },
    wine_connection: { label: 'Wine Connection', color: 'bg-rose-100 text-rose-800' },
  };

  const { label, color } = typeLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function DifficultyIndicator({ level }: { level: string }) {
  const levels: Record<string, { label: string; dots: number }> = {
    general: { label: 'General', dots: 1 },
    intermediate: { label: 'Intermediate', dots: 2 },
    advanced: { label: 'Advanced', dots: 3 },
  };

  const { label, dots } = levels[level] || { label: level, dots: 1 };

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <span>{label}</span>
      <span className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i <= dots ? 'bg-[#722F37]' : 'bg-gray-200'}`}
          />
        ))}
      </span>
    </div>
  );
}

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Link
      href={`/geology/${topic.slug}`}
      className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      {topic.hero_image_url ? (
        <div className="aspect-video bg-gray-100 relative overflow-hidden">
          <img
            src={topic.hero_image_url}
            alt={topic.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {topic.is_featured && (
            <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded">
              Featured
            </span>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-[#722F37]/10 to-[#722F37]/5 flex items-center justify-center">
          <span className="text-4xl opacity-50">🪨</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <TopicTypeBadge type={topic.topic_type} />
          <DifficultyIndicator level={topic.difficulty} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#722F37] transition-colors">
          {topic.title}
        </h3>
        {topic.subtitle && (
          <p className="mt-1 text-sm text-gray-600">{topic.subtitle}</p>
        )}
        {topic.excerpt && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">{topic.excerpt}</p>
        )}
      </div>
    </Link>
  );
}

function FactCard({ fact }: { fact: Fact }) {
  return (
    <div className="bg-gradient-to-br from-[#722F37]/5 to-transparent rounded-xl p-5 border border-[#722F37]/10">
      <p className="text-gray-800 text-sm leading-relaxed">{fact.fact_text}</p>
      {fact.fact_type && (
        <p className="mt-3 text-xs text-[#722F37] font-medium uppercase tracking-wide">
          {fact.fact_type.replace('_', ' ')}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function GeologyLandingPage() {
  const [topics, facts, sites] = await Promise.all([
    getPublishedTopics(),
    getFeaturedFacts(),
    getPublishedSites(),
  ]);

  const featuredTopics = topics.filter((t) => t.is_featured);
  const otherTopics = topics.filter((t) => !t.is_featured);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white py-24 px-4 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/60 via-transparent to-[#1a1a2e]/80" />

        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            The Geology of Walla Walla Wine Country
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover how ancient floods, volcanic eruptions, and millions of years of geology
            created one of the world&apos;s most unique wine regions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#topics"
              className="px-6 py-3 bg-[#722F37] text-white rounded-lg font-medium hover:bg-[#5a252c] transition-colors"
            >
              Explore Topics
            </a>
            <a
              href="#facts"
              className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
            >
              Quick Facts
            </a>
          </div>
        </div>
        {/* Decorative element */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* Quick Facts Section */}
      {facts.length > 0 && (
        <section id="facts" className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Did You Know?
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Fascinating facts about Walla Walla&apos;s geological heritage
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facts.map((fact) => (
                <FactCard key={fact.id} fact={fact} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Topics */}
      {featuredTopics.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Topics</h2>
            <p className="text-gray-600 mb-8">Start your geological journey here</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Topics */}
      <section id="topics" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {featuredTopics.length > 0 ? 'More Topics' : 'Explore Topics'}
          </h2>
          <p className="text-gray-600 mb-8">
            Deep dives into Walla Walla&apos;s geological story
          </p>
          {otherTopics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <p className="text-4xl mb-3">🪨</p>
              <p className="text-lg font-medium text-gray-900">Coming Soon</p>
              <p className="text-gray-500 mt-1">
                We&apos;re working on bringing you fascinating geology content.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Sites Preview */}
      {sites.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Places to Explore</h2>
            <p className="text-gray-600 mb-8">
              Visit these geological points of interest in person
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="p-5 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{site.name}</h3>
                      {site.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {site.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Meet Your Guide */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Meet Your Guide</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col sm:flex-row gap-8 items-start">
            {/* Placeholder avatar — swap for a real photo later */}
            <div className="flex-shrink-0 w-24 h-24 rounded-full bg-[#722F37]/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-[#722F37]">KP</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Kevin Pogue, Geologist</h3>
              <p className="mt-2 text-gray-700 leading-relaxed">
                Kevin Pogue has spent decades studying the geological forces that shaped Walla Walla
                wine country. A geologist by training and a storyteller by nature, he brings the
                landscape to life — connecting ancient floods, volcanic basalt, and windblown soils
                to the wines you taste today.
              </p>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Kevin leads small-group tours in a comfortable Sprinter van, taking guests to the
                formations and vineyards where geology and wine intersect. Whether you&apos;re new
                to wine or a seasoned enthusiast, his tours offer a perspective you won&apos;t find
                anywhere else in the valley.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-[#722F37] to-[#5a252c] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Explore Wine Country with a Geologist</h2>
          <p className="text-lg text-white/80 mb-6">
            Join Kevin Pogue for a small-group tour in a comfortable Sprinter van.
            He&apos;ll connect the landscape&apos;s geological story to the wines you
            taste — from ancient flood channels to the vineyards planted on them today.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="px-4 py-1.5 bg-white/15 rounded-full text-sm font-medium text-white">
              Geology Tours
            </span>
            <span className="px-4 py-1.5 bg-white/15 rounded-full text-sm font-medium text-white">
              Geology &amp; Wine Combo
            </span>
            <span className="px-4 py-1.5 bg-white/15 rounded-full text-sm font-medium text-white">
              Wine Tours with Geology
            </span>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center px-8 py-4 bg-white text-[#722F37] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Inquire About Tours
          </Link>
          <p className="mt-4 text-sm text-white/70">
            Tours are customized for your group. We&apos;ll help you find the right experience.
          </p>
        </div>
      </section>
    </div>
  );
}
