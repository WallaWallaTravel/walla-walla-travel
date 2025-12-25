'use client';

/**
 * Admin KB Content Ingestion Page
 *
 * Upload and manage content for the knowledge base
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Business {
  id: number;
  name: string;
  type: string;
}

interface IngestResult {
  success: boolean;
  data?: {
    contribution: {
      id: number;
      title: string;
      status: string;
    };
    prescreening?: {
      recommendation: string;
      confidence: number;
      summary: string;
      suggestedTopics: string[];
    };
  };
  message?: string;
  error?: { message: string };
}

// ============================================================================
// Component
// ============================================================================

export default function KBIngestPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);

  // Form state
  const [businessId, setBusinessId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<string>('text');
  const [contentText, setContentText] = useState('');
  const [topics, setTopics] = useState('');
  const [audienceType, setAudienceType] = useState<string>('all');
  const [isEvergreen, setIsEvergreen] = useState(true);

  // New business form
  const [showNewBusiness, setShowNewBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessType, setNewBusinessType] = useState('winery');
  const [creatingBusiness, setCreatingBusiness] = useState(false);

  // Fetch businesses on mount
  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    try {
      const res = await fetch('/api/kb/businesses');
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    }
  }

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();
    setCreatingBusiness(true);

    try {
      const res = await fetch('/api/kb/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBusinessName,
          type: newBusinessType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBusinesses([...businesses, data.data]);
        setBusinessId(data.data.id);
        setShowNewBusiness(false);
        setNewBusinessName('');
      } else {
        const error = await res.json();
        alert(error.error?.message || 'Failed to create business');
      }
    } catch (error) {
      console.error('Failed to create business:', error);
      alert('Failed to create business');
    } finally {
      setCreatingBusiness(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/kb/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          title,
          content_type: contentType,
          content_text: contentText,
          topics: topics
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          audience_type: audienceType,
          is_evergreen: isEvergreen,
        }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        // Clear form on success
        setTitle('');
        setContentText('');
        setTopics('');
      }
    } catch (error) {
      console.error('Ingestion failed:', error);
      setResult({
        success: false,
        error: { message: 'Failed to submit content' },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/kb" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to KB Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add Content</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload content to the knowledge base for the AI assistant
          </p>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div
          className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
        >
          {result.success ? (
            <div>
              <p className="font-medium text-green-800">✓ {result.message}</p>
              {result.data?.prescreening && (
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    AI Recommendation:{' '}
                    <span className="font-medium capitalize">{result.data.prescreening.recommendation}</span> (
                    {Math.round(result.data.prescreening.confidence * 100)}% confidence)
                  </p>
                  <p className="mt-1">{result.data.prescreening.summary}</p>
                  {result.data.prescreening.suggestedTopics?.length > 0 && (
                    <p className="mt-1">Suggested topics: {result.data.prescreening.suggestedTopics.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-800">✗ {result.error?.message || 'Something went wrong'}</p>
          )}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Business Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business / Source</label>
          <div className="flex gap-3">
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value ? parseInt(e.target.value) : '')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a business...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.type})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewBusiness(!showNewBusiness)}
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              + New
            </button>
          </div>
        </div>

        {/* New Business Form */}
        {showNewBusiness && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <h3 className="font-medium text-gray-900">Add New Business</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., L'Ecole No 41"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newBusinessType}
                  onChange={(e) => setNewBusinessType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="winery">Winery</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="attraction">Attraction</option>
                  <option value="expert">Local Expert</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateBusiness}
                disabled={!newBusinessName || creatingBusiness}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingBusiness ? 'Creating...' : 'Create Business'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewBusiness(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Content Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { value: 'text', label: '📝 Text', desc: 'Written content' },
              { value: 'document', label: '📄 Document', desc: 'PDF, Word' },
              { value: 'voice', label: '🎤 Voice', desc: 'Audio recording' },
              { value: 'video', label: '🎬 Video', desc: 'Video content' },
              { value: 'image', label: '🖼️ Image', desc: 'Photos' },
              { value: 'url', label: '🔗 URL', desc: 'Web link' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setContentType(type.value)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  contentType === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg">{type.label.split(' ')[0]}</div>
                <div className="text-xs text-gray-500 mt-1">{type.label.split(' ')[1]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Winery Overview, Tasting Room Experience, Winemaker Interview"
            required
          />
        </div>

        {/* Content Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {contentType === 'text' ? 'Content' : 'Description / Notes'}
          </label>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={
              contentType === 'text'
                ? 'Enter the content that visitors should know about this business...'
                : 'Add any notes or description about this content...'
            }
            required={contentType === 'text'}
          />
          <p className="mt-1 text-xs text-gray-500">
            {contentType === 'text'
              ? 'This content will be indexed and used by the AI assistant to answer visitor questions.'
              : 'For non-text content, the AI will analyze and extract information automatically.'}
          </p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Topics (comma-separated)</label>
            <input
              type="text"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., cabernet, wine tasting, rocks district"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
            <select
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Visitors</option>
              <option value="first-time">First-Time Visitors</option>
              <option value="wine-enthusiast">Wine Enthusiasts</option>
              <option value="family">Families</option>
              <option value="romantic">Couples / Romantic</option>
            </select>
          </div>
        </div>

        {/* Evergreen Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="evergreen"
            checked={isEvergreen}
            onChange={(e) => setIsEvergreen(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="evergreen" className="text-sm text-gray-700">
            Evergreen content (no expiration date)
          </label>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">Content will be reviewed by AI before publishing</p>
          <button
            type="submit"
            disabled={loading || !businessId || !title}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Content'}
          </button>
        </div>
      </form>
    </div>
  );
}

