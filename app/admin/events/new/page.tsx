'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { EventCategory } from '@/lib/types/events';
import { RecurrenceSection } from '@/components/events/RecurrenceSection';
import PhoneInput from '@/components/ui/PhoneInput';

export default function AdminCreateEventPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<{
    frequency: 'weekly' | 'biweekly' | 'monthly';
    days_of_week?: number[];
    day_of_month?: number;
    end_type: 'count' | 'until_date';
    count?: number;
    until_date?: string;
  } | null>(null);

  const [form, setForm] = useState({
    title: '',
    short_description: '',
    description: '',
    category_id: '',
    tags: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_all_day: false,
    venue_name: '',
    address: '',
    city: 'Walla Walla',
    state: 'WA',
    zip: '',
    featured_image_url: '',
    is_free: true,
    price_min: '',
    price_max: '',
    ticket_url: '',
    organizer_name: '',
    organizer_website: '',
    organizer_email: '',
    organizer_phone: '',
    is_featured: false,
    feature_priority: '0',
    meta_title: '',
    meta_description: '',
  });

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/v1/events/categories');
        if (response.ok) {
          const result = await response.json();
          setCategories(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }
    fetchCategories();
  }, []);

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (publish: boolean) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Build payload
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        start_date: form.start_date,
        is_all_day: form.is_all_day,
        is_free: form.is_free,
        is_featured: form.is_featured,
        city: form.city,
        state: form.state,
      };

      if (form.short_description) payload.short_description = form.short_description;
      if (form.category_id) payload.category_id = parseInt(form.category_id);
      if (form.tags) payload.tags = form.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (form.end_date) payload.end_date = form.end_date;
      if (form.start_time && !form.is_all_day) payload.start_time = form.start_time;
      if (form.end_time && !form.is_all_day) payload.end_time = form.end_time;
      if (form.venue_name) payload.venue_name = form.venue_name;
      if (form.address) payload.address = form.address;
      if (form.zip) payload.zip = form.zip;
      if (form.featured_image_url) payload.featured_image_url = form.featured_image_url;
      if (!form.is_free && form.price_min) payload.price_min = parseFloat(form.price_min);
      if (!form.is_free && form.price_max) payload.price_max = parseFloat(form.price_max);
      if (form.ticket_url) payload.ticket_url = form.ticket_url;
      if (form.organizer_name) payload.organizer_name = form.organizer_name;
      if (form.organizer_website) payload.organizer_website = form.organizer_website;
      if (form.organizer_email) payload.organizer_email = form.organizer_email;
      if (form.organizer_phone) payload.organizer_phone = form.organizer_phone;
      if (form.feature_priority) payload.feature_priority = parseInt(form.feature_priority);
      if (form.meta_title) payload.meta_title = form.meta_title;
      if (form.meta_description) payload.meta_description = form.meta_description;

      if (isRecurring && recurrenceRule) {
        payload.is_recurring = true;
        payload.recurrence_rule = recurrenceRule;
      }

      // Create event
      const createResponse = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error?.message || 'Failed to create event');
      }

      const result = await createResponse.json();
      const eventId = result.data.id;

      // Publish if requested
      if (publish) {
        await fetch(`/api/admin/events/${eventId}/publish`, { method: 'POST' });
      }

      router.push('/admin/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1">
                Event Title *
              </label>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Spring Barrel Tasting Weekend"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                required
              />
            </div>
            <div>
              <label htmlFor="short_description" className="block text-sm font-medium text-gray-900 mb-1">
                Short Description
              </label>
              <input
                id="short_description"
                type="text"
                value={form.short_description}
                onChange={(e) => updateField('short_description', e.target.value)}
                placeholder="Brief preview text (max 200 chars)"
                maxLength={200}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
              <p className="text-xs text-gray-600 mt-1">{form.short_description.length}/200</p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
                Full Description *
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={6}
                placeholder="Full event details..."
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                required
              />
            </div>
          </div>
        </section>

        {/* Category & Tags */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Categorization</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-900 mb-1">
                Category
              </label>
              <select
                id="category_id"
                value={form.category_id}
                onChange={(e) => updateField('category_id', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-900 mb-1">
                Tags
              </label>
              <input
                id="tags"
                type="text"
                value={form.tags}
                onChange={(e) => updateField('tags', e.target.value)}
                placeholder="wine, tasting, spring (comma separated)"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
          </div>
        </section>

        {/* Date & Time */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Date & Time</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-900 mb-1">
                  Start Date *
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => updateField('start_date', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                  required
                />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-900 mb-1">
                  End Date
                </label>
                <input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => updateField('end_date', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_all_day"
                type="checkbox"
                checked={form.is_all_day}
                onChange={(e) => updateField('is_all_day', e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_all_day" className="text-sm text-gray-700">
                All-day event
              </label>
            </div>
            {!form.is_all_day && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-900 mb-1">
                    Start Time
                  </label>
                  <input
                    id="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => updateField('start_time', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                  />
                </div>
                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-900 mb-1">
                    End Time
                  </label>
                  <input
                    id="end_time"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => updateField('end_time', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recurrence */}
        <RecurrenceSection
          isRecurring={isRecurring}
          onIsRecurringChange={setIsRecurring}
          recurrenceRule={recurrenceRule}
          onRecurrenceRuleChange={setRecurrenceRule}
          startDate={form.start_date}
        />

        {/* Location */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="venue_name" className="block text-sm font-medium text-gray-900 mb-1">
                Venue Name
              </label>
              <input
                id="venue_name"
                type="text"
                value={form.venue_name}
                onChange={(e) => updateField('venue_name', e.target.value)}
                placeholder="e.g., Walla Walla Community Center"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1">
                Address
              </label>
              <input
                id="address"
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="123 Main St"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-1">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-900 mb-1">
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  maxLength={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-gray-900 mb-1">
                  ZIP
                </label>
                <input
                  id="zip"
                  type="text"
                  value={form.zip}
                  onChange={(e) => updateField('zip', e.target.value)}
                  maxLength={10}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Media */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Media</h2>
          <div>
            <label htmlFor="featured_image_url" className="block text-sm font-medium text-gray-900 mb-1">
              Featured Image URL
            </label>
            <input
              id="featured_image_url"
              type="url"
              value={form.featured_image_url}
              onChange={(e) => updateField('featured_image_url', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            />
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="is_free"
                type="checkbox"
                checked={form.is_free}
                onChange={(e) => updateField('is_free', e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_free" className="text-sm text-gray-700">
                Free event
              </label>
            </div>
            {!form.is_free && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price_min" className="block text-sm font-medium text-gray-900 mb-1">
                      Min Price ($)
                    </label>
                    <input
                      id="price_min"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price_min}
                      onChange={(e) => updateField('price_min', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="price_max" className="block text-sm font-medium text-gray-900 mb-1">
                      Max Price ($)
                    </label>
                    <input
                      id="price_max"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price_max}
                      onChange={(e) => updateField('price_max', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="ticket_url" className="block text-sm font-medium text-gray-900 mb-1">
                    Ticket URL
                  </label>
                  <input
                    id="ticket_url"
                    type="url"
                    value={form.ticket_url}
                    onChange={(e) => updateField('ticket_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Organizer */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizer Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="organizer_name" className="block text-sm font-medium text-gray-900 mb-1">
                Organizer Name
              </label>
              <input
                id="organizer_name"
                type="text"
                value={form.organizer_name}
                onChange={(e) => updateField('organizer_name', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
            <div>
              <label htmlFor="organizer_website" className="block text-sm font-medium text-gray-900 mb-1">
                Website
              </label>
              <input
                id="organizer_website"
                type="url"
                value={form.organizer_website}
                onChange={(e) => updateField('organizer_website', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
            <div>
              <label htmlFor="organizer_email" className="block text-sm font-medium text-gray-900 mb-1">
                Email
              </label>
              <input
                id="organizer_email"
                type="email"
                value={form.organizer_email}
                onChange={(e) => updateField('organizer_email', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
            <div>
              <label htmlFor="organizer_phone" className="block text-sm font-medium text-gray-900 mb-1">
                Phone
              </label>
              <PhoneInput
                id="organizer_phone"
                value={form.organizer_phone}
                onChange={(value) => updateField('organizer_phone', value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
          </div>
        </section>

        {/* SEO & Featured */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SEO & Visibility</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="is_featured"
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => updateField('is_featured', e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_featured" className="text-sm text-gray-700">
                Feature this event on the homepage
              </label>
            </div>
            {form.is_featured && (
              <div>
                <label htmlFor="feature_priority" className="block text-sm font-medium text-gray-900 mb-1">
                  Feature Priority (higher = more prominent)
                </label>
                <input
                  id="feature_priority"
                  type="number"
                  min="0"
                  value={form.feature_priority}
                  onChange={(e) => updateField('feature_priority', e.target.value)}
                  className="w-32 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
              </div>
            )}
            <div>
              <label htmlFor="meta_title" className="block text-sm font-medium text-gray-900 mb-1">
                Meta Title
              </label>
              <input
                id="meta_title"
                type="text"
                value={form.meta_title}
                onChange={(e) => updateField('meta_title', e.target.value)}
                placeholder="Auto-generated from title if empty"
                maxLength={255}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
            <div>
              <label htmlFor="meta_description" className="block text-sm font-medium text-gray-900 mb-1">
                Meta Description
              </label>
              <textarea
                id="meta_description"
                value={form.meta_description}
                onChange={(e) => updateField('meta_description', e.target.value)}
                rows={2}
                placeholder="Auto-generated from short description if empty"
                maxLength={300}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
              <p className="text-xs text-gray-600 mt-1">{form.meta_description.length}/300</p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-8">
          <button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !form.title || !form.description || !form.start_date}
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !form.title || !form.description || !form.start_date}
            className="px-5 py-2.5 rounded-lg bg-[#1E3A5F] text-white font-medium hover:bg-[#1E3A5F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Publishing...' : 'Save & Publish'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 text-gray-600 font-medium hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
