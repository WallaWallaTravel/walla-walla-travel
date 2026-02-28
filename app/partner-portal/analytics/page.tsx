'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface DashboardStats {
  profile_completion: number;
  total_views: number;
  ai_recommendations: number;
  last_updated: string | null;
  content_completion: {
    stories_completed: number;
    stories_total: number;
    tips_count: number;
  };
}

interface PartnerProfile {
  id: number;
  business_name: string;
  business_type: string;
  status: string;
}

interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
  tip: string;
}

export default function PartnerAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/partner/dashboard');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setProfile(data.profile);
        }
      } catch (error) {
        logger.error('Failed to load analytics data', { error });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const completion = stats?.profile_completion ?? 0;
  const storiesDone = stats?.content_completion?.stories_completed ?? 0;
  const storiesTotal = stats?.content_completion?.stories_total ?? 3;
  const tipsCount = stats?.content_completion?.tips_count ?? 0;

  const checklist: ChecklistItem[] = [
    {
      label: 'Complete your listing details',
      done: completion >= 80,
      href: '/partner-portal/listing',
      tip: 'Add hours, description, and what makes you special.',
    },
    {
      label: 'Write your origin story',
      done: storiesDone >= 1,
      href: '/partner-portal/story',
      tip: 'Tell visitors why you started and what drives you.',
    },
    {
      label: 'Share at least 3 insider tips',
      done: tipsCount >= 3,
      href: '/partner-portal/tips',
      tip: 'Tips help travelers plan the perfect visit.',
    },
    {
      label: 'Upload photos',
      done: false, // No photo count in current stats — always show as action item
      href: '/partner-portal/media',
      tip: 'Great photos are the #1 factor in visitor decisions.',
    },
    {
      label: 'Preview your public listing',
      done: false,
      href: '/partner-portal/preview',
      tip: 'See exactly what travelers will see.',
    },
  ];

  const completedCount = checklist.filter(c => c.done).length;

  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          <div className="h-40 bg-slate-200 rounded mt-6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Listing Health</h1>
      <p className="text-slate-600 mb-8">
        A stronger listing means more visitors find you. Here is where you stand.
      </p>

      {/* Profile Completion Score */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Profile Completion</h2>
          <span className={`text-2xl font-bold ${
            completion >= 80 ? 'text-emerald-600' : completion >= 50 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {completion}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              completion >= 80 ? 'bg-emerald-500' : completion >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(completion, 100)}%` }}
          />
        </div>
        {completion < 80 && (
          <p className="text-sm text-slate-500 mt-3">
            Listings with 80%+ completion get significantly more visibility in search and AI recommendations.
          </p>
        )}
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm font-medium text-slate-500 mb-1">Stories Written</div>
          <div className="text-3xl font-bold text-slate-900">
            {storiesDone}<span className="text-lg text-slate-400">/{storiesTotal}</span>
          </div>
          {storiesDone < storiesTotal && (
            <Link href="/partner-portal/story" className="text-sm text-emerald-600 font-medium hover:underline mt-2 inline-block">
              Continue writing
            </Link>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm font-medium text-slate-500 mb-1">Insider Tips</div>
          <div className="text-3xl font-bold text-slate-900">{tipsCount}</div>
          {tipsCount < 3 && (
            <Link href="/partner-portal/tips" className="text-sm text-emerald-600 font-medium hover:underline mt-2 inline-block">
              Add more tips
            </Link>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm font-medium text-slate-500 mb-1">Listing Status</div>
          <div className="text-3xl font-bold text-slate-900 capitalize">
            {profile?.status === 'active' ? (
              <span className="text-emerald-600">Live</span>
            ) : (
              <span className="text-amber-600">{profile?.status || 'Draft'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Listing Checklist</h2>
          <span className="text-sm text-slate-500">{completedCount} of {checklist.length} done</span>
        </div>
        <div className="space-y-3">
          {checklist.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.done
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'border-2 border-slate-300 group-hover:border-emerald-400'
              }`}>
                {item.done && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${item.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {item.label}
                </div>
                {!item.done && (
                  <div className="text-sm text-slate-500">{item.tip}</div>
                )}
              </div>
              {!item.done && (
                <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Visibility note */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Visibility tracking coming soon.</span>{' '}
          We are building analytics to show how travelers discover your listing, including profile views,
          AI recommendation appearances, and trip saves. Complete your profile now so you are ready
          when tracking goes live.
        </p>
      </div>
    </div>
  );
}
