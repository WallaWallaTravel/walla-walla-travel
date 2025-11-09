"use client";

import { useState } from 'react';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, name?: string) => void;
  triggerType: 'after_queries' | 'save_recommendations' | 'before_booking';
  queryCount?: number;
}

export default function EmailCaptureModal({
  isOpen,
  onClose,
  onSubmit,
  triggerType,
  queryCount = 0
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const getMessage = () => {
    switch (triggerType) {
      case 'after_queries':
        return {
          title: "💡 Want to save this conversation?",
          description: `You've asked ${queryCount} great questions! Let me email you a summary so you don't lose these recommendations.`,
          buttonText: "Email Me the Summary"
        };
      case 'save_recommendations':
        return {
          title: "📧 Get your personalized itinerary",
          description: "I'll send you a detailed email with all the wineries and tours we discussed, plus exclusive booking links.",
          buttonText: "Send My Itinerary"
        };
      case 'before_booking':
        return {
          title: "✨ Complete your booking",
          description: "Enter your email to receive booking confirmation and trip details.",
          buttonText: "Continue to Booking"
        };
      default:
        return {
          title: "Stay connected",
          description: "Get updates and exclusive offers",
          buttonText: "Subscribe"
        };
    }
  };

  const { title, description, buttonText } = getMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    await onSubmit(email, name || undefined);
    setIsSubmitting(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-fade-in">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600">{description}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name (Optional)
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            {/* Privacy note */}
            <p className="text-xs text-gray-500">
              We respect your privacy. Unsubscribe anytime. See our{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Maybe Later
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : buttonText}
              </button>
            </div>
          </form>

          {/* Benefits (for after_queries trigger) */}
          {triggerType === 'after_queries' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-2">You'll also get:</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Continue this conversation on any device
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Exclusive winery discounts
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Personalized trip planning tips
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

