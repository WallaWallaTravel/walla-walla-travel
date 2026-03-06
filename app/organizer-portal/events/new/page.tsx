'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RecurrenceSection } from '@/components/events/RecurrenceSection';
import { TagSelector } from '@/components/events/TagSelector';
import ImageEditorModal from '@/components/admin/ImageEditorModal';
import type { EventTag } from '@/lib/types/events';

interface Category {
  id: number;
  name: string;
  slug: string;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<EventTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'review'>('draft');
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recurrence (advanced)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<{
    frequency: 'weekly' | 'biweekly' | 'monthly';
    days_of_week?: number[];
    day_of_month?: number;
    end_type: 'count' | 'until_date';
    count?: number;
    until_date?: string;
  } | null>(null);

  // Essential fields
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    start_date: '',
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
    // Advanced fields
    short_description: '',
    end_date: '',
    meta_title: '',
    meta_description: '',
  });

  useEffect(() => {
    async function fetchFormData() {
      try {
        const [catRes, tagRes] = await Promise.all([
          fetch('/api/v1/events/categories'),
          fetch('/api/v1/events/tags'),
        ]);
        if (catRes.ok) {
          const data = await catRes.json();
          setCategories(data.categories || data.data || data || []);
        }
        if (tagRes.ok) {
          const data = await tagRes.json();
          setAvailableTags(data.data || []);
        }
      } catch {
        // Categories/tags are optional
      } finally {
        setLoading(false);
      }
    }
    fetchFormData();
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

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setShowCropModal(true);
  }

  async function handleCropSave(blob: Blob, fileName: string) {
    setShowCropModal(false);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('folder', 'events');

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.url || data.data?.url;
        if (url) {
          setForm((prev) => ({ ...prev, featured_image_url: url }));
          setImagePreview(URL.createObjectURL(blob));
        }
      }
    } catch {
      setError('Failed to upload image');
    } finally {
      setIsUploading(false);
      setImageFile(null);
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
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        start_date: form.start_date,
        is_all_day: form.is_all_day,
        is_free: form.is_free,
        city: form.city,
        state: form.state,
        category_id: form.category_id ? parseInt(form.category_id, 10) : null,
        tags: [],
        price_min: form.price_min ? parseFloat(form.price_min) : null,
        price_max: form.price_max ? parseFloat(form.price_max) : null,
      };

      if (form.short_description) payload.short_description = form.short_description;
      if (form.end_date) payload.end_date = form.end_date;
      if (!form.is_all_day && form.start_time) payload.start_time = form.start_time;
      if (!form.is_all_day && form.end_time) payload.end_time = form.end_time;
      if (form.venue_name) payload.venue_name = form.venue_name;
      if (form.address) payload.address = form.address;
      if (form.zip) payload.zip = form.zip;
      if (form.featured_image_url) payload.featured_image_url = form.featured_image_url;
      if (form.ticket_url) payload.ticket_url = form.ticket_url;
      if (form.meta_title) payload.meta_title = form.meta_title;
      if (form.meta_description) payload.meta_description = form.meta_description;

      if (selectedTagIds.length > 0) {
        payload.tag_ids = selectedTagIds;
      }

      if (isRecurring && recurrenceRule) {
        payload.is_recurring = true;
        payload.recurrence_rule = recurrenceRule;
      }

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

      <form onSubmit={(e) => handleSubmit(e, submitAction)} className="space-y-6">
        {/* Event Name */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>Event Details</SectionHeading>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" required>Event Name</Label>
              <input
                type="text"
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                className={inputCls}
                placeholder="What's the name of your event?"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                className={inputCls}
                placeholder="Tell people what to expect at your event..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category_id">Category</Label>
                <select
                  id="category_id"
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <TagSelector
                  availableTags={availableTags}
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start_date" required>Date</Label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className={inputCls}
                  required
                />
              </div>
              {!form.is_all_day && (
                <>
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <input
                      type="time"
                      id="start_time"
                      name="start_time"
                      value={form.start_time}
                      onChange={handleChange}
                      className={inputCls}
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
                    />
                  </div>
                </>
              )}
            </div>
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
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <input type="text" id="city" name="city" value={form.city} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <input type="text" id="state" name="state" value={form.state} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <Label htmlFor="zip">ZIP</Label>
                <input type="text" id="zip" name="zip" value={form.zip} onChange={handleChange} className={inputCls} placeholder="99362" />
              </div>
            </div>
          </div>
        </section>

        {/* Image Upload */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeading>Event Image</SectionHeading>
          <div className="space-y-3">
            {(imagePreview || form.featured_image_url) && (
              <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview || form.featured_image_url}
                  alt="Event preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <span className="text-xs text-gray-600">Recommended: 16:9 aspect ratio</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                aria-label="Upload event image"
              />
            </div>
            <div>
              <Label htmlFor="featured_image_url">Or paste image URL</Label>
              <input
                type="url"
                id="featured_image_url"
                name="featured_image_url"
                value={form.featured_image_url}
                onChange={handleChange}
                className={inputCls}
                placeholder="https://example.com/image.jpg"
              />
            </div>
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
                  <Label htmlFor="price_min">Price ($)</Label>
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
                  />
                </div>
                <div>
                  <Label htmlFor="price_max">Max Price ($)</Label>
                  <input
                    type="number"
                    id="price_max"
                    name="price_max"
                    value={form.price_max}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="Optional — for price range"
                    min="0"
                    step="0.01"
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
              />
            </div>
          </div>
        </section>

        {/* Advanced Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#8B1538] transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-6 mt-4">
              {/* Short Description */}
              <section className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeading>Short Description</SectionHeading>
                <input
                  type="text"
                  id="short_description"
                  name="short_description"
                  value={form.short_description}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Brief summary (shown in search results)"
                  maxLength={200}
                />
                <p className="text-xs text-gray-600 mt-1">{form.short_description.length}/200 characters</p>
              </section>

              {/* Multi-day */}
              <section className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeading>Multi-Day Event</SectionHeading>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className={inputCls}
                  />
                  <p className="text-xs text-gray-600 mt-1">Leave blank for single-day events</p>
                </div>
              </section>

              {/* Recurring */}
              <RecurrenceSection
                isRecurring={isRecurring}
                onIsRecurringChange={setIsRecurring}
                recurrenceRule={recurrenceRule}
                onRecurrenceRuleChange={setRecurrenceRule}
                startDate={form.start_date}
              />

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
                      maxLength={70}
                    />
                  </div>
                  <div>
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <textarea
                      id="meta_description"
                      name="meta_description"
                      value={form.meta_description}
                      onChange={handleChange}
                      rows={2}
                      className={inputCls}
                      placeholder="Custom description for search engines"
                      maxLength={160}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

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

      {/* Image Crop Modal */}
      {showCropModal && imageFile && (
        <ImageEditorModal
          imageFile={imageFile}
          onSave={handleCropSave}
          onCancel={() => {
            setShowCropModal(false);
            setImageFile(null);
          }}
          initialAspectRatio={16 / 9}
        />
      )}
    </div>
  );
}
