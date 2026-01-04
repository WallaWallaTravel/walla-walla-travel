'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WINERY_CONTENT_TYPES, CONTENT_TYPE_LABELS } from '@/lib/config/content-types';

interface StoryContent {
  id?: number;
  content_type: string;
  content: string;
  status: 'draft' | 'pending' | 'approved';
  updated_at?: string;
}

interface StorySection {
  type: string;
  title: string;
  description: string;
  prompts: string[];
  example: string;
  realExample?: { winery: string; excerpt: string };
  minLength: number;
  maxLength: number;
}

const STORY_SECTIONS: StorySection[] = [
  {
    type: WINERY_CONTENT_TYPES.ORIGIN_STORY,
    title: 'Your Origin Story',
    description: 'Every great winery has a beginning. Share yours with visitors who want to connect with the heart behind the wine.',
    prompts: [
      'What inspired you to start this winery?',
      'What was the pivotal moment that led you here?',
      'What family history or personal journey brought you to winemaking?',
    ],
    example: 'After 20 years in Seattle tech, we traded our laptops for pruning shears. A vacation to Walla Walla in 2008 changed everything—we fell in love with the land, the community, and the possibility of creating something that would outlast us. Our first vintage was just 200 cases made in a borrowed barn...',
    realExample: {
      winery: 'Long Shadows Vintners',
      excerpt: 'Allen Shoup spent 20 years building the Washington wine industry at Stimson Lane. When he left in 2003, he had one audacious idea: what if the world\'s greatest winemakers collaborated to create wines from Washington\'s finest vineyards?'
    },
    minLength: 100,
    maxLength: 2000,
  },
  {
    type: WINERY_CONTENT_TYPES.PHILOSOPHY,
    title: 'Your Winemaking Philosophy',
    description: 'What guides your approach to winemaking? Help visitors understand what makes your wines distinctive.',
    prompts: [
      'What principles guide your winemaking decisions?',
      'How do you balance tradition with innovation?',
      'What role does the land play in your wines?',
    ],
    example: 'We believe great wine starts in the vineyard. Our biodynamic practices mean we work with the rhythms of nature, not against them. We use minimal intervention in the cellar—native yeasts, neutral oak, and patience. Our goal is to let the terroir speak for itself...',
    realExample: {
      winery: 'L\'Ecole No. 41',
      excerpt: 'Our winemaking philosophy is simple: grow the best fruit possible and let the wine make itself. We farm sustainably, harvest by hand, and intervene as little as possible in the cellar. The result is wine that speaks of place.'
    },
    minLength: 100,
    maxLength: 1500,
  },
  {
    type: WINERY_CONTENT_TYPES.WHAT_MAKES_UNIQUE,
    title: 'What Makes You Unique',
    description: 'With 120+ wineries in the valley, what sets you apart? This helps us match you with the right visitors.',
    prompts: [
      'What experience can visitors only get at your winery?',
      'What\'s your signature or specialty that people talk about?',
      'What do guests consistently remember about their visit?',
    ],
    example: 'We\'re the only winery in the valley with a resident goat herd that manages our cover crops. Visitors love meeting the goats almost as much as tasting our estate Syrah. Our cave tours go 40 feet underground where we age our reserve wines at a constant 55°F...',
    realExample: {
      winery: 'Northstar Winery',
      excerpt: 'We are singularly focused on Merlot. While others chase trends, we\'ve spent 25 years proving that Washington grows world-class Merlot. Every decision we make—from vineyard selection to barrel aging—is in service of this one grape.'
    },
    minLength: 100,
    maxLength: 1500,
  },
];

