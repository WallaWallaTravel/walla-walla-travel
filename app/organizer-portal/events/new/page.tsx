'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface EventFormData {
  title: string;
  short_description: string;
  description: string;
  category_id: string;
  tags: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  venue_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  featured_image_url: string;
  is_free: boolean;
  price_min: string;
  price_max: string;
  ticket_url: string;
  meta_title: string;
  meta_description: string;
}

const initialFormData: EventFormData = {
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
  meta_title: '',
  meta_description: '',
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-900 mb-4">{children}</h2>;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-900 mb-1">
      {children}
      {required && <span className="text-red-600 ml-0.5">*</span>}
    </label>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function CreateEventPage() {
  const router = useRouter();
  const [form, setForm] = useState<EventFormData>(initialFormData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'review'>('draft');
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/v1/events/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || data || []);
        }
      } catch {
        // Categories are optional, can still create event
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent, action: 'draft' | 'review') {
    e.preventDefault();
    setSubmitAction(action);
    setSaving(true);
    setError('');

    if (!form.title.trim()) {
      setError('Event title is required.');
      setSaving(false);
      return;
    }
    if (!form.start_date) {
      setError('Start date is required.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id, 10) : null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        price_min: form.price_min ? parseFloat(form.price_min) : null,
        price_max: form.price_max ? parseFloat(form.price_max) : null,
      };

      const res = await fetch('/api/organizer/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create event.');
        setSaving(false);
        return;
      }

      const created = await res.json();
      const eventId = created.id || created.event?.id;

      if (action === 'review' && eventId) {
        const submitRes = await fetch(`/api/organizer/events/${eventId}/submit`, { method: 'POST' });
        if (!submitRes.ok) {
          // Event created but submit failed - redirect to events list anyway
          router.push('/organizer-portal/events');
          return;
        }
      }

      router.push('/organizer-portal/events');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <FormSkeleton />
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-sm';

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
        <p className="text-gray-600 mt-1">Fill in the details below to create a new event listing.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, submitAction)} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>Basic Information</SectionHeading>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" required>Event Title</Label>
              <input
                type="text"
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                className={inputCls}
                placeholder="Enter event title"
                aria-label="Event title"
                required
              />
            </div>
            <div>
              <Label htmlFor="short_description">Short Description</Label>
              <input
                type="text"
                id="short_description"
                name="short_description"
                value={form.short_description}
                onChange={handleChange}
                className={inputCls}
                placeholder="Brief summary of the event"
                aria-label="Short description"
                maxLength={200}
              />
              <p className="text-xs text-gray-600 mt-1">{form.short_description.length}/200 characters</p>
            </div>
            <div>
              <Label htmlFor="description">Full Description</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={6}
                className={inputCls}
                placeholder="Detailed description of the event"
                aria-label="Full description"
              />
            </div>
          </div>
        </section>

        {/* Category & Tags */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>Category &amp; Tags</SectionHeading>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category_id">Category</Label>
              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                className={inputCls}
                aria-label="Event category"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="tags">Tags</Label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                className={inputCls}
                placeholder="e.g., wine, music, family-friendly (comma separated)"
                aria-label="Event tags"
              />
              <p className="text-xs text-gray-600 mt-1">Separate multiple tags with commas</p>
            </div>
          </div>
        </section>

        {/* Date & Time */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>Date &amp; Time</SectionHeading>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_all_day"
                name="is_all_day"
                checked={form.is_all_day}
                onChange={handleChange}
                className="rounded border-gray-300 text-[#8B1538] focus:ring-[#8B1538]"
              />
              <label htmlFor="is_all_day" className="text-sm font-medium text-gray-900">All-day event</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" required>Start Date</Label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className={inputCls}
                  aria-label="Start date"
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  className={inputCls}
                  aria-label="End date"
                />
              </div>
            </div>
            {!form.is_all_day && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <input
                    type="time"
                    id="start_time"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleChange}
                    className={inputCls}
                    aria-label="Start time"
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <input
                    type="time"
                    id="end_time"
                    name="end_time"
                    value={form.end_time}
                    onChange={handleChange}
                    className={inputCls}
                    aria-label="End time"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Location */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>Location</SectionHeading>
          <div className="space-y-4">
            <div>
              <Label htmlFor="venue_name">Venue Name</Label>
              <input
                type="text"
                id="venue_name"
                name="venue_name"
                value={form.venue_name}
                onChange={handleChange}
                className={inputCls}
                placeholder="e.g., Marcus Whitman Hotel"
                aria-label="Venue name"
              />
            </div>
            <div>
              <Label htmlFor="address">Street Address</Label>
              <input
                type="text"
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                className={inputCls}
                placeholder="123 Main St"
                aria-label="Street address"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className={inputCls}
                  aria-label="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className={inputCls}
                  aria-label="State"
                />
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={form.zip}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="99362"
                  aria-label="ZIP code"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Media */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>Media</SectionHeading>
          <div>
            <Label htmlFor="featured_image_url">Featured Image URL</Label>
            <input
              type="url"
              id="featured_image_url"
              name="featured_image_url"
              value={form.featured_image_url}
              onChange={handleChange}
              className={inputCls}
              placeholder="https://example.com/image.jpg"
              aria-label="Featured image URL"
            />
            <p className="text-xs text-gray-600 mt-1">Paste a direct link to the event image</p>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>Pricing</SectionHeading>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_free"
                name="is_free"
                checked={form.is_free}
                onChange={handleChange}
                className="rounded border-gray-300 text-[#8B1538] focus:ring-[#8B1538]"
              />
              <label htmlFor="is_free" className="text-sm font-medium text-gray-900">This is a free event</label>
            </div>
            {!form.is_free && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_min">Minimum Price ($)</Label>
                  <input
                    type="number"
                    id="price_min"
                    name="price_min"
                    value={form.price_min}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    aria-label="Minimum price"
                  />
                </div>
                <div>
                  <Label htmlFor="price_max">Maximum Price ($)</Label>
                  <input
                    type="number"
                    id="price_max"
                    name="price_max"
                    value={form.price_max}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    aria-label="Maximum price"
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="ticket_url">Ticket / Registration URL</Label>
              <input
                type="url"
                id="ticket_url"
                name="ticket_url"
                value={form.ticket_url}
                onChange={handleChange}
                className={inputCls}
                placeholder="https://tickets.example.com/event"
                aria-label="Ticket URL"
              />
            </div>
          </div>
        </section>

        {/* SEO */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>SEO (Optional)</SectionHeading>
          <div className="space-y-4">
            <div>
              <Label htmlFor="meta_title">Meta Title</Label>
              <input
                type="text"
                id="meta_title"
                name="meta_title"
                value={form.meta_title}
                onChange={handleChange}
                className={inputCls}
                placeholder="Custom title for search engines"
                aria-label="Meta title"
                maxLength={70}
              />
              <p className="text-xs text-gray-600 mt-1">{form.meta_title.length}/70 characters</p>
            </div>
            <div>
              <Label htmlFor="meta_description">Meta Description</Label>
              <textarea
                id="meta_description"
                name="meta_description"
                value={form.meta_description}
                onChange={handleChange}
                rows={3}
                className={inputCls}
                placeholder="Custom description for search engines"
                aria-label="Meta description"
                maxLength={160}
              />
              <p className="text-xs text-gray-600 mt-1">{form.meta_description.length}/160 characters</p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            type="submit"
            onClick={() => setSubmitAction('draft')}
            disabled={saving}
            className="border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-6 py-2.5 font-medium transition-colors text-sm disabled:opacity-50"
          >
            {saving && submitAction === 'draft' ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="submit"
            onClick={() => setSubmitAction('review')}
            disabled={saving}
            className="bg-[#8B1538] text-white hover:bg-[#722F37] rounded-lg px-6 py-2.5 font-medium transition-colors text-sm disabled:opacity-50"
          >
            {saving && submitAction === 'review' ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
