'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBookingTracking } from '@/lib/hooks/useBookingTracking';
import { logger } from '@/lib/logger';
import { generateSecureString } from '@/lib/utils';
import PhoneInput from '@/components/ui/PhoneInput';

/**
 * Book a Tour - Entry Point
 *
 * This is the main booking flow for customers.
 * Can be embedded in Webflow via iframe or loaded directly.
 *
 * Supports multiple tour providers (NW Touring, Herding Cats, etc.)
 */

interface Provider {
  id: string;
  name: string;
  tagline: string;
  color: string;
  minHours: number;
  baseRate: number;
  maxGuests: number;
}

interface TourDay {
  id: string;
  date: string;
  guests: number | 'large';
  largeGroupSize: string;
  hours: number;
}

interface ServiceItem {
  id: string;
  serviceType: string;
  details: string;
}

const PROVIDERS: Provider[] = [
  {
    id: 'nw-touring',
    name: 'NW Touring & Concierge',
    tagline: 'Premium wine country transportation',
    color: '#B87333',
    minHours: 5,
    baseRate: 125,
    maxGuests: 14,
  },
  {
    id: 'herding-cats',
    name: 'Herding Cats Wine Tours',
    tagline: 'Unforgettable wine adventures',
    color: '#6B4E71',
    minHours: 4,
    baseRate: 110,
    maxGuests: 10,
  },
];

const createNewDay = (): TourDay => ({
  id: generateSecureString(7),
  date: '',
  guests: 2,
  largeGroupSize: '',
  hours: 5,
});

const createNewService = (): ServiceItem => ({
  id: generateSecureString(7),
  serviceType: '',
  details: '',
});

const SERVICE_OPTIONS = [
  { value: 'airport_pickup', label: 'Airport Pickup' },
  { value: 'airport_dropoff', label: 'Airport Dropoff' },
  { value: 'dinner_transport', label: 'Dinner Transportation' },
  { value: 'event_transport', label: 'Event Transportation' },
  { value: 'hotel_transfer', label: 'Hotel Transfer' },
  { value: 'other', label: 'Other' },
];

// Package configurations for tour packages from /nw-touring
const TOUR_PACKAGES: Record<string, { name: string; hours: number; description: string }> = {
  'wine-dine': {
    name: 'Wine & Dine',
    hours: 5,
    description: '2 wineries + lunch (~5 hours)',
  },
  'walla-walla-experience': {
    name: 'The Walla Walla Experience',
    hours: 6,
    description: '3 wineries (6 hours, our most popular tour)',
  },
  'wwcc-wine-dine': {
    name: 'WWCC Wine & Dine',
    hours: 5,
    description: 'WWCC Country Club Package: 2 wineries + lunch at the club',
  },
  'wwcc-experience': {
    name: 'WWCC Walla Walla Experience',
    hours: 6,
    description: 'WWCC Country Club Package: 3 wineries + dinner at the club',
  },
  'wwcc-custom': {
    name: 'WWCC Custom Experience',
    hours: 6,
    description: 'WWCC Country Club Package: Custom wine & dine experience with club dining',
  },
};

