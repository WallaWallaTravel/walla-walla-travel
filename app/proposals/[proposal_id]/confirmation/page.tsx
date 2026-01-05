'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface Proposal {
  id: number;
  proposal_number: string;
  title: string;
  client_name: string;
  final_total: number;
  deposit_amount: number;
  accepted_at: string;
}

export default function ProposalConfirmation({ params }: { params: Promise<{ proposal_id: string }> }) {
  const [proposal_id, setProposalId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setProposalId(p.proposal_id));
  }, [params]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (proposal_id) {
      fetchProposal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal_id]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/proposals/${proposal_id}`);
      const data = await response.json();
      setProposal(data.data);
    } catch (err) {
      logger.error('Error fetching proposal', { error: err });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B1538]"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Proposal Not Found</h1>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Proposal Accepted! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Thank you for booking with Walla Walla Travel
          </p>

          {/* Confirmation Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Confirmation Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Proposal Number</span>
                <span className="font-bold text-gray-900">{proposal.proposal_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tour</span>
                <span className="font-semibold text-gray-900">{proposal.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Guest Name</span>
                <span className="font-semibold text-gray-900">{proposal.client_name}</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-lg">
                <span className="font-bold text-gray-900">Total Investment</span>
                <span className="font-bold text-[#8B1538]">{formatCurrency(proposal.final_total || proposal.deposit_amount * 2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Deposit Due Now (50%)</span>
                <span className="font-bold text-[#8B1538]">{formatCurrency(proposal.deposit_amount)}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-900 mb-3">What Happens Next?</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="font-bold text-blue-600 mr-2">1.</span>
                <span>You&apos;ll receive a confirmation email with your booking details</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-600 mr-2">2.</span>
                <span>We&apos;ll send you a secure payment link for your deposit</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-600 mr-2">3.</span>
                <span>Our team will contact you within 24 hours to finalize details</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-600 mr-2">4.</span>
                <span>The remaining balance is due 48 hours before your tour</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => window.print()}
              className="w-full bg-[#8B1538] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#6B1028] transition-colors shadow-lg hover:shadow-xl"
            >
              Print Confirmation
            </button>
            
            <Link
              href={`/proposals/${proposal_id}`}
              className="block w-full bg-gray-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              View Proposal Details
            </Link>
          </div>

          {/* Contact Info */}
          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-gray-600 mb-2">Questions? We&apos;re here to help!</p>
            <p className="text-gray-900 font-semibold">
              📞 (509) 200-8000 | 📧 info@wallawalla.travel
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

