'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-emerald-50 text-emerald-800',
    pending_review: 'bg-amber-50 text-amber-800',
    cancelled: 'bg-red-50 text-red-800',
  };
  const labels: Record<string, string> = {
    draft: 'Draft',
    published: 'Published',
    pending_review: 'Pending Review',
    cancelled: 'Cancelled',
  };
  const cls = styles[status] || 'bg-gray-100 text-gray-700';
  const label = labels[status] || status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

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
    <div className="max-w-3xl space-y-8">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
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

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [form, setForm] = useState<EventFormData>({
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
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [eventStatus, setEventStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventRes, catRes] = await Promise.all([
          fetch(`/api/organizer/events/${eventId}`),
          fetch('/api/v1/events/categories'),
        ]);

        if (!eventRes.ok) {
          if (eventRes.status === 404) {
            setNotFound(true);
          } else {
            setError('Failed to load event.');
          }
          setLoading(false);
          return;
        }

        const eventData = await eventRes.json();
        const event = eventData.event || eventData;

        setEventStatus(event.status || 'draft');
        setForm({
          title: event.title || '',
          short_description: event.short_description || '',
          description: event.description || '',
          category_id: event.category_id ? String(event.category_id) : '',
          tags: Array.isArray(event.tags) ? event.tags.join(', ') : (event.tags || ''),
          start_date: event.start_date || '',
          end_date: event.end_date || '',
          start_time: event.start_time || '',
          end_time: event.end_time || '',
          is_all_day: event.is_all_day || false,
          venue_name: event.venue_name || '',
          address: event.address || '',
          city: event.city || 'Walla Walla',
          state: event.state || 'WA',
          zip: event.zip || '',
          featured_image_url: event.featured_image_url || '',
          is_free: event.is_free !== undefined ? event.is_free : true,
          price_min: event.price_min != null ? String(event.price_min) : '',
          price_max: event.price_max != null ? String(event.price_max) : '',
          ticket_url: event.ticket_url || '',
          meta_title: event.meta_title || '',
          meta_description: event.meta_description || '',
        });

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || catData || []);
        }
      } catch {
        setError('Failed to load event. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

      const res = await fetch(`/api/organizer/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update event.');
        setSaving(false);
        return;
      }

      router.push('/organizer-portal/events');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FormSkeleton />;
  }

  if (notFound) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-700 font-medium">Event not found</p>
        <p className="text-gray-600 text-sm mt-1">This event may have been deleted or you do not have access.</p>
        <Link
          href="/organizer-portal/events"
          className="inline-block mt-4 text-sm font-medium text-[#8B1538] hover:underline"
        >
          Back to My Events
        </Link>
      </div>
    );
  }

  const canEdit = eventStatus === 'draft' || eventStatus === 'pending_review';
  const isPublished = eventStatus === 'published';

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-sm';

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
          {eventStatus && statusBadge(eventStatus)}
        </div>
        <Link
          href="/organizer-portal/events"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          &larr; Back to Events
        </Link>
      </div>

      {/* Published warning */}
      {isPublished && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 text-sm font-medium">Warning: Editing a published event</p>
          <p className="text-amber-700 text-sm mt-1">
            Saving changes will change this event back to draft status. You will need to submit it for review again to be published.
          </p>
        </div>
      )}

      {/* Cannot edit */}
      {!canEdit && !isPublished && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
          <p className="text-gray-700 text-sm">This event cannot be edited in its current status.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
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
          <Link
            href="/organizer-portal/events"
            className="border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-6 py-2.5 font-medium transition-colors text-sm text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#8B1538] text-white hover:bg-[#722F37] rounded-lg px-6 py-2.5 font-medium transition-colors text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
