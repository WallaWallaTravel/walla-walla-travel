'use client';

/**
 * Custom hook encapsulating all state, data loading, CRUD operations,
 * and form submission logic for the new trip proposal page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { useToast } from '@/lib/hooks/useToast';
import type { SmartImportResult } from '@/lib/import/types';

import type {
  Brand,
  Winery,
  Restaurant,
  Hotel,
  StopData,
  DayData,
  GuestData,
  InclusionData,
  FormData,
} from './types';
import { SERVICE_TEMPLATES } from './types';
import { calculateTotals, addDaysToDate } from './utils';

export function useProposalForm() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'days' | 'guests' | 'pricing'>('details');
  const { toasts, toast, dismissToast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const defaultValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<SmartImportResult | null>(null);

  const [formData, setFormData] = useState<FormData>({
    brand_id: null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_company: '',
    trip_type: 'wine_tour',
    party_size: 4,
    start_date: today,
    end_date: today,
    introduction: 'Thank you for your interest in Walla Walla wine country! We are excited to create a memorable experience for you and your guests.',
    internal_notes: '',
    valid_until: defaultValidUntil,
    deposit_percentage: 50,
    gratuity_percentage: 0,
    tax_rate: 9.1,
    discount_amount: 0,
    discount_reason: '',
    days: [],
    guests: [],
    inclusions: [],
  });

  // ── Data loading ──────────────────────────────────────────────────────
  useEffect(() => {
    loadBrands();
    loadWineries();
    loadRestaurants();
    loadHotels();
  }, []);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      if (formData.days.length !== dayCount) {
        const newDays: DayData[] = [];
        for (let i = 0; i < dayCount; i++) {
          const dayDate = new Date(start);
          dayDate.setDate(dayDate.getDate() + i);
          const existingDay = formData.days[i];
          newDays.push({
            id: existingDay?.id || `day-${Date.now()}-${i}`,
            day_number: i + 1,
            date: dayDate.toISOString().split('T')[0],
            title: existingDay?.title || `Day ${i + 1}`,
            notes: existingDay?.notes || '',
            stops: existingDay?.stops || [],
          });
        }
        setFormData(prev => ({ ...prev, days: newDays }));
      }
    }
  }, [formData.start_date, formData.end_date, formData.days]);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brands');
      const result = await response.json();
      if (result.success) {
        setBrands(result.data || []);
        const defaultBrand = result.data?.find((b: Brand) => b.default_brand);
        if (defaultBrand) {
          setFormData(prev => ({ ...prev, brand_id: defaultBrand.id }));
        }
      }
    } catch (error) {
      logger.error('Failed to load brands', { error });
    }
  };

  const loadWineries = async () => {
    try {
      const response = await fetch('/api/wineries');
      const result = await response.json();
      if (result.success) setWineries(result.data || []);
    } catch (error) {
      logger.error('Failed to load wineries', { error });
    }
  };

  const loadRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants');
      const result = await response.json();
      if (result.success) setRestaurants(result.data || []);
    } catch (error) {
      logger.error('Failed to load restaurants', { error });
    }
  };

  const loadHotels = async () => {
    try {
      const response = await fetch('/api/hotels');
      const result = await response.json();
      if (result.success) setHotels(result.data || []);
    } catch (error) {
      logger.error('Failed to load hotels', { error });
    }
  };

  // ── Smart Import ──────────────────────────────────────────────────────
  const applyImportResult = useCallback(() => {
    if (!importResult) return;

    const { proposal, days: importDays, guests: importGuests, inclusions: importInclusions } = importResult;
    const ts = Date.now();

    setFormData(prev => {
      const updated = { ...prev };

      if (proposal.customer_name) updated.customer_name = proposal.customer_name;
      if (proposal.customer_email) updated.customer_email = proposal.customer_email;
      if (proposal.customer_phone) updated.customer_phone = proposal.customer_phone;
      if (proposal.customer_company) updated.customer_company = proposal.customer_company;
      if (proposal.trip_type) updated.trip_type = proposal.trip_type;
      if (proposal.party_size) updated.party_size = proposal.party_size;
      if (proposal.start_date) updated.start_date = proposal.start_date;
      if (proposal.end_date) updated.end_date = proposal.end_date;
      if (proposal.introduction) updated.introduction = proposal.introduction;
      if (proposal.internal_notes) updated.internal_notes = proposal.internal_notes;

      if (importDays.length > 0) {
        updated.days = importDays.map((day, i) => ({
          id: `day-import-${ts}-${i}`,
          day_number: i + 1,
          date: day.date || (proposal.start_date ? addDaysToDate(proposal.start_date, i) : ''),
          title: day.title || `Day ${i + 1}`,
          stops: day.stops.map((stop, j) => ({
            id: `stop-import-${ts}-${i}-${j}`,
            stop_order: j + 1,
            stop_type: stop.stop_type || 'custom',
            winery_id: stop.matched_venue_type === 'winery' ? stop.matched_venue_id : undefined,
            restaurant_id: stop.matched_venue_type === 'restaurant' ? stop.matched_venue_id : undefined,
            hotel_id: stop.matched_venue_type === 'hotel' ? stop.matched_venue_id : undefined,
            custom_name: stop.custom_name || (!stop.matched_venue_id ? stop.venue_name : undefined),
            custom_address: stop.custom_address,
            scheduled_time: stop.scheduled_time,
            duration_minutes: stop.duration_minutes,
            per_person_cost: 0,
            flat_cost: 0,
            cost_note: stop.cost_note,
            reservation_status: 'pending',
            client_notes: stop.client_notes,
          })),
        }));
      }

      if (importGuests.length > 0) {
        updated.guests = importGuests.map((guest, i) => ({
          id: `guest-import-${ts}-${i}`,
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          dietary_restrictions: guest.dietary_restrictions,
          is_primary: guest.is_primary ?? (i === 0),
        }));
      }

      if (importInclusions.length > 0) {
        updated.inclusions = importInclusions.map((incl, i) => ({
          id: `incl-import-${ts}-${i}`,
          inclusion_type: incl.inclusion_type || 'custom',
          description: incl.description,
          pricing_type: incl.pricing_type || 'flat',
          quantity: incl.quantity || 1,
          unit_price: incl.unit_price || 0,
          total_price: 0,
        }));
      }

      return updated;
    });

    setImportOpen(false);
    setImportResult(null);
    toast('Data applied to form. Review and adjust as needed.', 'success');
  }, [importResult, toast]);

  // ── CRUD operations ───────────────────────────────────────────────────
  const addStop = (dayIndex: number, stopType: string) => {
    const newStop: StopData = {
      id: `stop-${Date.now()}`,
      stop_order: formData.days[dayIndex].stops.length + 1,
      stop_type: stopType,
      scheduled_time: '10:00',
      duration_minutes: 60,
      per_person_cost: 0,
      flat_cost: 0,
      reservation_status: 'pending',
    };
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, idx) =>
        idx === dayIndex ? { ...day, stops: [...day.stops, newStop] } : day
      ),
    }));
  };

  const updateStop = (dayIndex: number, stopIndex: number, updates: Partial<StopData>) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, dIdx) =>
        dIdx === dayIndex
          ? { ...day, stops: day.stops.map((stop, sIdx) => sIdx === stopIndex ? { ...stop, ...updates } : stop) }
          : day
      ),
    }));
  };

  const removeStop = (dayIndex: number, stopIndex: number) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, dIdx) =>
        dIdx === dayIndex ? { ...day, stops: day.stops.filter((_, sIdx) => sIdx !== stopIndex) } : day
      ),
    }));
  };

  const addGuest = () => {
    const newGuest: GuestData = {
      id: `guest-${Date.now()}`,
      name: '',
      is_primary: formData.guests.length === 0,
    };
    setFormData(prev => ({ ...prev, guests: [...prev.guests, newGuest] }));
  };

  const updateGuest = (index: number, updates: Partial<GuestData>) => {
    setFormData(prev => ({
      ...prev,
      guests: prev.guests.map((guest, idx) => idx === index ? { ...guest, ...updates } : guest),
    }));
  };

  const removeGuest = (index: number) => {
    setFormData(prev => ({ ...prev, guests: prev.guests.filter((_, idx) => idx !== index) }));
  };

  const addServiceFromTemplate = (template: typeof SERVICE_TEMPLATES[number]) => {
    const newInclusion: InclusionData = {
      id: `incl-${Date.now()}`,
      inclusion_type: template.inclusion_type,
      description: template.description,
      pricing_type: template.pricing_type,
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    };
    setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, newInclusion] }));
  };

  const updateInclusion = (index: number, updates: Partial<InclusionData>) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.map((incl, idx) => {
        if (idx !== index) return incl;
        const updated = { ...incl, ...updates };
        if (updated.pricing_type === 'per_person') {
          updated.total_price = updated.unit_price * prev.party_size;
        } else if (updated.pricing_type === 'per_day') {
          updated.total_price = updated.unit_price * updated.quantity;
        } else {
          updated.total_price = updated.unit_price;
        }
        return updated;
      }),
    }));
  };

  const removeInclusion = (index: number) => {
    setFormData(prev => ({ ...prev, inclusions: prev.inclusions.filter((_, idx) => idx !== index) }));
  };

  // ── Pricing ───────────────────────────────────────────────────────────
  const totals = calculateTotals(formData);

  // ── Save / Submit ─────────────────────────────────────────────────────
  const saveDraft = async () => {
    setSaving(true);
    try {
      const draftData: Record<string, unknown> = {};
      if (formData.customer_name) draftData.customer_name = formData.customer_name;
      if (formData.customer_email) draftData.customer_email = formData.customer_email;
      if (formData.customer_phone) draftData.customer_phone = formData.customer_phone;
      if (formData.customer_company) draftData.customer_company = formData.customer_company;
      if (formData.trip_type) draftData.trip_type = formData.trip_type;
      if (formData.party_size) draftData.party_size = formData.party_size;
      if (formData.start_date) draftData.start_date = formData.start_date;
      if (formData.end_date) draftData.end_date = formData.end_date;
      if (formData.brand_id) draftData.brand_id = formData.brand_id;
      if (formData.introduction) draftData.introduction = formData.introduction;
      if (formData.internal_notes) draftData.internal_notes = formData.internal_notes;

      const response = await fetch('/api/admin/trip-proposals?draft=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save draft');
      }

      const data = await response.json();
      toast('Draft saved successfully', 'success');
      router.push(`/admin/trip-proposals/${data.data.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name) {
      toast('Please enter a customer name', 'error');
      return;
    }
    if (formData.days.length === 0) {
      toast('Please add at least one day', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/trip-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: formData.brand_id,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email || null,
          customer_phone: formData.customer_phone || null,
          customer_company: formData.customer_company || null,
          trip_type: formData.trip_type,
          party_size: formData.party_size,
          start_date: formData.start_date,
          end_date: formData.end_date !== formData.start_date ? formData.end_date : null,
          introduction: formData.introduction || null,
          internal_notes: formData.internal_notes || null,
          valid_until: formData.valid_until || null,
          deposit_percentage: formData.deposit_percentage,
          gratuity_percentage: formData.gratuity_percentage,
          tax_rate: formData.tax_rate,
          discount_amount: formData.discount_amount,
          discount_reason: formData.discount_reason || null,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to create trip proposal');

      const proposalId = result.data.id;

      for (const day of formData.days) {
        const dayResponse = await fetch(`/api/admin/trip-proposals/${proposalId}/days`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: day.date, title: day.title || null, notes: day.notes || null }),
        });
        const dayResult = await dayResponse.json();
        if (!dayResult.success) throw new Error(`Failed to add day ${day.day_number}`);
        const dayId = dayResult.data.id;

        for (const stop of day.stops) {
          await fetch(`/api/admin/trip-proposals/${proposalId}/days/${dayId}/stops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stop_type: stop.stop_type,
              winery_id: stop.winery_id || null,
              restaurant_id: stop.restaurant_id || null,
              hotel_id: stop.hotel_id || null,
              custom_name: stop.custom_name || null,
              custom_address: stop.custom_address || null,
              scheduled_time: stop.scheduled_time || null,
              duration_minutes: stop.duration_minutes || null,
              per_person_cost: 0,
              flat_cost: 0,
              cost_note: stop.cost_note || null,
              reservation_status: stop.reservation_status,
              client_notes: stop.client_notes || null,
              internal_notes: stop.internal_notes || null,
              driver_notes: stop.driver_notes || null,
            }),
          });
        }
      }

      for (const guest of formData.guests) {
        await fetch(`/api/admin/trip-proposals/${proposalId}/guests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: guest.name,
            email: guest.email || null,
            phone: guest.phone || null,
            dietary_restrictions: guest.dietary_restrictions || null,
            room_assignment: guest.room_assignment || null,
            is_primary: guest.is_primary,
          }),
        });
      }

      for (const inclusion of formData.inclusions) {
        await fetch(`/api/admin/trip-proposals/${proposalId}/inclusions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inclusion_type: inclusion.inclusion_type,
            description: inclusion.description,
            pricing_type: inclusion.pricing_type,
            quantity: inclusion.quantity,
            unit_price: inclusion.unit_price,
          }),
        });
      }

      await fetch(`/api/admin/trip-proposals/${proposalId}/pricing`, { method: 'POST' });

      toast(`Trip proposal created! Proposal #${result.data.proposal_number}`, 'success');
      router.push('/admin/trip-proposals');
    } catch (error) {
      logger.error('Failed to create trip proposal', { error });
      toast(error instanceof Error ? error.message : 'Failed to create trip proposal', 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    // State
    formData,
    setFormData,
    brands,
    wineries,
    restaurants,
    hotels,
    saving,
    activeTab,
    setActiveTab,
    importOpen,
    setImportOpen,
    importResult,
    setImportResult,
    totals,
    toasts,
    toast,
    dismissToast,

    // Actions
    addStop,
    updateStop,
    removeStop,
    addGuest,
    updateGuest,
    removeGuest,
    addServiceFromTemplate,
    updateInclusion,
    removeInclusion,
    applyImportResult,
    saveDraft,
    handleSubmit,
  };
}
