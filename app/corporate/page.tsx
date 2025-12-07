'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Corporate Events Portal
 * 
 * Entry point for corporate clients requesting custom wine tour experiences.
 * This is a one-time use form - no account needed.
 */
export default function CorporatePage() {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    event_type: '',
    group_size: '',
    preferred_dates: '',
    budget_range: '',
    special_requests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/corporate-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.error?.message || 'Failed to submit request');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Request Received!</h2>
          <p className="text-slate-600 mb-6">
            Thank you for your interest. Our events team will contact you within 
            24 hours to discuss your custom wine country experience.
          </p>
          <Link 
            href="/"
            className="text-[#1E3A5F] font-medium hover:underline"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-[#1E3A5F] text-white py-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Link href="/" className="text-sm text-[#BCCCDC] hover:text-white mb-4 inline-block">
            ← Back to Walla Walla Travel
          </Link>
          <h1 className="text-2xl md:text-3xl font-semibold">
            Corporate Wine Experiences
          </h1>
          <p className="text-[#BCCCDC] mt-2">
            Team building, client entertainment, and executive retreats
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="text-center mb-10">
          <p className="text-slate-600 max-w-xl mx-auto">
            Let us create a memorable wine country experience for your team or clients. 
            Fill out the form below and our events team will craft a custom proposal.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event Type *
              </label>
              <select
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              >
                <option value="">Select type...</option>
                <option value="team_building">Team Building</option>
                <option value="client_entertainment">Client Entertainment</option>
                <option value="executive_retreat">Executive Retreat</option>
                <option value="incentive_trip">Incentive Trip</option>
                <option value="conference_addon">Conference Add-On</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Group Size */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estimated Group Size *
              </label>
              <select
                name="group_size"
                value={formData.group_size}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              >
                <option value="">Select size...</option>
                <option value="2-6">2-6 people</option>
                <option value="7-14">7-14 people</option>
                <option value="15-30">15-30 people</option>
                <option value="31-50">31-50 people</option>
                <option value="50+">50+ people</option>
              </select>
            </div>

            {/* Preferred Dates */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preferred Date(s)
              </label>
              <input
                type="text"
                name="preferred_dates"
                value={formData.preferred_dates}
                onChange={handleChange}
                placeholder="e.g. March 2025, flexible"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              />
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Budget Range
              </label>
              <select
                name="budget_range"
                value={formData.budget_range}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              >
                <option value="">Select range...</option>
                <option value="under_2500">Under $2,500</option>
                <option value="2500_5000">$2,500 - $5,000</option>
                <option value="5000_10000">$5,000 - $10,000</option>
                <option value="10000_25000">$10,000 - $25,000</option>
                <option value="over_25000">$25,000+</option>
              </select>
            </div>
          </div>

          {/* Special Requests */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Special Requests or Details
            </label>
            <textarea
              name="special_requests"
              value={formData.special_requests}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about your vision for the event..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`mt-6 w-full py-3 rounded-lg text-white font-semibold transition-colors ${
              submitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#1E3A5F] hover:bg-[#334E68]'
            }`}
          >
            {submitting ? 'Submitting...' : 'Request Custom Proposal'}
          </button>
        </form>

        {/* Trust Indicators */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>We typically respond within 24 hours</p>
          <p className="mt-1">Questions? Call (509) 200-8000</p>
        </div>
      </main>
    </div>
  );
}

