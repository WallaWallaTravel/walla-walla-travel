'use client';

import { useState, useEffect, useCallback } from 'react';

interface FeedbackItem {
  id: number;
  type: string;
  description: string;
  message: string;
  feedback_type?: string;
  sender: 'client' | 'wwt';
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface ProposalFeedbackPanelProps {
  proposalId: string;
  proposalStatus: string;
  className?: string;
}

const FEEDBACK_TYPES = [
  { value: 'general', label: 'General Comment', icon: '💬' },
  { value: 'winery_add', label: 'Suggest Adding Winery', icon: '➕' },
  { value: 'winery_remove', label: 'Request Removing Winery', icon: '➖' },
  { value: 'winery_change', label: 'Change Winery Order/Timing', icon: '🔄' },
  { value: 'timing', label: 'Timing/Schedule Question', icon: '🕐' },
  { value: 'pricing', label: 'Pricing Question', icon: '💰' },
  { value: 'question', label: 'General Question', icon: '❓' },
];

export function ProposalFeedbackPanel({
  proposalId,
  proposalStatus,
  className = '',
}: ProposalFeedbackPanelProps) {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState({
    feedback_type: 'general',
    message: '',
    suggested_winery_name: '',
  });

  // Load existing feedback
  const loadFeedback = useCallback(async () => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/feedback`);
      if (response.ok) {
        const data = await response.json();
        setFeedbackItems(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setIsLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_type: formData.feedback_type,
          message: formData.message,
          suggested_winery_name: formData.feedback_type === 'winery_add' ? formData.suggested_winery_name : undefined,
        }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setFormData({ feedback_type: 'general', message: '', suggested_winery_name: '' });
        setShowForm(false);
        await loadFeedback(); // Reload to show new feedback
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitFeedback = ['sent', 'viewed'].includes(proposalStatus);

  return (
    <div className={`bg-white rounded-xl border border-stone-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="font-semibold text-stone-900">Questions & Feedback</h3>
          {feedbackItems.length > 0 && (
            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full">
              {feedbackItems.length}
            </span>
          )}
        </div>
        {canSubmitFeedback && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-[#8B1538] hover:text-[#722F37] font-medium"
          >
            + Add Comment
          </button>
        )}
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-100">
          <p className="text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Thank you! Our team will review your feedback shortly.
          </p>
        </div>
      )}

      {/* Feedback Form */}
      {showForm && canSubmitFeedback && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-stone-100 bg-stone-50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                What type of feedback?
              </label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, feedback_type: type.value })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      formData.feedback_type === type.value
                        ? 'bg-[#8B1538] text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span className="mr-1">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.feedback_type === 'winery_add' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Which winery would you like to add?
                </label>
                <input
                  type="text"
                  value={formData.suggested_winery_name}
                  onChange={(e) => setFormData({ ...formData, suggested_winery_name: e.target.value })}
                  placeholder="e.g., L'Ecole No 41"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Your message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us what you're thinking..."
                rows={3}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 resize-none"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-stone-600 text-sm font-medium hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.message.trim()}
                className="px-4 py-2 bg-[#8B1538] text-white text-sm font-medium rounded-lg hover:bg-[#722F37] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Feedback Thread */}
      <div className="divide-y divide-stone-100">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin text-2xl mb-2">🍷</div>
            <p className="text-sm text-stone-500">Loading...</p>
          </div>
        ) : feedbackItems.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-stone-600 font-medium mb-1">No messages yet</p>
            <p className="text-sm text-stone-500">
              Have questions about this proposal? We&apos;re here to help!
            </p>
            {canSubmitFeedback && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-4 py-2 bg-[#8B1538] text-white text-sm font-medium rounded-lg hover:bg-[#722F37] transition-colors"
              >
                Ask a Question
              </button>
            )}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {feedbackItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 ${item.sender === 'wwt' ? 'bg-stone-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      item.sender === 'wwt'
                        ? 'bg-[#8B1538] text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {item.sender === 'wwt' ? '🍷' : '👤'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-stone-900 text-sm">
                        {item.sender === 'wwt' ? 'Walla Walla Travel' : 'You'}
                      </span>
                      {item.feedback_type && (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-xs rounded-full">
                          {FEEDBACK_TYPES.find(t => t.value === item.feedback_type)?.label || item.feedback_type}
                        </span>
                      )}
                      <span className="text-xs text-stone-400">
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-stone-700 text-sm whitespace-pre-wrap">{item.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Info */}
      {!canSubmitFeedback && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
          <p className="text-sm text-amber-700">
            {proposalStatus === 'accepted' && '✓ This proposal has been accepted.'}
            {proposalStatus === 'declined' && 'This proposal was declined. Contact us to discuss alternatives.'}
            {proposalStatus === 'draft' && 'This proposal is still being prepared.'}
            {proposalStatus === 'expired' && 'This proposal has expired. Contact us for a new quote.'}
          </p>
        </div>
      )}
    </div>
  );
}
