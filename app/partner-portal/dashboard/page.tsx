'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PartnerProfile {
  id: number;
  business_name: string;
  business_type: string;
  status: string;
  setup_completed_at: string | null;
}

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

interface JourneyStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  status: 'complete' | 'in_progress' | 'not_started';
  motivation: string;
}

export default function PartnerDashboardPage() {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/partner/dashboard');
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function getJourneySteps(): JourneyStep[] {
    const storiesComplete = stats?.content_completion?.stories_completed ?? 0;
    const tipsCount = stats?.content_completion?.tips_count ?? 0;
    const profileComplete = (stats?.profile_completion ?? 0) >= 80;

    return [
      {
        id: 'listing',
        title: 'Set the Stage',
        description: 'Basic info, hours & what makes you special',
        href: '/partner-portal/listing',
        icon: '🎯',
        status: profileComplete ? 'complete' : storiesComplete > 0 ? 'in_progress' : 'not_started',
        motivation: 'Help visitors find you at the right time',
      },
      {
        id: 'story',
        title: 'Tell Your Story',
        description: 'Your origin, philosophy & what makes you unique',
        href: '/partner-portal/story',
        icon: '📖',
        status: storiesComplete >= 3 ? 'complete' : storiesComplete > 0 ? 'in_progress' : 'not_started',
        motivation: 'Connect emotionally before they arrive',
      },
      {
        id: 'tips',
        title: 'Share Your Secrets',
        description: 'Insider tips that create memorable visits',
        href: '/partner-portal/tips',
        icon: '💎',
        status: tipsCount >= 3 ? 'complete' : tipsCount > 0 ? 'in_progress' : 'not_started',
        motivation: 'Turn good visits into unforgettable ones',
      },
    ];
  }

  const journeySteps = getJourneySteps();
  const completedSteps = journeySteps.filter(s => s.status === 'complete').length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Emotional Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          {profile?.business_name || 'Welcome'}
        </h1>
        <p className="text-lg text-slate-600 mt-2">
          Every year, thousands of visitors come to Walla Walla looking for their perfect wine experience.
          <span className="text-emerald-700 font-medium"> Your story helps them find you.</span>
        </p>
      </div>

      {/* The Big Why */}
      <div className="bg-gradient-to-br from-purple-50 to-emerald-50 rounded-2xl p-6 mb-8 border border-purple-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
            ✨
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Why This Matters</h2>
            <p className="text-slate-600 mt-1">
              Visitors don&apos;t just want a tasting—they want a <em>connection</em>. When you share your story,
              philosophy, and insider secrets, you attract people who&apos;ll truly appreciate what you&apos;ve built.
              Better matches mean better reviews, more wine club members, and guests who become ambassadors.
            </p>
          </div>
        </div>
      </div>

      {/* Journey Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your Journey</h2>
            <p className="text-sm text-slate-500">
              {completedSteps === 3
                ? "You're fully set up! Keep your content fresh."
                : `${3 - completedSteps} step${3 - completedSteps > 1 ? 's' : ''} to go`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < completedSteps
                    ? 'bg-emerald-500'
                    : i === completedSteps
                      ? 'bg-purple-500 animate-pulse'
                      : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {journeySteps.map((step, index) => (
            <Link
              key={step.id}
              href={step.href}
              className={`block p-4 rounded-xl border-2 transition-all ${
                step.status === 'complete'
                  ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                  : step.status === 'in_progress'
                    ? 'bg-purple-50 border-purple-300 hover:border-purple-400 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  step.status === 'complete'
                    ? 'bg-emerald-100'
                    : step.status === 'in_progress'
                      ? 'bg-purple-100'
                      : 'bg-slate-100'
                }`}>
                  {step.status === 'complete' ? '✓' : step.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">STEP {index + 1}</span>
                    {step.status === 'in_progress' && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                        Continue
                      </span>
                    )}
                  </div>
                  <h3 className={`font-semibold ${
                    step.status === 'complete' ? 'text-emerald-800' : 'text-slate-900'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500">{step.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">→</span>
                </div>
              </div>
              {step.status !== 'complete' && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-sm text-purple-700 italic">
                    💡 {step.motivation}
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Preview CTA */}
      <div className="bg-slate-900 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">See How Visitors Experience You</h2>
            <p className="text-slate-300 mt-1">
              Preview your listing exactly as visitors will see it
            </p>
          </div>
          <Link
            href="/partner-portal/preview"
            className="px-5 py-2.5 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            Preview Listing
          </Link>
        </div>
      </div>

      {/* Quick Stats - Less Prominent */}
      {(stats?.total_views ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Listing Views</div>
            <div className="text-2xl font-bold text-slate-900">{stats?.total_views ?? 0}</div>
            <div className="text-xs text-slate-400">Last 30 days</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">AI Recommendations</div>
            <div className="text-2xl font-bold text-slate-900">{stats?.ai_recommendations ?? 0}</div>
            <div className="text-xs text-slate-400">Times we&apos;ve suggested you</div>
          </div>
        </div>
      )}

      {/* Inspiration Section */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl">
            💡
          </div>
          <div>
            <h2 className="font-semibold text-amber-900">What Makes Great Partner Profiles?</h2>
            <ul className="mt-3 space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span><strong>Authenticity wins.</strong> Visitors can feel when stories are genuine vs. marketing copy.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span><strong>Specifics are memorable.</strong> &ldquo;Our 2019 Syrah&rdquo; beats &ldquo;our award-winning wines.&rdquo;</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span><strong>Insider tips create loyalty.</strong> Sharing secrets makes visitors feel special.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span><strong>Show personality.</strong> Are you casual and fun? Refined and educational? Let it show.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
