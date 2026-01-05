"use client";

import { useState } from 'react';
import { logger } from '@/lib/logger';

interface MessageFeedbackProps {
  queryId: number;
  onFeedbackSubmit?: (rating: number) => void;
}

export default function MessageFeedback({ queryId, onFeedbackSubmit }: MessageFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRating = async (newRating: number) => {
    setRating(newRating);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId, rating: newRating }),
      });

      if (response.ok) {
        setSubmitted(true);
        onFeedbackSubmit?.(newRating);
        
        // Show comment field for negative feedback
        if (newRating === -1) {
          setShowComment(true);
        }
      }
    } catch (error) {
      logger.error('Failed to submit feedback', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    try {
      // In future, this could update the feedback with a comment
      logger.debug('Comment submitted', { comment });
      setShowComment(false);
      setComment('');
    } catch (error) {
      logger.error('Failed to submit comment', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted && !showComment) {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500">Was this helpful?</span>
        
        {/* Thumbs up */}
        <button
          onClick={() => handleRating(1)}
          disabled={isSubmitting || rating !== null}
          className={`p-1 rounded transition ${
            rating === 1
              ? 'text-green-600 bg-green-50'
              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Helpful"
          title="Yes, this was helpful"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
        </button>

        {/* Thumbs down */}
        <button
          onClick={() => handleRating(-1)}
          disabled={isSubmitting || rating !== null}
          className={`p-1 rounded transition ${
            rating === -1
              ? 'text-red-600 bg-red-50'
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Not helpful"
          title="No, this wasn't helpful"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
          </svg>
        </button>
      </div>

      {/* Comment field for negative feedback */}
      {showComment && (
        <div className="space-y-2 animate-fade-in">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could we improve? (optional)"
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowComment(false)}
              className="text-xs px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              Skip
            </button>
            <button
              onClick={handleCommentSubmit}
              disabled={!comment.trim() || isSubmitting}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

