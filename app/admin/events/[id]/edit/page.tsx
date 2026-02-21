'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import type { EventCategory, EventWithCategory } from '@/lib/types/events';
import { RecurrenceSection } from '@/components/events/RecurrenceSection';

export default function AdminEditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [parentEventId, setParentEventId] = useState<number | null>(null);
  const [recurrenceRule, setRecurrenceRule] = useState<any>(null);

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
    status: 'draft',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventRes, catRes] = await Promise.all([
          fetch(`/api/admin/events/${id}`),
          fetch('/api/v1/events/categories'),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.data);
        }

        if (!eventRes.ok) {
          setError('Event not found');
          return;
        }

        const eventData = await eventRes.json();
        const event: EventWithCategory = eventData.data;

        setForm({
          title: event.title || '',
          short_description: event.short_description || '',
          description: event.description || '',
          category_id: event.category_id?.toString() || '',
          tags: event.tags?.join(', ') || '',
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
          is_free: event.is_free ?? true,
          price_min: event.price_min?.toString() || '',
          price_max: event.price_max?.toString() || '',
          ticket_url: event.ticket_url || '',
          organizer_name: event.organizer_name || '',
          organizer_website: event.organizer_website || '',
          organizer_email: event.organizer_email || '',
          organizer_phone: event.organizer_phone || '',
          is_featured: event.is_featured || false,
          feature_priority: event.feature_priority?.toString() || '0',
          meta_title: event.meta_title || '',
          meta_description: event.meta_description || '',
          status: event.status || 'draft',
        });

        setIsRecurring(event.is_recurring || false);
        setParentEventId(event.parent_event_id || null);
        setRecurrenceRule(event.recurrence_rule || null);
      } catch (err) {
        setError('Failed to load event');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (scope?: 'series') => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        short_description: form.short_description || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        start_time: !form.is_all_day && form.start_time ? form.start_time : null,
        end_time: !form.is_all_day && form.end_time ? form.end_time : null,
        is_all_day: form.is_all_day,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
        venue_name: form.venue_name || null,
        address: form.address || null,
        city: form.city,
        state: form.state,
        zip: form.zip || null,
        featured_image_url: form.featured_image_url || null,
        is_free: form.is_free,
        price_min: !form.is_free && form.price_min ? parseFloat(form.price_min) : null,
        price_max: !form.is_free && form.price_max ? parseFloat(form.price_max) : null,
        ticket_url: form.ticket_url || null,
        organizer_name: form.organizer_name || null,
        organizer_website: form.organizer_website || null,
        organizer_email: form.organizer_email || null,
        organizer_phone: form.organizer_phone || null,
        is_featured: form.is_featured,
        feature_priority: parseInt(form.feature_priority) || 0,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      };

      const url = scope
        ? `/api/admin/events/${id}?scope=series`
        : `/api/admin/events/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update event');
      }

      router.push('/admin/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-100 rounded-xl" />
          <div className="h-48 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              form.status === 'published'
                ? 'bg-emerald-50 text-emerald-800'
                : form.status === 'cancelled'
                  ? 'bg-red-50 text-red-800'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {form.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {parentEventId && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">This event is part of a recurring series</p>
          <p className="text-sm text-blue-700 mt-1">Changes will apply to this date only unless you choose to update all future instances.</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
              <input id="title" type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" required />
            </div>
            <div>
              <label htmlFor="short_description" className="block text-sm font-medium text-gray-900 mb-1">Short Description</label>
              <input id="short_description" type="text" value={form.short_description} onChange={(e) => updateField('short_description', e.target.value)} maxLength={200} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
              <p className="text-xs text-gray-600 mt-1">{form.short_description.length}/200</p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">Full Description *</label>
              <textarea id="description" value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={6} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" required />
            </div>
          </div>
        </section>

        {/* Category & Tags */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Categorization</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-900 mb-1">Category</label>
              <select id="category_id" value={form.category_id} onChange={(e) => updateField('category_id', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30">
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-900 mb-1">Tags</label>
              <input id="tags" type="text" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="comma separated" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
          </div>
        </section>

        {/* Date & Time */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Date & Time</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-900 mb-1">Start Date *</label>
                <input id="start_date" type="date" value={form.start_date} onChange={(e) => updateField('start_date', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" required />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-900 mb-1">End Date</label>
                <input id="end_date" type="date" value={form.end_date} onChange={(e) => updateField('end_date', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="is_all_day" type="checkbox" checked={form.is_all_day} onChange={(e) => updateField('is_all_day', e.target.checked)} className="rounded border-gray-300" />
              <label htmlFor="is_all_day" className="text-sm text-gray-700">All-day event</label>
            </div>
            {!form.is_all_day && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-900 mb-1">Start Time</label>
                  <input id="start_time" type="time" value={form.start_time} onChange={(e) => updateField('start_time', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
                </div>
                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-900 mb-1">End Time</label>
                  <input id="end_time" type="time" value={form.end_time} onChange={(e) => updateField('end_time', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recurrence (read-only for parent events) */}
        {isRecurring && !parentEventId && recurrenceRule && (
          <RecurrenceSection
            isRecurring={true}
            onIsRecurringChange={() => {}}
            recurrenceRule={recurrenceRule}
            onRecurrenceRuleChange={() => {}}
            startDate={form.start_date}
            readOnly
          />
        )}

        {/* Location */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="venue_name" className="block text-sm font-medium text-gray-900 mb-1">Venue Name</label>
              <input id="venue_name" type="text" value={form.venue_name} onChange={(e) => updateField('venue_name', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-1">Address</label>
              <input id="address" type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-1">City</label>
                <input id="city" type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-900 mb-1">State</label>
                <input id="state" type="text" value={form.state} onChange={(e) => updateField('state', e.target.value)} maxLength={2} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-gray-900 mb-1">ZIP</label>
                <input id="zip" type="text" value={form.zip} onChange={(e) => updateField('zip', e.target.value)} maxLength={10} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input id="is_free" type="checkbox" checked={form.is_free} onChange={(e) => updateField('is_free', e.target.checked)} className="rounded border-gray-300" />
              <label htmlFor="is_free" className="text-sm text-gray-700">Free event</label>
            </div>
            {!form.is_free && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="price_min" className="block text-sm font-medium text-gray-900 mb-1">Min Price ($)</label>
                  <input id="price_min" type="number" step="0.01" min="0" value={form.price_min} onChange={(e) => updateField('price_min', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
                </div>
                <div>
                  <label htmlFor="price_max" className="block text-sm font-medium text-gray-900 mb-1">Max Price ($)</label>
                  <input id="price_max" type="number" step="0.01" min="0" value={form.price_max} onChange={(e) => updateField('price_max', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
                </div>
                <div>
                  <label htmlFor="ticket_url" className="block text-sm font-medium text-gray-900 mb-1">Ticket URL</label>
                  <input id="ticket_url" type="url" value={form.ticket_url} onChange={(e) => updateField('ticket_url', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Organizer */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="organizer_name" className="block text-sm font-medium text-gray-900 mb-1">Name</label>
              <input id="organizer_name" type="text" value={form.organizer_name} onChange={(e) => updateField('organizer_name', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <div>
              <label htmlFor="organizer_website" className="block text-sm font-medium text-gray-900 mb-1">Website</label>
              <input id="organizer_website" type="url" value={form.organizer_website} onChange={(e) => updateField('organizer_website', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <div>
              <label htmlFor="organizer_email" className="block text-sm font-medium text-gray-900 mb-1">Email</label>
              <input id="organizer_email" type="email" value={form.organizer_email} onChange={(e) => updateField('organizer_email', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <div>
              <label htmlFor="organizer_phone" className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
              <input id="organizer_phone" type="tel" value={form.organizer_phone} onChange={(e) => updateField('organizer_phone', e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
          </div>
        </section>

        {/* SEO & Featured */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SEO & Visibility</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input id="is_featured" type="checkbox" checked={form.is_featured} onChange={(e) => updateField('is_featured', e.target.checked)} className="rounded border-gray-300" />
              <label htmlFor="is_featured" className="text-sm text-gray-700">Feature this event</label>
            </div>
            <div>
              <label htmlFor="meta_title" className="block text-sm font-medium text-gray-900 mb-1">Meta Title</label>
              <input id="meta_title" type="text" value={form.meta_title} onChange={(e) => updateField('meta_title', e.target.value)} maxLength={255} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
            <div>
              <label htmlFor="meta_description" className="block text-sm font-medium text-gray-900 mb-1">Meta Description</label>
              <textarea id="meta_description" value={form.meta_description} onChange={(e) => updateField('meta_description', e.target.value)} rows={2} maxLength={300} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-8">
          {/* Parent event: save all future instances */}
          {isRecurring && !parentEventId ? (
            <>
              <button
                onClick={() => handleSave('series')}
                disabled={isSubmitting || !form.title || !form.description || !form.start_date}
                className="px-5 py-2.5 rounded-lg bg-[#1E3A5F] text-white font-medium hover:bg-[#1E3A5F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save All Future Instances'}
              </button>
            </>
          ) : parentEventId ? (
            /* Instance event: save this or all future */
            <>
              <button
                onClick={() => handleSave()}
                disabled={isSubmitting || !form.title || !form.description || !form.start_date}
                className="px-5 py-2.5 rounded-lg bg-[#1E3A5F] text-white font-medium hover:bg-[#1E3A5F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save This Instance'}
              </button>
              <button
                onClick={() => handleSave('series')}
                disabled={isSubmitting || !form.title || !form.description || !form.start_date}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save All Future'}
              </button>
            </>
          ) : (
            /* Standalone event */
            <button
              onClick={() => handleSave()}
              disabled={isSubmitting || !form.title || !form.description || !form.start_date}
              className="px-5 py-2.5 rounded-lg bg-[#1E3A5F] text-white font-medium hover:bg-[#1E3A5F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          )}
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
