'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Step components
import Step1TourDetails from './steps/Step1TourDetails';
import Step2WinerySelection from './steps/Step2WinerySelection';
import Step3CustomerInfo from './steps/Step3CustomerInfo';
import Step4ReviewPayment from './steps/Step4ReviewPayment';
import Step5Confirmation from './steps/Step5Confirmation';

export interface BookingData {
  // Step 1: Tour Details
  tour_date: string;
  duration_hours: number;
  party_size: number;
  start_time: string;
  
  // Step 2: Wineries
  selected_wineries: Array<{
    id: number;
    name: string;
    city: string;
    address: string;
  }>;
  
  // Step 3: Customer Info
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_location: string;
  special_requests: string;
  
  // Pricing
  pricing: {
    base_price: number;
    weekend_surcharge: number;
    holiday_surcharge: number;
    large_group_discount: number;
    subtotal: number;
    taxes: number;
    total: number;
    deposit_required: number;
    estimated_gratuity: number;
    breakdown: Array<{ label: string; amount: number }>;
  } | null;
  
  // Availability
  vehicle: {
    id: number;
    type: string;
    capacity: number;
    name: string;
  } | null;
  
  // Payment
  payment_intent_id?: string;
  booking_number?: string;
}

export default function BookTourPage() {
  const _router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    tour_date: '',
    duration_hours: 6,
    party_size: 2,
    start_time: '10:00',
    selected_wineries: [],
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    pickup_location: '',
    special_requests: '',
    pricing: null,
    vehicle: null,
  });

  const totalSteps = 5;

  const updateBookingData = (data: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= currentStep) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Book Your Wine Tour
          </h1>
          <p className="text-lg text-gray-600">
            Experience the best of Walla Walla wine country
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {[
              { num: 1, label: 'Tour Details' },
              { num: 2, label: 'Wineries' },
              { num: 3, label: 'Your Info' },
              { num: 4, label: 'Review & Pay' },
              { num: 5, label: 'Confirmed!' }
            ].map((step, index) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => goToStep(step.num)}
                    disabled={step.num > currentStep}
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                      transition-all duration-300
                      ${currentStep === step.num
                        ? 'bg-purple-600 text-white scale-110 shadow-lg'
                        : currentStep > step.num
                        ? 'bg-green-500 text-white cursor-pointer hover:scale-105'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {currentStep > step.num ? '✓' : step.num}
                  </button>
                  <span className={`
                    mt-2 text-xs md:text-sm font-semibold text-center
                    ${currentStep >= step.num ? 'text-gray-900' : 'text-gray-400'}
                  `}>
                    {step.label}
                  </span>
                </div>
                {index < 4 && (
                  <div className={`
                    h-1 flex-1 mx-2 transition-all duration-300
                    ${currentStep > step.num ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {currentStep === 1 && (
            <Step1TourDetails
              bookingData={bookingData}
              updateBookingData={updateBookingData}
              nextStep={nextStep}
            />
          )}

          {currentStep === 2 && (
            <Step2WinerySelection
              bookingData={bookingData}
              updateBookingData={updateBookingData}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          )}

          {currentStep === 3 && (
            <Step3CustomerInfo
              bookingData={bookingData}
              updateBookingData={updateBookingData}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          )}

          {currentStep === 4 && (
            <Elements stripe={stripePromise}>
              <Step4ReviewPayment
                bookingData={bookingData}
                updateBookingData={updateBookingData}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            </Elements>
          )}

          {currentStep === 5 && (
            <Step5Confirmation
              bookingData={bookingData}
            />
          )}
        </div>

        {/* Help Section */}
        {currentStep < 5 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-2">Need help? We&apos;re here for you!</p>
            <div className="flex items-center justify-center gap-6">
              <a
                href="tel:+15092008000"
                className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2"
              >
                📞 (509) 200-8000
              </a>
              <a
                href="mailto:info@wallawalla.travel"
                className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2"
              >
                ✉️ info@wallawalla.travel
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

