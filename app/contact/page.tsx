'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ============================================================================
// Components
// ============================================================================

function ContactForm() {
  const searchParams = useSearchParams();
  const service = searchParams.get('service');
  const isFullPlanning = service === 'full-planning';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dates: '',
    groupSize: '',
    message: isFullPlanning
      ? "I'm interested in full trip planning services for my Walla Walla visit."
      : '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // For now, just simulate submission
    // TODO: Connect to actual email/CRM system
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-purple-900 mb-3">Thank You!</h2>
        <p className="text-gray-600 mb-6">
          We&apos;ve received your inquiry and will be in touch within 24 hours.
        </p>
        <Link
          href="/chat"
          className="inline-block px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
        >
          Back to Chat
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
            Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
            placeholder="you@email.com"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label htmlFor="groupSize" className="block text-sm font-medium text-gray-900 mb-1">
            Group Size
          </label>
          <select
            id="groupSize"
            value={formData.groupSize}
            onChange={(e) => setFormData(prev => ({ ...prev, groupSize: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
          >
            <option value="">Select...</option>
            <option value="2">2 guests</option>
            <option value="3-4">3-4 guests</option>
            <option value="5-6">5-6 guests</option>
            <option value="7-10">7-10 guests</option>
            <option value="11+">11+ guests</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="dates" className="block text-sm font-medium text-gray-900 mb-1">
          Tentative Dates
        </label>
        <input
          type="text"
          id="dates"
          value={formData.dates}
          onChange={(e) => setFormData(prev => ({ ...prev, dates: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
          placeholder="e.g., March 15-17 or 'flexible in April'"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-1">
          Tell Us About Your Trip *
        </label>
        <textarea
          id="message"
          required
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 resize-none"
          placeholder="What brings you to Walla Walla? Any special requests or preferences?"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Sending...' : 'Send Inquiry'}
      </button>

      <p className="text-xs text-center text-gray-500">
        We typically respond within 24 hours
      </p>
    </form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function ContactContent() {
  const searchParams = useSearchParams();
  const service = searchParams.get('service');
  const isFullPlanning = service === 'full-planning';

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/concierge" className="text-purple-600 hover:text-purple-700 text-sm mb-4 inline-block">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-purple-900 mb-3">
            {isFullPlanning ? "Let's Plan Your Trip" : "Get in Touch"}
          </h1>
          <p className="text-gray-600">
            {isFullPlanning
              ? "Tell us about your ideal Walla Walla experience and we'll create a custom itinerary."
              : "Have questions? We'd love to hear from you."
            }
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6">
          <ContactForm />
        </div>

        {/* Direct Contact */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">Prefer to talk?</p>
          <a
            href="tel:+15095551234"
            className="text-purple-600 font-semibold hover:text-purple-700"
          >
            (509) 555-1234
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-purple-50 to-white" />}>
      <ContactContent />
    </Suspense>
  );
}
