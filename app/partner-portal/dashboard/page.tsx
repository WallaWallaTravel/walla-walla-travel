'use client';

import { useState, useEffect } from 'react';

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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{profile?.business_name ? `, ${profile.business_name}` : ''}!
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your business listing and track performance
        </p>
      </div>

      {/* Setup Prompt (if not completed) */}
      {profile && !profile.setup_completed_at && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl">
              👋
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-amber-900">Complete Your Setup</h2>
              <p className="text-amber-700 text-sm mt-1">
                Your listing isn&apos;t visible to customers yet. Complete your profile to start appearing in recommendations.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href="/partner-portal/profile"
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  Complete Profile →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">Profile Completion</div>
          <div className="text-3xl font-bold text-slate-900">
            {stats?.profile_completion ?? 0}%
          </div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${stats?.profile_completion ?? 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">Listing Views</div>
          <div className="text-3xl font-bold text-slate-900">
            {stats?.total_views ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Last 30 days</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">AI Recommendations</div>
          <div className="text-3xl font-bold text-slate-900">
            {stats?.ai_recommendations ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Times recommended</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">Last Updated</div>
          <div className="text-lg font-semibold text-slate-900">
            {stats?.last_updated 
              ? new Date(stats.last_updated).toLocaleDateString()
              : 'Never'
            }
          </div>
          <a 
            href="/partner-portal/listing" 
            className="text-xs text-emerald-600 hover:underline mt-1 inline-block"
          >
            Update now →
          </a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/partner-portal/listing"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <span className="text-2xl">📝</span>
            <div>
              <div className="font-medium text-slate-900">Edit Listing</div>
              <div className="text-xs text-slate-500">Update your business info</div>
            </div>
          </a>

          <a
            href="/partner-portal/media"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <span className="text-2xl">📷</span>
            <div>
              <div className="font-medium text-slate-900">Upload Photos</div>
              <div className="text-xs text-slate-500">Add images to your listing</div>
            </div>
          </a>

          <a
            href="/partner-portal/profile"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <span className="text-2xl">⚙️</span>
            <div>
              <div className="font-medium text-slate-900">Account Settings</div>
              <div className="text-xs text-slate-500">Manage your account</div>
            </div>
          </a>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 bg-emerald-50 rounded-xl border border-emerald-200 p-6">
        <h2 className="font-semibold text-emerald-900 mb-3">💡 Tips for Better Visibility</h2>
        <ul className="space-y-2 text-sm text-emerald-800">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            <span>Add high-quality photos of your space, products, or experiences</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            <span>Keep your hours and availability up to date</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            <span>Write a compelling description highlighting what makes you unique</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600">✓</span>
            <span>Add specialties and features that help our AI recommend you accurately</span>
          </li>
        </ul>
      </div>
    </div>
  );
}




