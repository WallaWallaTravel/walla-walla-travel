'use client';

import { PartnerSidebar } from '@/components/partner/PartnerSidebar';

export default function PartnerAnalyticsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <PartnerSidebar />

      <main className="flex-1 p-8">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Analytics</h1>
          <p className="text-slate-600 mb-8">
            Track how travelers are discovering and engaging with your listing.
          </p>

          {/* Coming Soon Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📈</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Analytics Coming Soon
            </h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              We're building detailed analytics to help you understand how travelers
              are finding and engaging with your listing. You'll soon be able to see:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-2xl mb-2">👀</div>
                <div className="font-medium text-slate-900">Profile Views</div>
                <div className="text-sm text-slate-500">How many people viewed your listing</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-medium text-slate-900">AI Recommendations</div>
                <div className="text-sm text-slate-500">Times you appeared in AI suggestions</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-2xl mb-2">❤️</div>
                <div className="font-medium text-slate-900">Saves & Favorites</div>
                <div className="text-sm text-slate-500">Travelers who saved you to their trips</div>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              In the meantime, focus on completing your profile and adding great photos
              to make sure you stand out when travelers search.
            </p>
          </div>

          {/* Quick Stats Placeholder */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-500 mb-1">Profile Completeness</div>
              <div className="text-2xl font-bold text-slate-900">--</div>
              <div className="text-sm text-slate-400">Coming soon</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-500 mb-1">Photos Uploaded</div>
              <div className="text-2xl font-bold text-slate-900">--</div>
              <div className="text-sm text-slate-400">Coming soon</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-500 mb-1">Content Status</div>
              <div className="text-2xl font-bold text-slate-900">--</div>
              <div className="text-sm text-slate-400">Coming soon</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
