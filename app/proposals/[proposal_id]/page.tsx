'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrandEmailConfig } from '@/lib/email-brands';
import BrandFooter from '@/components/BrandFooter';
import { getHourlyRate } from '@/lib/rate-config';
import { logger } from '@/lib/logger';
import { ProposalFeedbackPanel } from '@/components/proposals/ProposalFeedbackPanel';
import { formatCurrency, formatDateLong } from '@/lib/utils/format';

interface ServiceItem {
  id: string;
  service_type: string;
  date: string;
  duration_hours?: number;
  party_size: number;
  pricing_type: 'calculated' | 'hourly' | 'flat';
  price: number;
  description?: string;
  notes?: string;
}

interface Proposal {
  id: number;
  proposal_number: string;
  title: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  service_items: ServiceItem[];
  subtotal: number;
  discount_amount: number;
  discount_percentage?: number;
  total: number;
  gratuity_enabled: boolean;
  gratuity_percentage?: number;
  notes?: string;
  valid_until: string;
  status: string;
  created_at: string;
  brand_id?: number;
  
  // Optional modules
  modules?: {
    corporate?: boolean;
    multi_day?: boolean;
    b2b?: boolean;
    special_event?: boolean;
    group_coordination?: boolean;
  };
  corporate_details?: {
    company_name?: string;
    company_logo?: string;
    contact_person?: string;
    po_number?: string;
    billing_address?: string;
  };
  multi_day_itinerary?: Array<{
    day: number;
    date: string;
    title: string;
    activities: string[];
    accommodation?: string;
    meals?: string[];
  }>;
  special_event_details?: {
    event_type?: string;
    occasion?: string;
    special_requests?: string;
    vip_needs?: string[];
  };
  group_coordination?: {
    attendees?: Array<{
      name: string;
      email: string;
      dietary_restrictions?: string;
    }>;
    special_needs?: string[];
  };
}

interface MediaItem {
  id: number;
  file_path: string;
  file_name: string;
  title?: string;
  description?: string;
}

