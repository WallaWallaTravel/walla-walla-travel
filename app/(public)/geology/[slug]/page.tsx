/**
 * Geology Topic Detail Page
 *
 * Public page displaying a single geology topic/article.
 */

import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
// Lightweight server-safe HTML sanitizer (avoids isomorphic-dompurify/JSDOM
// which can fail in Vercel serverless). Content is admin-authored from our DB.
function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

// ============================================================================
// Types
// ============================================================================

interface Topic {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  excerpt: string | null;
  topic_type: string;
  difficulty: string;
  hero_image_url: string | null;
  sources: string | null;
  author_name: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

interface RelatedTopic {
  id: number;
  slug: string;
  title: string;
  topic_type: string;
}

interface Fact {
  id: number;
  fact_text: string;
  fact_type: string | null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getTopic(slug: string): Promise<Topic | null> {
  try {
    const result = await query<Topic>(
      `SELECT id, slug, title, subtitle, content, excerpt, topic_type, difficulty,
              hero_image_url, sources, author_name, verified, created_at, updated_at
       FROM geology_topics
       WHERE slug = $1 AND is_published = true`,
      [slug]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

async function getRelatedTopics(topicId: number, topicType: string): Promise<RelatedTopic[]> {
  try {
    const result = await query<RelatedTopic>(
      `SELECT id, slug, title, topic_type
       FROM geology_topics
       WHERE is_published = true AND id != $1
       ORDER BY
         CASE WHEN topic_type = $2 THEN 0 ELSE 1 END,
         display_order ASC
       LIMIT 3`,
      [topicId, topicType]
    );
    return result.rows;
  } catch {
    return [];
  }
}

async function getTopicFacts(topicId: number): Promise<Fact[]> {
  try {
    const result = await query<Fact>(
      `SELECT id, fact_text, fact_type
       FROM geology_facts
       WHERE topic_id = $1
       ORDER BY display_order ASC`,
      [topicId]
    );
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopic(slug);

  if (!topic) {
    return {
      title: 'Topic Not Found | Walla Walla Travel',
    };
  }

  const description = topic.excerpt || topic.subtitle || `Learn about ${topic.title} in Walla Walla wine country.`;

  return {
    title: `${topic.title} | Geology | Walla Walla Travel`,
    description,
    openGraph: {
      title: topic.title,
      description,
      type: 'article',
      ...(topic.hero_image_url && { images: [{ url: topic.hero_image_url }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: topic.title,
      description,
    },
    alternates: {
      canonical: `https://wallawalla.travel/geology/${slug}`,
    },
  };
}

// ============================================================================
// Structured Data (SEO / AEO)
// ============================================================================

interface FaqItem {
  question: string;
  answer: string;
}

function parseFaqFromContent(content: string): FaqItem[] {
  const items: FaqItem[] = [];
  // Look for a FAQ section (## Frequently Asked Questions or similar)
  const faqMatch = content.match(/##\s*(frequently asked questions|faq|common questions)[^\n]*/i);
  if (!faqMatch || faqMatch.index === undefined) return items;

  const faqContent = content.substring(faqMatch.index + faqMatch[0].length);
  // Parse ### questions followed by answer paragraphs
  const questionBlocks = faqContent.split(/###\s+/).filter(Boolean);

  for (const block of questionBlocks) {
    const lines = block.trim().split('\n');
    const question = lines[0]?.trim().replace(/\?*$/, '?');
    const answer = lines
      .slice(1)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .trim();
    if (question && answer && answer.length > 5) {
      items.push({ question, answer });
    }
  }
  return items;
}

function ArticleJsonLd({ topic, faqItems }: { topic: Topic; faqItems: FaqItem[] }) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: topic.title,
    ...(topic.excerpt && { description: topic.excerpt }),
    ...(topic.subtitle && !topic.excerpt && { description: topic.subtitle }),
    ...(topic.hero_image_url && { image: topic.hero_image_url }),
    author: {
      '@type': 'Person',
      name: topic.author_name || 'Walla Walla Travel',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Walla Walla Travel',
      url: 'https://wallawalla.travel',
    },
    datePublished: topic.created_at,
    dateModified: topic.updated_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://wallawalla.travel/geology/${topic.slug}`,
    },
    about: {
      '@type': 'Thing',
      name: 'Walla Walla Wine Country Geology',
    },
  };

  const faqSchema =
    faqItems.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </>
  );
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      {label}
    </span>
  );
}

function DifficultyIndicator({ level }: { level: string }) {
  const levels: Record<string, { label: string; description: string }> = {
    general: { label: 'General', description: 'Accessible to everyone' },
    intermediate: { label: 'Intermediate', description: 'Some geology knowledge helpful' },
    advanced: { label: 'Advanced', description: 'For geology enthusiasts' },
  };

  const { label, description } = levels[level] || { label: level, description: '' };

  return (
    <div className="text-sm text-gray-500">
      <span className="font-medium">{label}</span>
      {description && <span className="hidden sm:inline"> - {description}</span>}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  // In production, you'd use a proper markdown library
  const paragraphs = content.split('\n\n');

  return (
    <div className="prose prose-lg max-w-none">
      {paragraphs.map((paragraph, index) => {
        // Handle headers
        if (paragraph.startsWith('## ')) {
          return (
            <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
              {paragraph.replace('## ', '')}
            </h2>
          );
        }
        if (paragraph.startsWith('### ')) {
          return (
            <h3 key={index} className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              {paragraph.replace('### ', '')}
            </h3>
          );
        }

        // Handle lists
        if (paragraph.includes('\n- ')) {
          const items = paragraph.split('\n- ').filter(Boolean);
          return (
            <ul key={index} className="list-disc list-inside space-y-2 my-4">
              {items.map((item, i) => (
                <li key={i} className="text-gray-700">
                  {item.replace(/^- /, '')}
                </li>
              ))}
            </ul>
          );
        }

        // Regular paragraphs with basic formatting
        // First sanitize the input, then apply formatting
        const sanitized = stripHtmlTags(paragraph);
        const formatted = sanitized
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');

        return (
          <p
            key={index}
            className="text-gray-700 leading-relaxed my-4"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function GeologyTopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = await getTopic(slug);

  if (!topic) {
    notFound();
  }

  const [relatedTopics, facts] = await Promise.all([
    getRelatedTopics(topic.id, topic.topic_type),
    getTopicFacts(topic.id),
  ]);

  const faqItems = parseFaqFromContent(topic.content);

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Geology', url: 'https://wallawalla.travel/geology' },
    { name: topic.title, url: `https://wallawalla.travel/geology/${slug}` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data for SEO & AEO */}
      <BreadcrumbJsonLd items={breadcrumbs} />
      <ArticleJsonLd topic={topic} faqItems={faqItems} />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white">
        {topic.hero_image_url && (
          <div className="absolute inset-0 opacity-30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={topic.hero_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 py-16">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <Link href="/geology" className="text-white/70 hover:text-white text-sm">
              Geology
            </Link>
            <span className="text-white/50 mx-2">/</span>
            <span className="text-white/90 text-sm">{topic.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <TopicTypeBadge type={topic.topic_type} />
            <DifficultyIndicator level={topic.difficulty} />
            {topic.verified && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <span>✓</span> Verified
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">{topic.title}</h1>
          {topic.subtitle && (
            <p className="text-xl text-gray-300">{topic.subtitle}</p>
          )}
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Article Content */}
          <article className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <MarkdownContent content={topic.content} />

              {/* Sources */}
              {topic.sources && (
                <div className="mt-12 pt-8 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Sources & References
                  </h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{topic.sources}</p>
                </div>
              )}
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Key Facts */}
            {facts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Key Facts</h3>
                <div className="space-y-4">
                  {facts.map((fact) => (
                    <div
                      key={fact.id}
                      className="text-sm text-gray-700 pl-4 border-l-2 border-[#722F37]"
                    >
                      {fact.fact_text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Topics */}
            {relatedTopics.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Related Topics</h3>
                <div className="space-y-3">
                  {relatedTopics.map((related) => (
                    <Link
                      key={related.id}
                      href={`/geology/${related.slug}`}
                      className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-900 text-sm">{related.title}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {related.topic_type.replace('_', ' ')}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#722F37] to-[#5a252c] rounded-xl p-6 text-white">
              <h3 className="font-semibold mb-2">Tour with Kevin Pogue</h3>
              <p className="text-sm text-white/80 mb-3">
                See these formations up close with geologist Kevin Pogue. He leads
                small-group tours in a Sprinter van through the landscapes that shape
                Walla Walla wine.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-medium text-white">
                  Geology
                </span>
                <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-medium text-white">
                  Wine &amp; Geology
                </span>
                <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-medium text-white">
                  Wine Tours
                </span>
              </div>
              <Link
                href="/book"
                className="inline-block w-full text-center py-2 bg-white text-[#722F37] rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
              >
                Inquire About Tours
              </Link>
            </div>
          </aside>
        </div>

        {/* Back to Geology */}
        <div className="mt-12 text-center">
          <Link
            href="/geology"
            className="inline-flex items-center text-[#722F37] hover:text-[#5a252c] font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Geology
          </Link>
        </div>
      </div>
    </div>
  );
}
