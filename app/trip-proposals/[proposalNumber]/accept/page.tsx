'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { logger } from '@/lib/logger';

interface TripProposal {
  proposal_number: string;
  status: string;
  brand_id: number | null;
  customer_name: string;
  total: string;
  deposit_amount: string;
  deposit_percentage: number;
  valid_until: string | null;
}

export default function AcceptTripProposalPage({
  params,
}: {
  params: Promise<{ proposalNumber: string }>;
}) {
  const { proposalNumber } = use(params);
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [proposal, setProposal] = useState<TripProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMethod, setSignatureMethod] = useState<'type' | 'draw'>('type');

  useEffect(() => {
    fetchProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalNumber]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/trip-proposals/${proposalNumber}`);

      if (!response.ok) {
        throw new Error('Proposal not found');
      }

      const data = await response.json();
      if (data.success) {
        setProposal(data.data);
      } else {
        throw new Error(data.error || 'Failed to load proposal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
      logger.error('Failed to load trip proposal', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!signature.trim()) {
      alert('Please provide your signature');
      return;
    }

    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/trip-proposals/${proposalNumber}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureMethod === 'draw' ? getCanvasSignature() : signature,
          agreed_to_terms: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/trip-proposals/${proposalNumber}/confirmation`);
      } else {
        alert(result.error || 'Failed to accept proposal');
      }
    } catch (err) {
      logger.error('Failed to accept proposal', { error: err });
      alert('Failed to accept proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCanvasSignature = () => {
    if (!canvasRef.current) return '';
    return canvasRef.current.toDataURL('image/png');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setSignature('drawn');
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const _formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
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

  const isExpired = proposal.valid_until && new Date(proposal.valid_until) < new Date();
  const canAccept = ['sent', 'viewed'].includes(proposal.status) && !isExpired;
  const brandConfig = getBrandEmailConfig(proposal.brand_id ?? undefined);

  if (!canAccept) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-amber-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cannot Accept Proposal</h1>
          <p className="text-gray-600 mb-6">
            {isExpired
              ? 'This proposal has expired. Please contact us for an updated proposal.'
              : proposal.status === 'accepted'
                ? 'This proposal has already been accepted.'
                : 'This proposal is not available for acceptance.'}
          </p>
          <Link
            href={`/trip-proposals/${proposalNumber}`}
            className="inline-block bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B1028] transition-colors"
          >
            View Proposal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{brandConfig.name}</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Accept Proposal</p>
              <p className="text-lg font-bold text-[#8B1538]">{proposal.proposal_number}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href={`/trip-proposals/${proposalNumber}`}
          className="inline-flex items-center text-[#8B1538] hover:text-[#6B1028] font-bold mb-6"
        >
          ← Back to Proposal
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#8B1538] to-[#6B1028] px-8 py-6 text-white">
            <h2 className="text-2xl font-bold">Accept Your Trip Proposal</h2>
            <p className="text-white/80 mt-1">
              Review the details and sign below to confirm your booking
            </p>
          </div>

          <div className="p-8">
            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Booking Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-bold text-gray-900">{proposal.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-gray-900">{formatCurrency(proposal.total)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-gray-900 font-bold">
                    Deposit Due Today ({proposal.deposit_percentage}%)
                  </span>
                  <span className="text-2xl font-bold text-[#8B1538]">
                    {formatCurrency(proposal.deposit_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4">Terms & Conditions</h3>
              <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto text-sm text-gray-700 border border-gray-200">
                <p className="mb-3">
                  <strong>Payment Terms:</strong> A 50% deposit is required at booking. The remaining
                  balance is due 48 hours after your tour concludes.
                </p>
                <p className="mb-3">
                  <strong>Cancellation Policy:</strong>
                </p>
                <ul className="list-disc pl-5 mb-3 space-y-1">
                  <li>45+ days before: 100% refund of deposit</li>
                  <li>21-44 days before: 50% refund of deposit</li>
                  <li>Within 21 days: No refund of deposit</li>
                </ul>
                <p className="mb-3">
                  <strong>Vehicle Policy:</strong> No alcohol or smoking/vaping in or around the
                  vehicle. We reserve the right to refuse service for misconduct.
                </p>
                <p>
                  By signing below, you agree to these terms and conditions and authorize the booking
                  of your wine country experience.
                </p>
              </div>

              <label className="flex items-start gap-3 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 text-[#8B1538] border-gray-300 rounded focus:ring-[#8B1538] mt-0.5"
                />
                <span className="text-gray-700">
                  I have read and agree to the terms and conditions
                </span>
              </label>
            </div>

            {/* Signature */}
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4">Your Signature</h3>

              {/* Signature Method Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSignatureMethod('type')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    signatureMethod === 'type'
                      ? 'bg-[#8B1538] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Type Signature
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMethod('draw')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    signatureMethod === 'draw'
                      ? 'bg-[#8B1538] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Draw Signature
                </button>
              </div>

              {signatureMethod === 'type' ? (
                <div>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Type your full name"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] text-xl"
                    style={{ fontFamily: 'cursive' }}
                  />
                  {signature && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">Preview:</p>
                      <p className="text-3xl" style={{ fontFamily: 'cursive' }}>
                        {signature}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={150}
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-sm text-gray-600">
                      Sign above using your mouse or finger
                    </p>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-sm text-[#8B1538] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleAccept}
              disabled={submitting || !agreedToTerms || !signature}
              className="w-full bg-[#8B1538] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#6B1028] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : '✓ Accept Proposal & Continue to Payment'}
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Questions?{' '}
              <a
                href={`tel:${brandConfig.phone.replace(/[^+\d]/g, '')}`}
                className="text-[#8B1538] hover:underline"
              >
                {brandConfig.phone}
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