function BookTourPageContent() {
  const searchParams = useSearchParams();
  const prefilledWinery = searchParams.get('winery');
  const prefilledPackage = searchParams.get('package');
  const packageInfo = prefilledPackage ? TOUR_PACKAGES[prefilledPackage] : null;

  // Trip planner handoff params
  const tripId = searchParams.get('tripId');
  const prefilledName = searchParams.get('name');
  const prefilledEmail = searchParams.get('email');
  const prefilledPhone = searchParams.get('phone');
  const prefilledPartySize = searchParams.get('partySize');
  const prefilledDate = searchParams.get('date');
  const prefilledEventType = searchParams.get('eventType');
  const prefilledNotes = searchParams.get('notes');
  const prefilledDescription = searchParams.get('description');

  // Map trip types to tour types
  const tripTypeToTourType: Record<string, string> = {
    wine_tour: 'wine_tour',
    celebration: 'celebration',
    corporate: 'corporate',
    wedding: 'wedding',
    anniversary: 'anniversary',
    custom: 'other',
  };

  const [step, setStep] = useState(packageInfo || tripId ? 2 : 1); // Skip provider selection if package or trip selected
  const [selectedProvider, setSelectedProvider] = useState<string | null>(packageInfo || tripId ? 'nw-touring' : null);
  const [isMultipleServices, setIsMultipleServices] = useState(false);
  const [tourDays, setTourDays] = useState<TourDay[]>([{
    ...createNewDay(),
    hours: packageInfo?.hours || 5,
    date: prefilledDate || '',
    guests: prefilledPartySize ? parseInt(prefilledPartySize, 10) : 2,
  }]);
  const [additionalServices, setAdditionalServices] = useState<ServiceItem[]>([createNewService()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [confirmationData, setConfirmationData] = useState<{
    reservationNumber: string;
    providerName: string;
    customerName: string;
    email: string;
    tourDays: TourDay[];
    estimatedTotal: string;
  } | null>(null);

  // Build initial notes based on available prefill data
  const buildInitialNotes = () => {
    const parts: string[] = [];

    if (tripId) {
      parts.push(`[From Trip Planner: ${tripId}]`);
    }
    if (prefilledDescription) {
      parts.push(prefilledDescription);
    }
    if (prefilledNotes) {
      parts.push(prefilledNotes);
    }
    if (prefilledWinery) {
      parts.push(`I'd like to include ${prefilledWinery} in my tour.`);
    }
    if (packageInfo) {
      parts.push(`I'm interested in the ${packageInfo.name} package (${packageInfo.description}).`);
    }

    const source = searchParams.get('source');
    if (source === 'wwcc') {
      parts.push('[WWCC Country Club Partner Referral]');
      parts.push('Club dining featured with package.');
    }

    return parts.join('\n\n');
  };

  const [formData, setFormData] = useState({
    tourType: prefilledEventType ? (tripTypeToTourType[prefilledEventType] || 'wine_tour') : 'wine_tour',
    name: prefilledName || '',
    email: prefilledEmail || '',
    phone: prefilledPhone || '',
    notes: buildInitialNotes(),
    textConsent: true, // Pre-filled checkbox for text communications
  });

  // Booking tracking
  const { trackBookingProgress, trackBookingStarted, trackPageView } = useBookingTracking();

  // Track page view on mount
  useEffect(() => {
    trackPageView('/book', 'Book a Tour');
  }, [trackPageView]);

  // Track step changes and form progress
  useEffect(() => {
    const stepNames = ['provider_selection', 'tour_details', 'contact_info'];
    const stepName = stepNames[step - 1] || 'unknown';

    trackBookingProgress({
      stepReached: stepName,
      email: formData.email || undefined,
      name: formData.name || undefined,
      phone: formData.phone || undefined,
      tourDate: tourDays[0]?.date || undefined,
      partySize: typeof tourDays[0]?.guests === 'number' ? tourDays[0].guests : undefined,
      durationHours: tourDays[0]?.hours || undefined,
      formData: {
        tourType: formData.tourType,
        provider: selectedProvider,
        tourDaysCount: tourDays.length,
      },
    });
  }, [step, formData.email, formData.name, formData.phone, tourDays, selectedProvider, trackBookingProgress, formData.tourType]);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setStep(2);
    // Track that user started booking flow
    trackBookingStarted();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDayChange = (dayId: string, field: keyof TourDay, value: string | number | 'large') => {
    setTourDays(prev => prev.map(day =>
      day.id === dayId ? { ...day, [field]: value } : day
    ));
  };

  const addDay = () => {
    setTourDays(prev => [...prev, createNewDay()]);
  };

  const removeDay = (dayId: string) => {
    if (tourDays.length > 1) {
      setTourDays(prev => prev.filter(day => day.id !== dayId));
    }
  };

  const handleServiceChange = (serviceId: string, field: keyof ServiceItem, value: string) => {
    setAdditionalServices(prev => prev.map(svc =>
      svc.id === serviceId ? { ...svc, [field]: value } : svc
    ));
  };

  const addService = () => {
    setAdditionalServices(prev => [...prev, createNewService()]);
  };

  const removeService = (serviceId: string) => {
    if (additionalServices.length > 1) {
      setAdditionalServices(prev => prev.filter(svc => svc.id !== serviceId));
    }
  };

  // Handle checkbox changes - reset to single item when unchecked
  const handleMultipleServicesChange = (checked: boolean) => {
    setIsMultipleServices(checked);
    if (!checked && additionalServices.length > 1) {
      setAdditionalServices([additionalServices[0]]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProviderData || !formData.name || !formData.email) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    const bookingData = {
      provider: selectedProviderData.name,
      providerId: selectedProviderData.id,
      tourType: formData.tourType,
      tourDays: tourDays.map(day => ({
        date: day.date,
        guests: day.guests === 'large' ? `Large Group (~${day.largeGroupSize})` : day.guests,
        hours: day.hours,
      })),
      additionalServices: isMultipleServices
        ? additionalServices.filter(s => s.serviceType).map(s => ({
            type: SERVICE_OPTIONS.find(o => o.value === s.serviceType)?.label || s.serviceType,
            details: s.details,
          }))
        : [],
      contact: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        textConsent: formData.textConsent,
      },
      notes: formData.notes,
      estimatedTotal: tourDays.some(d => d.guests === 'large')
        ? 'Quote pending'
        : `$${calculateTotalPrice()}`,
    };

    try {
      const response = await fetch('/api/booking-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit booking request');
      }

      logger.info('Booking Request Created', { result });

      // Track successful submission
      trackBookingProgress({
        stepReached: 'completed',
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        tourDate: tourDays[0]?.date || undefined,
        partySize: typeof tourDays[0]?.guests === 'number' ? tourDays[0].guests : undefined,
        durationHours: tourDays[0]?.hours || undefined,
      });

      setConfirmationData({
        reservationNumber: result.reservationNumber,
        providerName: selectedProviderData.name,
        customerName: formData.name,
        email: formData.email,
        tourDays: tourDays,
        estimatedTotal: tourDays.some(d => d.guests === 'large')
          ? 'Quote pending'
          : `$${calculateTotalPrice()}`,
      });
      setSubmitStatus('success');
    } catch (error) {
      logger.error('Booking error', { error });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProviderData = PROVIDERS.find(p => p.id === selectedProvider);

  // Calculate total estimated price across all days
  const calculateTotalPrice = () => {
    if (!selectedProviderData) return 0;
    return tourDays.reduce((total, day) => {
      return total + (selectedProviderData.baseRate * day.hours);
    }, 0);
  };

  // Check if all required fields are filled
  const allDaysComplete = tourDays.every(day => day.date && (day.guests !== 'large' || day.largeGroupSize));

  // Format date as MM/DD/YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  // Show full-page confirmation after successful submission
  if (submitStatus === 'success' && confirmationData) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Simple Header */}
        <header className="bg-white border-b border-slate-200 py-4">
          <div className="max-w-3xl mx-auto px-4 flex items-center justify-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#E07A5F] rounded flex items-center justify-center">
                <span className="text-white text-sm font-bold">W</span>
              </div>
              <span className="font-medium text-slate-900">Walla Walla Travel</span>
            </Link>
          </div>
        </header>

        {/* Confirmation Content */}
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-10 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Request Submitted!</h1>
              <p className="text-emerald-100">We&apos;ll be in touch within 24 hours</p>
            </div>

            {/* Confirmation Details */}
            <div className="px-8 py-8 space-y-6">
              {/* Reference Number */}
              <div className="text-center pb-6 border-b border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Reference Number</p>
                <p className="text-2xl font-bold text-slate-900 tracking-wide">{confirmationData.reservationNumber}</p>
              </div>

              {/* Booking Summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Provider</span>
                  <span className="font-semibold text-slate-900">{confirmationData.providerName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Name</span>
                  <span className="font-semibold text-slate-900">{confirmationData.customerName}</span>
                </div>

                {confirmationData.tourDays.map((day, index) => (
                  <div key={day.id} className={confirmationData.tourDays.length > 1 ? 'pt-3 border-t border-slate-100' : ''}>
                    {confirmationData.tourDays.length > 1 && (
                      <p className="text-xs font-semibold text-slate-400 mb-2">DAY {index + 1}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Date</span>
                      <span className="font-semibold text-slate-900">{formatDate(day.date)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-slate-600">Duration</span>
                      <span className="font-semibold text-slate-900">{day.hours} hours</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-slate-600">Guests</span>
                      <span className="font-semibold text-slate-900">
                        {day.guests === 'large' ? `Large Group (~${day.largeGroupSize})` : day.guests}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="font-medium text-slate-700">Estimated Total</span>
                  <span className="text-xl font-bold text-slate-900">{confirmationData.estimatedTotal}</span>
                </div>
              </div>

              {/* What's Next */}
              <div className="bg-emerald-50 rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-emerald-800 mb-3">What&apos;s Next?</h3>
                <ul className="space-y-2 text-sm text-emerald-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">1.</span>
                    <span>We&apos;ll review your request and check availability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">2.</span>
                    <span>You&apos;ll receive a follow-up email or call within 24 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">3.</span>
                    <span>Once confirmed, we&apos;ll send deposit payment instructions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">4.</span>
                    <span>Your date will be officially held once deposit is received</span>
                  </li>
                </ul>
              </div>

              {/* Email Confirmation Note */}
              <div className="text-center text-sm text-slate-500 pt-4 border-t border-slate-100">
                <p>A confirmation email has been sent to</p>
                <p className="font-medium text-slate-700">{confirmationData.email}</p>
              </div>

              {/* Contact Info */}
              <div className="text-center pt-4">
                <p className="text-sm text-slate-500 mb-2">Questions? We&apos;re here to help!</p>
                <p className="text-sm">
                  <a href="mailto:info@nwtouring.com" className="text-emerald-600 hover:text-emerald-700 font-medium">info@nwtouring.com</a>
                  <span className="text-slate-300 mx-2">|</span>
                  <a href="tel:+15095403600" className="text-emerald-600 hover:text-emerald-700 font-medium">(509) 540-3600</a>
                </p>
              </div>

              {/* Book Another Tour Button */}
              <div className="text-center pt-4">
                <button
                  onClick={() => {
                    setSubmitStatus('idle');
                    setConfirmationData(null);
                    setStep(1);
                    setSelectedProvider(null);
                    setTourDays([createNewDay()]);
                    setFormData({
                      tourType: 'wine_tour',
                      name: '',
                      email: '',
                      phone: '',
                      notes: '',
                      textConsent: true,
                    });
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Book another tour
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E07A5F] rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <span className="font-medium text-slate-900">Book a Tour</span>
          </Link>
          <div className="text-sm text-slate-500">
            Step {step} of 3
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 py-3">
                <div className={`h-1 rounded-full ${s <= step ? 'bg-[#E07A5F]' : 'bg-slate-200'}`} />
                <div className={`text-xs mt-1 ${s <= step ? 'text-[#E07A5F]' : 'text-slate-400'}`}>
                  {s === 1 && 'Choose Provider'}
                  {s === 2 && 'Tour Details'}
                  {s === 3 && 'Your Info'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Step 1: Choose Provider */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Choose Your Experience
              </h1>
              <p className="text-slate-600">
                Select a tour provider to get started
              </p>
            </div>

            <div className="grid gap-4">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider.id)}
                  className="bg-white rounded-xl border-2 border-slate-200 p-6 text-left hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700">
                        {provider.name}
                      </h3>
                      <p className="text-slate-500 text-sm mb-2">{provider.tagline}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          From ${provider.baseRate}/hr
                        </span>
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          Up to {provider.maxGuests} guests
                        </span>
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          {provider.minHours}hr minimum
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Tour Details */}
        {step === 2 && selectedProviderData && (
          <div>
            <button 
              onClick={() => setStep(1)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Change provider
            </button>

            <div className="text-center mb-8">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold mx-auto mb-3"
                style={{ backgroundColor: selectedProviderData.color }}
              >
                {selectedProviderData.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">
                {selectedProviderData.name}
              </h1>
              <p className="text-slate-600">
                Tell us about your tour
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              {/* Tour Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What type of experience?
                </label>
                <select
                  name="tourType"
                  value={formData.tourType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': selectedProviderData.color } as React.CSSProperties}
                >
                  <option value="wine_tour">Wine Tour</option>
                  <option value="custom_charter">Custom Charter</option>
                  <option value="airport_transfer">Airport Transfer</option>
                  <option value="dinner_service">Dinner Service</option>
                </select>
              </div>

              {/* Tour Days */}
              {tourDays.map((day, index) => (
                <div key={day.id} className="space-y-4">
                  {/* Day Header (show when more than one day) */}
                  {tourDays.length > 1 && (
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Day {index + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeDay(day.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      When?
                    </label>
                    <input
                      type="date"
                      value={day.date}
                      onChange={(e) => handleDayChange(day.id, 'date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F] text-base"
                    />
                  </div>

                  {/* Guests & Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        How many guests?
                      </label>
                      <select
                        value={day.guests}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleDayChange(day.id, 'guests', val === 'large' ? 'large' : parseInt(val, 10));
                        }}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                      >
                        {Array.from({ length: selectedProviderData.maxGuests }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                        ))}
                        <option value="large">Large Group</option>
                      </select>

                      {/* Large Group Size Input */}
                      {day.guests === 'large' && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={day.largeGroupSize}
                            onChange={(e) => handleDayChange(day.id, 'largeGroupSize', e.target.value)}
                            placeholder="Approximately how many will be in your group?"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 text-sm"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            We&apos;ll contact you to discuss vehicle options for your group size.
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        How long?
                      </label>
                      <select
                        value={day.hours}
                        onChange={(e) => handleDayChange(day.id, 'hours', parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                      >
                        {Array.from({ length: 9 }, (_, i) => i + selectedProviderData.minHours).map(n => (
                          <option key={n} value={n}>
                            {n} hours{n === 6 ? ' (Typical - 3 Wineries)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Separator between days */}
                  {tourDays.length > 1 && index < tourDays.length - 1 && (
                    <hr className="border-slate-200 my-4" />
                  )}
                </div>
              ))}

              {/* Add Day Section */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">+ Add Additional Day(s)</h3>
                <button
                  type="button"
                  onClick={addDay}
                  className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Another Day
                </button>
              </div>

              {/* Additional Services Checkbox */}
              <div className="py-3 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMultipleServices}
                    onChange={(e) => handleMultipleServicesChange(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#E07A5F] focus:ring-[#E07A5F]"
                  />
                  <span className="text-sm font-medium text-slate-700">Additional Services</span>
                </label>
              </div>

              {/* Additional Services Section */}
              {isMultipleServices && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">Additional Services</h3>

                  {additionalServices.map((service, index) => (
                    <div key={service.id} className="space-y-3 p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Service {index + 1}</span>
                        {additionalServices.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeService(service.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <select
                        value={service.serviceType}
                        onChange={(e) => handleServiceChange(service.id, 'serviceType', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 bg-white"
                      >
                        <option value="">Select a service...</option>
                        {SERVICE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={service.details}
                        onChange={(e) => handleServiceChange(service.id, 'details', e.target.value)}
                        placeholder="Details (time, location, etc.)"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 text-sm bg-white"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addService}
                    className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Another Service
                  </button>
                </div>
              )}

              {/* Estimated Price */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">
                    Estimated Total {tourDays.length > 1 && `(${tourDays.length} days)`}
                  </span>
                  <span className="text-2xl font-semibold text-slate-900">
                    ${calculateTotalPrice()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {tourDays.some(d => d.guests === 'large')
                    ? 'Large group pricing will be quoted separately'
                    : 'Final pricing may vary based on specific requirements'}
                </p>
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!allDaysComplete}
                className="w-full py-3 rounded-lg text-white font-semibold transition-colors disabled:bg-slate-300"
                style={{ backgroundColor: allDaysComplete ? selectedProviderData.color : undefined }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && selectedProviderData && (
          <div>
            <button 
              onClick={() => setStep(2)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to tour details
            </button>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Almost There!
              </h1>
              <p className="text-slate-600">
                Enter your contact information
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <PhoneInput
                  name="phone"
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="(509) 555-0123"
                />

                {/* Text Consent Checkbox */}
                <label className="flex items-start gap-3 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.textConsent}
                    onChange={(e) => setFormData(prev => ({ ...prev, textConsent: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#E07A5F] focus:ring-[#E07A5F]"
                  />
                  <span className="text-sm text-slate-600">
                    I agree to receive text message updates about my booking. Message and data rates may apply. You can opt out at any time.
                  </span>
                </label>
              </div>

              {/* Prefilled Winery Indicator */}
              {prefilledWinery && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🍷</span>
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        Starting point: {prefilledWinery}
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        We&apos;ll build your tour around this winery and add complementary stops nearby.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prefilled Package Indicator */}
              {packageInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Selected package: {packageInfo.name}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {packageInfo.description}. We&apos;ll customize it to your preferences.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Special Requests or Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F] resize-none"
                  placeholder="Any wineries you'd like to visit, dietary restrictions, celebrations..."
                />
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-slate-900">Booking Summary</h3>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Provider</span>
                    <span className="font-medium text-slate-900">{selectedProviderData.name}</span>
                  </div>

                  {/* Tour Days Summary */}
                  {tourDays.map((day, index) => (
                    <div key={day.id} className={tourDays.length > 1 ? 'pt-2 border-t border-slate-200' : ''}>
                      {tourDays.length > 1 && (
                        <div className="text-xs font-semibold text-slate-500 mb-1">Day {index + 1}</div>
                      )}
                      <div className="flex justify-between">
                        <span>Date</span>
                        <span className="font-medium text-slate-900">{formatDate(day.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration</span>
                        <span className="font-medium text-slate-900">{day.hours} hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Guests</span>
                        <span className="font-medium text-slate-900">
                          {day.guests === 'large' ? `Large Group (~${day.largeGroupSize})` : day.guests}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-medium">Estimated Total</span>
                    <span className="font-semibold text-slate-900">
                      {tourDays.some(d => d.guests === 'large') ? 'Quote pending' : `$${calculateTotalPrice()}`}
                    </span>
                  </div>
                </div>
              </div>

              {submitStatus === 'error' && (
                <div className="text-sm text-red-600 mb-4 text-center">
                  Something went wrong. Please try again.
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formData.name || !formData.email || isSubmitting}
                className="w-full py-3 rounded-lg text-white font-semibold transition-colors disabled:bg-slate-300 bg-[#E07A5F] hover:bg-[#d06a4f]"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Request Booking'
                )}
              </button>

              <p className="text-xs text-slate-500 text-center">
                By submitting, you agree to our terms of service.
                We&apos;ll confirm availability and send you a quote.
              </p>
              <p className="text-xs text-slate-400 text-center mt-3">
                Questions? <a href="mailto:info@nwtouring.com" className="underline hover:text-slate-600">info@nwtouring.com</a>
                {' '}&bull;{' '}
                <a href="tel:+15095403600" className="underline hover:text-slate-600">(509) 540-3600</a>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Loading fallback for Suspense
function BookingLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#E07A5F] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600">Loading booking form...</p>
      </div>
    </div>
  );
}

// Default export wrapped in Suspense for useSearchParams
export default function BookTourPage() {
  return (
    <Suspense fallback={<BookingLoadingFallback />}>
      <BookTourPageContent />
    </Suspense>
  );
}