export default function PartnerStoryPage() {
  const [stories, setStories] = useState<Record<string, StoryContent>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<string>(STORY_SECTIONS[0].type);

  useEffect(() => {
    async function fetchStories() {
      try {
        const response = await fetch('/api/partner/content');
        if (response.ok) {
          const data = await response.json();
          if (data.content) {
            const storyMap: Record<string, StoryContent> = {};
            data.content.forEach((item: StoryContent) => {
              storyMap[item.content_type] = item;
            });
            setStories(storyMap);
          }
        }
      } catch (error) {
        console.error('Failed to load stories:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, []);

  async function handleSave(section: StorySection) {
    const content = stories[section.type]?.content || '';

    if (content.length < section.minLength) {
      setMessage({
        type: 'error',
        text: `Please write at least ${section.minLength} characters for your ${section.title.toLowerCase()}.`
      });
      return;
    }

    setSaving(section.type);
    setMessage(null);

    try {
      const response = await fetch('/api/partner/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: section.type,
          content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStories(prev => ({
          ...prev,
          [section.type]: {
            ...prev[section.type],
            id: data.id,
            status: 'pending',
            updated_at: new Date().toISOString(),
          },
        }));
        setMessage({ type: 'success', text: 'Saved! Your story has been submitted for review.' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save story' });
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSaving(null);
    }
  }

  function updateContent(type: string, content: string) {
    setStories(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        content_type: type,
        content,
        status: prev[type]?.status || 'draft',
      },
    }));
  }

  function getStatusBadge(status?: string) {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full">Live</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">Pending Review</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">Draft</span>;
    }
  }

  function getCompletedCount() {
    return STORY_SECTIONS.filter(
      section => (stories[section.type]?.content?.length || 0) >= section.minLength
    ).length;
  }

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

  const currentSection = STORY_SECTIONS.find(s => s.type === activeSection) || STORY_SECTIONS[0];
  const currentContent = stories[currentSection.type]?.content || '';
  const completedCount = getCompletedCount();

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tell Your Story</h1>
      </div>

      {/* WHY THIS MATTERS - Now at the top! */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border border-purple-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
            📖
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Why Your Story Matters</h2>
            <p className="text-slate-600 mt-2">
              Visitors don&apos;t choose wineries from a spreadsheet. They&apos;re looking for an <em>experience</em>—a
              connection to something authentic. When you share your origin story, your philosophy, and what makes
              you unique, you give visitors a reason to choose <strong>you</strong> over the winery down the road.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">📈</div>
                <div className="text-xs text-slate-500">more engagement</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">⏱️</div>
                <div className="text-xs text-slate-500">longer visits</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">🍷</div>
                <div className="text-xs text-slate-500">wine club interest</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress - Reframed positively */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {STORY_SECTIONS.map((section, index) => {
            const isComplete = (stories[section.type]?.content?.length || 0) >= section.minLength;
            const isActive = activeSection === section.type;
            return (
              <button
                key={section.type}
                onClick={() => setActiveSection(section.type)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-purple-600 text-white ring-4 ring-purple-200'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                }`}
              >
                {isComplete ? '✓' : index + 1}
              </button>
            );
          })}
        </div>
        <Link
          href="/partner-portal/preview"
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          Preview how it looks →
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Story Section Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STORY_SECTIONS.map((section) => {
          const content = stories[section.type]?.content || '';
          const isComplete = content.length >= section.minLength;

          return (
            <button
              key={section.type}
              onClick={() => setActiveSection(section.type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === section.type
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isComplete && (
                <span className={`w-2 h-2 rounded-full ${
                  activeSection === section.type ? 'bg-white' : 'bg-emerald-500'
                }`} />
              )}
              {CONTENT_TYPE_LABELS[section.type as keyof typeof CONTENT_TYPE_LABELS] || section.title}
            </button>
          );
        })}
      </div>

      {/* Active Story Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{currentSection.title}</h2>
            <p className="text-slate-500 mt-1">{currentSection.description}</p>
          </div>
          {getStatusBadge(stories[currentSection.type]?.status)}
        </div>

        {/* Guiding Prompts */}
        <div className="bg-purple-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-purple-900 mb-2">Questions to spark your writing:</h3>
          <ul className="space-y-1">
            {currentSection.prompts.map((prompt, index) => (
              <li key={index} className="text-sm text-purple-700 flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                {prompt}
              </li>
            ))}
          </ul>
        </div>

        {/* Real Example from another winery */}
        {currentSection.realExample && (
          <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div>
                <p className="text-sm font-medium text-amber-900">
                  How {currentSection.realExample.winery} tells their story:
                </p>
                <p className="text-sm text-amber-800 italic mt-1">
                  &ldquo;{currentSection.realExample.excerpt}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Example toggle */}
        <details className="mb-4">
          <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
            See a template example
          </summary>
          <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic">
            &ldquo;{currentSection.example}&rdquo;
          </div>
        </details>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={currentContent}
            onChange={(e) => updateContent(currentSection.type, e.target.value)}
            rows={8}
            maxLength={currentSection.maxLength}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none resize-none"
            placeholder="Start writing your story..."
          />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className={`${
              currentContent.length < currentSection.minLength
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`}>
              {currentContent.length < currentSection.minLength
                ? `${currentSection.minLength - currentContent.length} more characters needed`
                : '✓ Ready to save'}
            </span>
            <span className="text-slate-400">
              {currentContent.length}/{currentSection.maxLength}
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={() => handleSave(currentSection)}
            disabled={saving === currentSection.type || currentContent.length < currentSection.minLength}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {saving === currentSection.type ? 'Saving...' : 'Save & Submit for Review'}
          </button>
        </div>
      </div>

      {/* Tips for Great Stories - Moved to bottom as reference */}
      <div className="mt-8 bg-slate-50 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Quick Tips for Authentic Stories</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span><strong>Be specific</strong> — &ldquo;2008&rdquo; beats &ldquo;a few years ago&rdquo;</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span><strong>Show vulnerability</strong> — Challenges make stories relatable</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span><strong>Use your voice</strong> — Write like you talk to guests</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span><strong>Include people</strong> — Names and faces create connection</span>
          </div>
        </div>
      </div>

      {/* Celebration for completion */}
      {completedCount === 3 && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="font-semibold text-emerald-900">Your Story is Complete!</h3>
          <p className="text-emerald-700 mt-1">
            You&apos;re now set apart from wineries with empty profiles.
          </p>
          <Link
            href="/partner-portal/preview"
            className="inline-block mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            See How Visitors Will Experience You →
          </Link>
        </div>
      )}
    </div>
  );
}
