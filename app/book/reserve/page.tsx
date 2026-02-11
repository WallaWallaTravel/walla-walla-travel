"use client";

/**
 * Reserve & Refine Booking Flow
 * Customer puts down deposit to hold date/vehicle
 * Then Ryan calls to customize details
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useBookingTracking } from '@/lib/hooks/useBookingTracking';
import { logger } from '@/lib/logger';

const FORM_STORAGE_KEY = 'ww_reserve_form_data';
const STEP_STORAGE_KEY = 'ww_reserve_form_step';

export default function ReserveRefinePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    
    // Step 2: Event Details
    partySize: 4,
    preferredDate: null as Date | null,
    alternateDate: null as Date | null,
    eventType: 'wine_tour',
    specialRequests: '',
    brandId: 1, // Default to Walla Walla Travel
    
    // Step 3: Payment
    paymentMethod: 'check' as 'check' | 'card',
    depositAmount: 250
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [depositCalculated, setDepositCalculated] = useState(250);
  const [isLoaded, setIsLoaded] = useState(false);

  // Booking tracking
  const { trackBookingProgress, trackBookingStarted, trackPageView } = useBookingTracking();

  // Track page view on mount
  useEffect(() => {
    trackPageView('/book/reserve', 'Reserve & Customize Your Tour');
    trackBookingStarted(); // User is starting the booking flow
  }, [trackPageView, trackBookingStarted]);

  // Track step changes and form progress
  useEffect(() => {
    if (!isLoaded) return;

    const stepNames = ['contact_info', 'tour_details', 'payment'];
    const stepName = stepNames[step - 1] || 'unknown';

    trackBookingProgress({
      stepReached: stepName,
      email: formData.contactEmail || undefined,
      name: formData.contactName || undefined,
      phone: formData.contactPhone || undefined,
      tourDate: formData.preferredDate?.toISOString().split('T')[0] || undefined,
      partySize: formData.partySize || undefined,
      brandId: formData.brandId || undefined,
      formData: {
        eventType: formData.eventType,
        depositAmount: depositCalculated,
        paymentMethod: formData.paymentMethod,
      },
    });
  }, [step, formData.contactEmail, formData.contactName, formData.contactPhone, formData.preferredDate, formData.partySize, formData.brandId, formData.eventType, depositCalculated, formData.paymentMethod, isLoaded, trackBookingProgress]);

  // Load saved form data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem(FORM_STORAGE_KEY);
      const savedStep = sessionStorage.getItem(STEP_STORAGE_KEY);
      
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          // Convert date strings back to Date objects
          if (parsed.preferredDate) {
            parsed.preferredDate = new Date(parsed.preferredDate);
          }
          if (parsed.alternateDate) {
            parsed.alternateDate = new Date(parsed.alternateDate);
          }
          setFormData(parsed);
        } catch (e) {
          logger.error('Failed to load saved form data', { error: e });
        }
      }
      
      if (savedStep) {
        setStep(parseInt(savedStep) as 1 | 2 | 3);
      }
      
      setIsLoaded(true);
    }
  }, []);

  // Save form data whenever it changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, isLoaded]);

  // Save step whenever it changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      sessionStorage.setItem(STEP_STORAGE_KEY, step.toString());
    }
  }, [step, isLoaded]);

  // Calculate deposit based on party size
  const calculateDeposit = (partySize: number): number => {
    if (partySize <= 7) return 250;
    if (partySize <= 14) return 350;
    // For larger groups, calculate per vehicle
    const vehicles = Math.ceil(partySize / 14);
    return 350 * vehicles;
  };

  // Get pricing estimate based on party size
  const getPricingEstimate = (partySize: number) => {
    // Use rate-config.ts logic
    const typicalHours = partySize <= 3 ? 5.5 : 6; // Smaller groups often 5.5-6hr, larger ~6hr
    
    // Get weekday and weekend hourly rates
    let weekdayRate = 0;
    let weekendRate = 0;
    
    if (partySize <= 2) {
      weekdayRate = 85;
      weekendRate = 95;
    } else if (partySize <= 4) {
      weekdayRate = 95;
      weekendRate = 105;
    } else if (partySize <= 6) {
      weekdayRate = 105;
      weekendRate = 115;
    } else if (partySize <= 8) {
      weekdayRate = 115;
      weekendRate = 125;
    } else if (partySize <= 11) {
      weekdayRate = 130;
      weekendRate = 140;
    } else {
      weekdayRate = 140;
      weekendRate = 150;
    }
    
    // Calculate estimates (4 hour minimum) - BEFORE TAX
    const minHours = 4;
    const weekdayMin = weekdayRate * minHours;
    const weekendMin = weekendRate * minHours;
    
    const weekdayTypical = weekdayRate * typicalHours;
    const weekendTypical = weekendRate * typicalHours;
    
    return {
      typicalHours,
      minHours,
      weekdayRange: `$${Math.round(weekdayMin)} - $${Math.round(weekdayTypical)}`,
      weekendRange: `$${Math.round(weekendMin)} - $${Math.round(weekendTypical)}`,
      perPersonWeekday: Math.round(weekdayTypical / partySize),
      perPersonWeekend: Math.round(weekendTypical / partySize),
    };
  };

  const handlePartySizeChange = (size: number) => {
    const deposit = calculateDeposit(size);
    setFormData({ ...formData, partySize: size });
    setDepositCalculated(deposit);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.contactName || !formData.contactEmail) {
        alert('Please fill in your name and email');
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.preferredDate || formData.partySize < 1) {
        alert('Please select a preferred date and party size');
        return;
      }
    }
    
    setStep((step + 1) as 1 | 2 | 3);
  };

  const handleBack = () => {
    setStep((step - 1) as 1 | 2 | 3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Format dates for API
      const formattedData = {
        ...formData,
        preferredDate: formData.preferredDate?.toISOString().split('T')[0],
        alternateDate: formData.alternateDate?.toISOString().split('T')[0] || undefined,
        depositAmount: depositCalculated
      };

      const response = await fetch('/api/booking/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit reservation');
      }

      const data = await response.json();

      // Track successful reservation submission
      trackBookingProgress({
        stepReached: formData.paymentMethod === 'card' ? 'payment_pending' : 'completed',
        email: formData.contactEmail,
        name: formData.contactName,
        phone: formData.contactPhone,
        tourDate: formData.preferredDate?.toISOString().split('T')[0],
        partySize: formData.partySize,
        brandId: formData.brandId,
      });

      // Clear saved form data on successful submission
      sessionStorage.removeItem(FORM_STORAGE_KEY);
      sessionStorage.removeItem(STEP_STORAGE_KEY);

      // Redirect based on payment method
      if (formData.paymentMethod === 'card') {
        // Redirect to Stripe payment page
        router.push(`/book/reserve/payment?id=${data.reservationId}`);
      } else {
        // Redirect to confirmation page (check payment instructions)
        router.push(`/book/reserve/confirmation?id=${data.reservationId}`);
      }
      
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/book')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to booking options
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reserve & Customize Your Tour
          </h1>
          <p className="text-gray-600">
            Put down a ${depositCalculated} deposit to hold your date. Ryan will call within 24 hours to customize your perfect wine country experience.
          </p>
          
          {/* Start Fresh Button - Only show if they have saved data */}
          {isLoaded && (formData.contactName || formData.contactEmail || formData.partySize !== 4) && (
            <button
              onClick={() => {
                if (confirm('Clear all form data and start fresh?')) {
                  sessionStorage.removeItem(FORM_STORAGE_KEY);
                  sessionStorage.removeItem(STEP_STORAGE_KEY);
                  window.location.reload();
                }
              }}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Start Fresh
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Your Info' },
              { num: 2, label: 'Tour Details' },
              { num: 3, label: 'Deposit' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s.num}
                  </div>
                  <span className={`text-xs mt-2 ${
                    step >= s.num ? 'text-blue-600 font-semibold' : 'text-gray-500'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`h-1 flex-1 mx-2 ${
                    step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          {/* Step 1: Contact Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Contact Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We&apos;ll send your reservation confirmation here
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ryan will call you within 24 hours to customize your tour
                </p>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition"
              >
                Continue to Tour Details →
              </button>
            </div>
          )}

          {/* Step 2: Tour Details */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Tour Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Guests *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="50"
                  value={formData.partySize}
                  onChange={(e) => handlePartySizeChange(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deposit required: <strong>${depositCalculated}</strong>
                  {formData.partySize > 14 && ' (multiple vehicles)'}
                </p>
              </div>

              {/* Brand Selection */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Service Provider (Optional)
                </label>
                <select
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={1}>Walla Walla Travel (Recommended)</option>
                  <option value={2}>Herding Cats Wine Tours (Sophisticated small groups)</option>
                  <option value={3}>NW Touring & Concierge (Corporate & professional)</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  All providers offer the same quality service. During your consultation call, Ryan can help match you with the best fit for your group&apos;s style.
                </p>
              </div>

              {/* Pricing Estimate */}
              {formData.partySize >= 1 && (() => {
                const estimate = getPricingEstimate(formData.partySize);
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <span>💰</span>
                      <span>Estimated Tour Cost</span>
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-blue-800">
                        Typical {estimate.typicalHours}-hour wine tour for <strong>{formData.partySize} guest{formData.partySize > 1 ? 's' : ''}</strong>:
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-blue-900">
                        <div className="bg-white rounded px-3 py-2">
                          <div className="text-xs text-blue-600 font-medium mb-1">Sun-Wed</div>
                          <div className="font-bold">{estimate.weekdayRange}</div>
                          <div className="text-xs text-blue-600 mt-1">~${estimate.perPersonWeekday}/person</div>
                        </div>
                        <div className="bg-white rounded px-3 py-2">
                          <div className="text-xs text-blue-600 font-medium mb-1">Thu-Sat</div>
                          <div className="font-bold">{estimate.weekendRange}</div>
                          <div className="text-xs text-blue-600 mt-1">~${estimate.perPersonWeekend}/person</div>
                        </div>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        <strong>Includes:</strong> Transportation & professional driver<br />
                        <strong>Not included:</strong> Winery tasting fees (typically $20-30/person) & lunch (typically $11-18/person)
                      </p>
                      <p className="text-xs text-blue-600 italic mt-1">
                        ℹ️ Prices shown before tax (8.9% WA sales tax applies). Final cost based on actual tour time & services.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date *
                </label>
                <DatePicker
                  selected={formData.preferredDate}
                  onChange={(date) => setFormData({ ...formData, preferredDate: date })}
                  minDate={new Date()}
                  dateFormat="MMMM d, yyyy"
                  placeholderText="Select your preferred date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  calendarClassName="modern-calendar"
                  showPopperArrow={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternate Date (Optional)
                </label>
                <DatePicker
                  selected={formData.alternateDate}
                  onChange={(date) => setFormData({ ...formData, alternateDate: date })}
                  minDate={new Date()}
                  dateFormat="MMMM d, yyyy"
                  placeholderText="Select an alternate date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  calendarClassName="modern-calendar"
                  showPopperArrow={false}
                />
                <p className="text-xs text-gray-500 mt-1">
                  In case your preferred date isn&apos;t available
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Event
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="wine_tour">Wine Tour</option>
                  <option value="birthday">Birthday Celebration</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="celebration">Celebration</option>
                  <option value="other">Other</option>
                </select>
                {/* Corporate events use /corporate page for proposal workflow */}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests or Initial Ideas
                </label>
                <textarea
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any specific wineries you want to visit? Dietary restrictions? Celebrating something special? Share your thoughts..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  We&apos;ll discuss all the details when Ryan calls you
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition"
                >
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reserve Your Date</h2>
              <p className="text-gray-600 mb-6">
                Pay a <strong>${depositCalculated} deposit</strong> to hold your date and vehicle. 
                We&apos;ll finalize pricing when Ryan calls you within 24 hours.
              </p>

              <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3">What happens next:</h3>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">1.</span>
                    <span>Your date and vehicle are reserved immediately</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">2.</span>
                    <span>Ryan calls you within 24 hours (usually same day!)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">3.</span>
                    <span>Together we&apos;ll design your perfect itinerary</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">4.</span>
                    <span>Final payment due 48 hours after tour concludes (reflects actual time, lunch costs, and any added services)</span>
                  </li>
                </ol>
              </div>

              <PaymentMethodSelector
                amount={depositCalculated}
                onSelect={(method, total) => {
                  setFormData({ ...formData, paymentMethod: method, depositAmount: total });
                }}
                selectedMethod={formData.paymentMethod}
              />

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the{' '}
                    <a href="/terms" className="text-blue-600 hover:underline">
                      terms and conditions
                    </a>{' '}
                    and{' '}
                    <a href="/cancellation" className="text-blue-600 hover:underline">
                      cancellation policy
                    </a>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : `Pay $${formData.depositAmount} Deposit`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Policy Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          By booking, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline" target="_blank">
            Terms & Conditions
          </Link>
          {' '}and{' '}
          <Link href="/cancellation-policy" className="text-blue-600 hover:text-blue-800 underline" target="_blank">
            Cancellation Policy
          </Link>
        </div>

        {/* Trust Signals */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl mb-2">🔒</div>
              <h4 className="font-semibold text-gray-900 mb-1">Secure Payment</h4>
              <p className="text-xs text-gray-600">256-bit SSL encryption</p>
            </div>
            <div>
              <div className="text-3xl mb-2">✓</div>
              <h4 className="font-semibold text-gray-900 mb-1">Instant Confirmation</h4>
              <p className="text-xs text-gray-600">Your date is held immediately</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🛡️</div>
              <h4 className="font-semibold text-gray-900 mb-1">Licensed & Insured</h4>
              <p className="text-xs text-gray-600">Fully licensed & insured</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

