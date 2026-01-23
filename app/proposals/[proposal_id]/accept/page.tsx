'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrandEmailConfig } from '@/lib/email-brands';
import Footer from '@/components/Footer';

interface Proposal {
  id: number;
  proposal_number: string;
  title: string;
  client_name: string;
  client_email: string;
  total: number;
  deposit_amount: number;
  gratuity_enabled: boolean;
  gratuity_percentage?: number;
  brand_id?: number;
}

export default function ProposalAcceptance({ params }: { params: Promise<{ proposal_id: string }> }) {
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  
  // Multi-step flow
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = proposal?.gratuity_enabled ? 4 : 3;

  // UX polish - show success state before redirect
  const [acceptanceState, setAcceptanceState] = useState<'idle' | 'submitting' | 'success' | 'redirecting'>('idle');
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Contact confirmation
    name: '',
    email: '',
    phone: '',
    
    // Step 2: Gratuity (if enabled)
    gratuity_option: 'custom', // 'none', '15', '20', '25', 'custom'
    gratuity_amount: 0,
    
    // Step 3: Terms acceptance
    terms_accepted: false,
    cancellation_policy_accepted: false,
    
    // Step 4: Signature
    signature: '',
    signature_date: new Date().toISOString(),
  });

  useEffect(() => {
    // Unwrap params Promise
    params.then(({ proposal_id }) => {
      setProposalId(proposal_id);
    });
  }, [params]);

  useEffect(() => {
    if (proposalId) {
      fetchProposal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const fetchProposal = async () => {
    if (!proposalId) return;
    
    try {
      const response = await fetch(`/api/proposals/${proposalId}`);
      
      if (!response.ok) {
        throw new Error('Proposal not found');
      }

      const data = await response.json();
      setProposal(data.data);
      
      // Pre-fill contact info
      setFormData(prev => ({
        ...prev,
        name: data.data.client_name,
        email: data.data.client_email,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateGratuity = (option: string) => {
    if (!proposal) return 0;
    
    const total = typeof proposal.total === 'string' ? parseFloat(proposal.total) : proposal.total;
    
    if (option === 'none') return 0;
    if (option === '15') return total * 0.15;
    if (option === '20') return total * 0.20;
    if (option === '25') return total * 0.25;
    if (option === 'custom') return formData.gratuity_amount || 0;
    
    return 0;
  };

  const handleGratuityOptionChange = (option: string) => {
    setFormData(prev => ({
      ...prev,
      gratuity_option: option,
      gratuity_amount: option === 'custom' ? prev.gratuity_amount : calculateGratuity(option),
    }));
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!formData.name || !formData.email || !formData.phone) {
        alert('Please fill in all contact information');
        return;
      }
    }
    
    if (currentStep === 3) {
      if (!formData.terms_accepted || !formData.cancellation_policy_accepted) {
        alert('Please accept the terms and conditions to continue');
        return;
      }
    }
    
    if (currentStep === totalSteps) {
      if (!formData.signature) {
        alert('Please provide your signature');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setAcceptanceState('submitting');
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          gratuity_amount: calculateGratuity(formData.gratuity_option),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || data.error || 'Failed to accept proposal');
      }

      const _data = await response.json();

      // Show success state with animation before redirecting
      setAcceptanceState('success');

      // Brief delay to show success message, then redirect
      setTimeout(() => {
        setAcceptanceState('redirecting');
        router.push(`/proposals/${proposalId}/pay`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept proposal');
      setSubmitting(false);
      setAcceptanceState('idle');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B1538] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href={proposalId ? `/proposals/${proposalId}` : '#'}
            className="inline-block bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B1028] transition-colors"
          >
            Back to Proposal
          </Link>
        </div>
      </div>
    );
  }

  if (!proposal) return null;

  // Get brand-specific config
  const brandConfig = getBrandEmailConfig(proposal.brand_id);

  const gratuityAmount = calculateGratuity(formData.gratuity_option);
  const proposalTotal = typeof proposal.total === 'string' ? parseFloat(proposal.total) : proposal.total;
  const finalTotal = proposalTotal + gratuityAmount;

  // Success/Redirecting overlay
  if (acceptanceState === 'success' || acceptanceState === 'redirecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          {acceptanceState === 'success' ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-[bounce_0.6s_ease-in-out]">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Accepted!</h2>
              <p className="text-gray-600 mb-4">Redirecting to payment...</p>

              {/* Journey Progress Indicator */}
              <div className="flex items-center justify-center gap-2 text-sm mt-6">
                <span className="flex items-center text-green-600 font-medium">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs mr-1">✓</span>
                  Accept
                </span>
                <span className="text-gray-400">→</span>
                <span className="flex items-center text-[#8B1538] font-medium animate-pulse">
                  <span className="w-6 h-6 rounded-full bg-[#8B1538] text-white flex items-center justify-center text-xs mr-1">2</span>
                  Payment
                </span>
                <span className="text-gray-400">→</span>
                <span className="flex items-center text-gray-400">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs mr-1">3</span>
                  Confirm
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B1538] mx-auto mb-6"></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Preparing Payment...</h2>
              <p className="text-gray-600">Setting up secure payment form</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accept Proposal</h1>
              <p className="text-sm text-gray-600">{proposal.proposal_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</p>
              <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-[#8B1538] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Contact Confirmation */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Confirm Your Information</h2>
              <p className="text-gray-600 mb-8">Please verify your contact details</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
                    placeholder="(509) 123-4567"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Gratuity (if enabled) */}
          {currentStep === 2 && proposal.gratuity_enabled && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Add Gratuity (Optional)</h2>
              <p className="text-gray-600 mb-8">
                Show your appreciation for exceptional service
              </p>
              
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-700 font-medium">Tour Total</span>
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(proposal.total)}</span>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <button
                  onClick={() => handleGratuityOptionChange('15')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    formData.gratuity_option === '15'
                      ? 'border-[#8B1538] bg-[#8B1538]/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">15% Gratuity</span>
                    <span className="text-lg font-bold text-[#8B1538]">
                      {formatCurrency(proposal.total * 0.15)}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => handleGratuityOptionChange('20')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    formData.gratuity_option === '20'
                      ? 'border-[#8B1538] bg-[#8B1538]/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">20% Gratuity</span>
                    <span className="text-lg font-bold text-[#8B1538]">
                      {formatCurrency(proposal.total * 0.20)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Most popular</p>
                </button>
                
                <button
                  onClick={() => handleGratuityOptionChange('25')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    formData.gratuity_option === '25'
                      ? 'border-[#8B1538] bg-[#8B1538]/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">25% Gratuity</span>
                    <span className="text-lg font-bold text-[#8B1538]">
                      {formatCurrency(proposal.total * 0.25)}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => handleGratuityOptionChange('custom')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    formData.gratuity_option === 'custom'
                      ? 'border-[#8B1538] bg-[#8B1538]/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Custom Amount</span>
                    {formData.gratuity_option === 'custom' && (
                      <input
                        type="number"
                        value={formData.gratuity_amount}
                        onChange={(e) => setFormData({ ...formData, gratuity_amount: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </button>
                
                <button
                  onClick={() => handleGratuityOptionChange('none')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    formData.gratuity_option === 'none'
                      ? 'border-[#8B1538] bg-[#8B1538]/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="font-semibold text-gray-900">No Gratuity</span>
                </button>
              </div>
              
              {gratuityAmount > 0 && (
                <div className="bg-green-50 rounded-xl p-6 border-l-4 border-green-500">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">New Total</span>
                    <span className="text-3xl font-bold text-green-700">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Includes {formatCurrency(gratuityAmount)} gratuity
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Terms & Conditions */}
          {currentStep === (proposal.gratuity_enabled ? 3 : 2) && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Terms & Conditions</h2>
              <p className="text-gray-600 mb-8">Please review and accept our policies</p>
              
              <div className="bg-gray-50 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto">
                <h3 className="font-bold text-gray-900 mb-3">Terms of Service</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    <strong>Payment Terms:</strong> A 50% deposit is required to confirm your booking.
                    The remaining balance is due 48 hours after your tour concludes.
                  </p>

                  <p><strong>Cancellation Policy:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>100% refund of deposit if cancelled 45+ days before scheduled service/event.</li>
                    <li>50% refund of deposit if cancelled 21-44 days before scheduled service/event.</li>
                    <li>No refund of deposit if cancelled within 21 days of the service date.</li>
                  </ul>

                  <p><strong>Vehicle &amp; Conduct Policies:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Drinking alcoholic beverages inside the vehicle is not permitted.</li>
                    <li>Smoking of any kind (including vaping) in and around the vehicle is not permitted.</li>
                    <li>{brandConfig.name} and each individual location/winery reserves the right to refuse service to any guest(s) for misconduct or inebriation. If service is refused mid-tour, a separate vehicle will return the guest(s) to the pick-up location at the guest(s)&apos;s expense.</li>
                    <li>Should significant cleaning be necessary to restore the vehicle to pre-tour condition, a cleaning fee of $250 will be charged to the responsible guest(s).</li>
                  </ul>

                  <p><strong>Tour Operations:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>{brandConfig.name} reserves the right to make changes to tour locations, order, or vehicles as necessary.</li>
                    <li>{brandConfig.name} reserves the right to terminate any tour at any time in the interest of guest safety, driver safety, vehicle safety, and/or compliance with federal/state/local laws.</li>
                    <li>Unruly, violent, inappropriate, illegal, or dangerous behavior will result in immediate termination of the tour without refund.</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.terms_accepted}
                    onChange={(e) => setFormData({ ...formData, terms_accepted: e.target.checked })}
                    className="mt-1 h-5 w-5 text-[#8B1538] border-gray-300 rounded focus:ring-[#8B1538]"
                  />
                  <span className="ml-3 text-gray-700">
                    I have read and agree to the <strong>Terms of Service</strong>
                  </span>
                </label>
                
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.cancellation_policy_accepted}
                    onChange={(e) => setFormData({ ...formData, cancellation_policy_accepted: e.target.checked })}
                    className="mt-1 h-5 w-5 text-[#8B1538] border-gray-300 rounded focus:ring-[#8B1538]"
                  />
                  <span className="ml-3 text-gray-700">
                    I understand and accept the <strong>Cancellation Policy</strong>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Signature */}
          {currentStep === totalSteps && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Digital Signature</h2>
              <p className="text-gray-600 mb-8">Sign to finalize your booking</p>
              
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-2">Booking Summary</h3>
                <p className="text-xs text-gray-600 mb-4 italic">
                  Estimated pricing based on hourly rate. Final invoice will reflect actual tour duration.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Tour Total</span>
                    <span className="font-semibold">{formatCurrency(proposal.total)}</span>
                  </div>
                  {gratuityAmount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Gratuity</span>
                      <span className="font-semibold">{formatCurrency(gratuityAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Final Total</span>
                    <span className="text-[#8B1538]">{formatCurrency(finalTotal)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-gray-600">Deposit Due Now (50%)</span>
                    <span className="font-bold text-[#8B1538]">{formatCurrency(finalTotal * 0.5)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Type your full name to sign *
                </label>
                <input
                  type="text"
                  value={formData.signature}
                  onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent text-2xl font-serif italic"
                  placeholder="John Doe"
                />
                <p className="text-sm text-gray-600 mt-2">
                  By signing, you agree to pay the deposit and accept this proposal.
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            
            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-8 py-3 bg-[#8B1538] text-white rounded-lg font-bold hover:bg-[#6B1028] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : currentStep === totalSteps ? (
                'Accept & Pay Deposit'
              ) : (
                'Continue →'
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