export default function ClientProposalView({ params }: { params: Promise<{ proposal_id: string }> }) {
  const _router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  
  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineCategory, setDeclineCategory] = useState('');
  const [desiredChanges, setDesiredChanges] = useState('');
  const [openToCounter, setOpenToCounter] = useState(true);
  const [declining, setDeclining] = useState(false);
  const [declineSuccess, setDeclineSuccess] = useState(false);

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
      
      // Fetch associated media
      if (data.data.id) {
        fetchMedia(data.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async (proposalId: number) => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/media`);
      if (response.ok) {
        const data = await response.json();
        setMedia(data.data || []);
      }
    } catch (err) {
      logger.error('Failed to load media', { error: err });
    }
  };

  const calculateTax = (subtotal: number, discountAmount: number) => {
    const taxableAmount = subtotal - discountAmount;
    return taxableAmount * 0.091; // 9.1% tax rate
  };

  const calculateDeposit = (total: number) => {
    return total * 0.5; // 50% deposit
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      wine_tour: 'Wine Tour',
      airport_transfer: 'Airport Transfer',
      local_transfer: 'Local Transfer',
      wait_time: 'Wait Time',
      custom: 'Custom Service',
    };
    return labels[type] || type;
  };

  const handleDecline = async () => {
    if (!proposalId || declineReason.trim().length < 10) {
      alert('Please provide a reason for declining (at least 10 characters)');
      return;
    }

    setDeclining(true);
    try {
      const response = await fetch(`/api/proposals/${proposalId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: declineReason,
          category: declineCategory || 'other',
          desired_changes: desiredChanges || null,
          open_to_counter: openToCounter,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDeclineSuccess(true);
        setShowDeclineModal(false);
        // Refresh proposal to show updated status
        fetchProposal();
      } else {
        alert(result.error || 'Failed to submit your response');
      }
    } catch (err) {
      logger.error('Error declining proposal', { error: err });
      alert('Failed to submit your response. Please try again.');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B1538] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This proposal does not exist or has been removed.'}</p>
          <Link
            href="/"
            className="inline-block bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B1028] transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(proposal.valid_until) < new Date();
  // Client can accept if proposal is sent OR viewed (not already accepted/declined/converted) and not expired
  const canAccept = ['sent', 'viewed'].includes(proposal.status) && !isExpired;

  // Get brand-specific config for display
  const brandConfig = getBrandEmailConfig(proposal.brand_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{brandConfig.name}</h1>
              <p className="text-sm text-gray-600">{brandConfig.tagline}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Proposal</p>
              <p className="text-lg font-bold text-[#8B1538]">{proposal.proposal_number}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Status Banner */}
        {isExpired && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-800 font-medium">
                  This proposal expired on {formatDateLong(proposal.valid_until)}. Please contact us to request an updated proposal.
                </p>
              </div>
            </div>
          </div>
        )}

        {proposal.status === 'accepted' && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800 font-medium">
                  ✓ This proposal has been accepted. We&apos;ll be in touch shortly to finalize details!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section with Media */}
        {media.length > 0 && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
            <div className="relative h-96">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media[0].file_path}
                alt={media[0].title || 'Wine Country'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h2 className="text-4xl font-bold mb-2">{proposal.title}</h2>
                <p className="text-xl text-gray-200">Prepared for {proposal.client_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Corporate Module */}
        {proposal.modules?.corporate && proposal.corporate_details && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Corporate Event Details</h3>
            <p className="text-gray-600 mb-6">Billing and contact information</p>
            
            <div className="space-y-6">
              {/* Primary Info */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Primary Contact</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {proposal.corporate_details.company_name && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company</p>
                      <p className="text-lg text-gray-900 font-bold">{proposal.corporate_details.company_name}</p>
                    </div>
                  )}
                  
                  {proposal.corporate_details.contact_person && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Contact Person</p>
                      <p className="text-lg text-gray-900">{proposal.corporate_details.contact_person}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Billing Info */}
              {(proposal.corporate_details.po_number || proposal.corporate_details.billing_address) && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Billing Information</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {proposal.corporate_details.po_number && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">PO Number</p>
                        <p className="text-base text-gray-900 font-mono font-medium">{proposal.corporate_details.po_number}</p>
                      </div>
                    )}
                    
                    {proposal.corporate_details.billing_address && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Billing Address</p>
                        <p className="text-sm text-gray-900">{proposal.corporate_details.billing_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Multi-Day Itinerary Module */}
        {proposal.modules?.multi_day && proposal.multi_day_itinerary && proposal.multi_day_itinerary.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{proposal.multi_day_itinerary.length}-Day Itinerary</h3>
            <p className="text-gray-600 mb-6">Your complete day-by-day experience</p>
            
            <div className="space-y-8">
              {proposal.multi_day_itinerary.map((day, index) => (
                <div key={index} className="relative">
                  {/* Subtle separator line between days */}
                  {index > 0 && (
                    <div className="absolute -top-4 left-0 right-0 flex items-center">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="px-4 text-xs text-gray-400 uppercase tracking-wider">Day {day.day}</span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>
                  )}
                  
                  <div className="border-l-4 border-gray-300 pl-6">
                    {/* Day header */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-3xl font-bold text-gray-900">Day {day.day}</span>
                        <h4 className="text-xl font-bold text-gray-900">{day.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{formatDateLong(day.date)}</p>
                    </div>

                    {/* Activities */}
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Activities</h5>
                      <ul className="space-y-2">
                        {day.activities.map((activity, actIndex) => (
                          <li key={actIndex} className="flex items-start">
                            <span className="text-gray-400 mr-3 mt-1">•</span>
                            <span className="text-gray-700">{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Accommodation & Meals */}
                    {(day.accommodation || (day.meals && day.meals.length > 0)) && (
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-4">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Logistics</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {day.accommodation && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Accommodation</p>
                              <p className="text-sm text-gray-900 font-medium">{day.accommodation}</p>
                            </div>
                          )}
                          
                          {day.meals && day.meals.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Meals Included</p>
                              <p className="text-sm text-gray-900 font-medium">{day.meals.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Event Module */}
        {proposal.modules?.special_event && proposal.special_event_details && (
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl shadow-lg p-6 mb-6 border-l-4 border-pink-500">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">🎉</span>
              Special Event Details
            </h3>
            <div className="space-y-3">
              {proposal.special_event_details.event_type && (
                <div>
                  <p className="text-sm text-gray-600 font-medium">Event Type</p>
                  <p className="text-lg text-gray-900">{proposal.special_event_details.event_type}</p>
                </div>
              )}
              {proposal.special_event_details.occasion && (
                <div>
                  <p className="text-sm text-gray-600 font-medium">Occasion</p>
                  <p className="text-lg text-gray-900">{proposal.special_event_details.occasion}</p>
                </div>
              )}
              {proposal.special_event_details.special_requests && (
                <div>
                  <p className="text-sm text-gray-600 font-medium">Special Requests</p>
                  <p className="text-gray-700">{proposal.special_event_details.special_requests}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Items */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Experience</h3>
          <div className="space-y-6">
            {proposal.service_items.map((item) => {
              const isWineTour = item.service_type === 'wine_tour';
              const hourlyRate = isWineTour && item.date ? getHourlyRate(item.party_size, new Date(item.date)) : null;
              
              return (
                <div key={item.id} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900">
                        {getServiceTypeLabel(item.service_type)}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">{formatDateLong(item.date)}</p>
                      
                      {/* Description */}
                      {item.description && (() => {
                        // Filter out legacy text that's now shown separately
                        const cleanDescription = item.description
                          .replace(/Includes tastings and lunch coordination\.?/gi, '')
                          .trim();
                        
                        return cleanDescription ? (
                          <p className="text-gray-700 mb-3">{cleanDescription}</p>
                        ) : null;
                      })()}
                      
                      {/* Duration */}
                      {item.duration_hours && (
                        <p className="text-sm text-gray-700">
                          <strong>Duration:</strong> {item.duration_hours} hours {isWineTour && '(estimated)'}
                        </p>
                      )}
                      
                      {/* Wine Tour Specific Info */}
                      {isWineTour && (
                        <div className="mt-3 space-y-1">
                          <p className="text-sm text-gray-700">
                            <strong>Itinerary:</strong> Visit 3 premier wineries
                          </p>
                          <p className="text-sm text-gray-600 italic">
                            Wine tasting fees paid directly to wineries ($20-$40/person typical)
                          </p>
                        </div>
                      )}
                      
                      {/* Lunch Estimate (if applicable) */}
                      {isWineTour && item.party_size && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-700">
                            <strong>Estimated lunch cost:</strong> {formatCurrency(item.party_size * 17.50)} 
                            <span className="text-gray-600"> ({item.party_size} guests × ~$15-20/person + tax)</span>
                          </p>
                        </div>
                      )}
                      
                      {item.notes && (
                        <p className="text-sm text-gray-600 italic mt-3">{item.notes}</p>
                      )}
                    </div>
                    
                    <div className="text-right ml-6">
                      <p className="text-2xl font-bold text-[#8B1538] mb-1">{formatCurrency(item.price)}</p>
                      {hourlyRate && (
                        <p className="text-xs text-gray-600 mb-2">Billed Hourly @ {formatCurrency(hourlyRate)}/hr</p>
                      )}
                      <p className="text-sm text-gray-700 font-medium">{item.party_size} {item.party_size === 1 ? 'guest' : 'guests'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Note - Only show for wine tours */}
        {proposal.service_items.some(item => item.service_type === 'wine_tour') && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">Please Note:</strong> Wine tours are billed at an hourly rate with a 5-hour minimum. 
              The estimate above is based on typical tour duration. Your final invoice will reflect actual tour time and will be sent 48 hours after your experience concludes.
            </p>
          </div>
        )}

        {/* Media Gallery */}
        {media.length > 1 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Experience Gallery</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {media.slice(1).map((item) => (
                <div key={item.id} className="relative aspect-video rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.file_path}
                    alt={item.title || item.file_name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {item.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm font-medium">{item.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Estimated Investment</h3>
          <p className="text-sm text-gray-600 mb-6 italic">
            Based on {proposal.service_items[0]?.duration_hours || 6} hours. Final invoice will reflect actual tour duration.
          </p>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(typeof proposal.subtotal === 'string' ? parseFloat(proposal.subtotal) : proposal.subtotal)}</span>
            </div>
            {proposal.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Discount
                  {proposal.discount_percentage && (
                    <span className="text-sm text-gray-600 ml-2">({proposal.discount_percentage}%)</span>
                  )}
                </span>
                <span className="font-semibold">-{formatCurrency(typeof proposal.discount_amount === 'string' ? parseFloat(proposal.discount_amount) : proposal.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700">
              <span>Tax</span>
              <span className="font-semibold">{formatCurrency(calculateTax(
                typeof proposal.subtotal === 'string' ? parseFloat(proposal.subtotal) : proposal.subtotal,
                typeof proposal.discount_amount === 'string' ? parseFloat(proposal.discount_amount) : proposal.discount_amount
              ))}</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-3 flex justify-between text-xl font-bold text-gray-900">
              <span>Total</span>
              <span className="text-[#8B1538]">{formatCurrency(typeof proposal.total === 'string' ? parseFloat(proposal.total) : proposal.total)}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <div className="flex justify-between text-gray-700">
                <span>Deposit Required (50%)</span>
                <span className="font-bold text-[#8B1538]">{formatCurrency(calculateDeposit(typeof proposal.total === 'string' ? parseFloat(proposal.total) : proposal.total))}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Remaining balance due 48 hours after service is concluded
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {proposal.notes && (
          <div className="bg-blue-50 rounded-xl shadow-lg p-6 mb-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Additional Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{proposal.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        {canAccept && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Book Your Experience?</h3>
              <p className="text-gray-600 mb-6">
                This proposal is valid until {formatDateLong(proposal.valid_until)}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href={proposalId ? `/proposals/${proposalId}/accept` : '#'}
                  className="inline-block bg-[#8B1538] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#6B1028] transition-colors shadow-lg hover:shadow-xl"
                >
                  ✓ Accept Proposal
                </Link>
                <button
                  onClick={() => setShowDeclineModal(true)}
                  className="inline-block bg-white text-gray-700 border-2 border-gray-300 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  Not Quite Right?
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Questions? Call us at{' '}
                <a href={`tel:${brandConfig.phone.replace(/[^+\d]/g, '')}`} className="text-[#8B1538] hover:underline">
                  {brandConfig.phone}
                </a>
                {' '}or email{' '}
                <a href={`mailto:${brandConfig.reply_to}`} className="text-[#8B1538] hover:underline">
                  {brandConfig.reply_to}
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Feedback Panel - for questions and suggestions */}
        {proposalId && ['sent', 'viewed'].includes(proposal.status) && !isExpired && (
          <ProposalFeedbackPanel
            proposalId={proposalId}
            proposalStatus={proposal.status}
            brandName={brandConfig.name}
          />
        )}

        {/* Decline Success Message */}
        {declineSuccess && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800 font-medium">
                  Thank you for your feedback! {openToCounter ? 'Our team will review your comments and may reach out with an updated proposal.' : 'We appreciate you taking the time to let us know.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Declined Status Banner */}
        {proposal.status === 'declined' && !declineSuccess && (
          <div className="mb-6 bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-gray-700 font-medium">
                  This proposal was declined. If you&apos;d like to discuss alternatives, please{' '}
                  <a href={`mailto:${brandConfig.reply_to}?subject=Re: Proposal ${proposal.proposal_number}`} className="text-[#8B1538] hover:underline">
                    contact us
                  </a>.
                </p>
              </div>
            </div>
          </div>
        )}

        {!canAccept && proposal.status !== 'accepted' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
            <p className="text-gray-700 mb-4">
              Have questions or need to make changes?
            </p>
            <a
              href={`mailto:${brandConfig.reply_to}?subject=Proposal ${proposal.proposal_number}`}
              className="inline-block bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Contact Us
            </a>
          </div>
        )}
      </main>

      {/* Footer - Brand Specific */}
      <BrandFooter brandId={proposal.brand_id} />

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Help Us Improve</h3>
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                We&apos;d love to understand what&apos;s not quite right so we can better meet your needs.
              </p>

              {/* Category Selection */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  What&apos;s the main concern?
                </label>
                <select
                  value={declineCategory}
                  onChange={(e) => setDeclineCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] text-gray-900"
                >
                  <option value="">Select a reason...</option>
                  <option value="price">Pricing is too high</option>
                  <option value="dates">Dates don&apos;t work</option>
                  <option value="services">Services don&apos;t match our needs</option>
                  <option value="timing">Not the right time</option>
                  <option value="competitor">Going with another provider</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Detailed Feedback */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Please share more details <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Help us understand your needs better..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] text-gray-900"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
              </div>

              {/* Desired Changes */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  What would make this work for you?
                </label>
                <textarea
                  value={desiredChanges}
                  onChange={(e) => setDesiredChanges(e.target.value)}
                  placeholder="e.g., Lower price, different dates, fewer services..."
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] text-gray-900"
                />
              </div>

              {/* Open to Counter */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openToCounter}
                    onChange={(e) => setOpenToCounter(e.target.checked)}
                    className="w-5 h-5 text-[#8B1538] border-gray-300 rounded focus:ring-[#8B1538]"
                  />
                  <span className="text-gray-700">
                    I&apos;m open to receiving a revised proposal
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  disabled={declining || declineReason.trim().length < 10}
                  className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {declining ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
