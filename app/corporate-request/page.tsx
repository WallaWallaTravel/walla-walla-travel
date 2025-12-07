"use client";

/**
 * Corporate/Group Event Quote Request Form
 * Allows customers to upload itinerary documents/photos
 * AI extracts data to pre-fill proposal
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CorporateRequestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    partySize: '',
    eventType: 'corporate_event',
    description: '',
    specialRequirements: '',
    budgetRange: '',
    preferredDates: ''
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const formPayload = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        formPayload.append(key, value);
      });
      
      // Add files
      files.forEach(file => {
        formPayload.append('files', file);
      });
      
      const response = await fetch('/api/corporate-request', {
        method: 'POST',
        body: formPayload
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }
      
      const data = await response.json();
      setRequestNumber(data.requestNumber);
      setSuccess(true);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Request Received!
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Request #{requestNumber}
            </p>
            <p className="text-gray-600 mb-8">
              We'll review your request and respond within <strong>48 hours</strong> with a detailed proposal.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">What's next?</h3>
              <ul className="text-left space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">1.</span>
                  <span>We'll analyze your itinerary (if uploaded) using AI</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">2.</span>
                  <span>Ryan will prepare a customized proposal</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">3.</span>
                  <span>We'll reach out to discuss details and finalize</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">4.</span>
                  <span>No deposit required until after we talk</span>
                </li>
              </ul>
            </div>
            
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏢 Corporate & Group Event Request
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Planning a corporate event or large group tour?
          </p>
          <p className="text-gray-600">
            Upload your itinerary or tell us about your event. We'll respond within <strong>48 hours</strong> with a detailed proposal.
          </p>
        </div>
        
        {/* Benefits */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="font-bold text-gray-900 mb-4">Why use our system?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm text-gray-700">AI reads your itinerary & pre-fills details</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm text-gray-700">Everything organized in one place</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <p className="text-sm text-gray-700">Faster response than email</p>
            </div>
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Request Details</h2>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {/* File Upload Section */}
          <div className="mb-8 p-6 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
            <h3 className="font-bold text-gray-900 mb-3">📄 Upload Your Itinerary (Optional but Recommended)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Have an existing itinerary? Upload a photo, PDF, or document. Our AI will extract the details automatically!
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.txt,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              📷 Choose Files or Take Photo
            </button>
            
            {files.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected files:</p>
                {files.map((file, i) => (
                  <div key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <span>✓</span>
                    <span>{file.name}</span>
                    <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Contact Information */}
          <div className="space-y-4 mb-6">
            <h3 className="font-bold text-gray-900">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Acme Corporation"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="John Smith"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="john@acme.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
          
          {/* Event Details */}
          <div className="space-y-4 mb-6">
            <h3 className="font-bold text-gray-900">Event Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Guests *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.partySize}
                  onChange={(e) => setFormData({ ...formData, partySize: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="25"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  required
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="corporate_event">Corporate Event</option>
                  <option value="team_building">Team Building</option>
                  <option value="wine_tour">Group Wine Tour</option>
                  <option value="celebration">Celebration/Party</option>
                  <option value="conference">Conference/Retreat</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Dates
              </label>
              <input
                type="text"
                value={formData.preferredDates}
                onChange={(e) => setFormData({ ...formData, preferredDates: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., June 15-17, 2025 or Flexible"
              />
              <p className="text-xs text-gray-500 mt-1">Enter specific dates or indicate if you're flexible</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Tell us about your event: goals, activities, any special requirements..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Requirements
              </label>
              <textarea
                value={formData.specialRequirements}
                onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Dietary restrictions, accessibility needs, specific wineries, etc."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Range (Optional)
              </label>
              <select
                value={formData.budgetRange}
                onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Prefer not to say</option>
                <option value="under_2000">Under $2,000</option>
                <option value="2000_5000">$2,000 - $5,000</option>
                <option value="5000_10000">$5,000 - $10,000</option>
                <option value="over_10000">Over $10,000</option>
              </select>
            </div>
          </div>
          
          {/* Submit */}
          <div className="border-t pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request - We\'ll Respond Within 48 Hours'}
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              No deposit required. We'll contact you to discuss details before finalizing.
            </p>
          </div>
        </form>
        
        {/* Alternative Contact */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-2">Prefer to talk first?</p>
          <a href="mailto:info@wallawalla.travel" className="text-blue-600 hover:underline font-medium">
            Email us directly
          </a>
          {' or '}
          <a href="tel:+15092008000" className="text-blue-600 hover:underline font-medium">
            call (509) 200-8000
          </a>
        </div>
      </div>
    </div>
  );
}

