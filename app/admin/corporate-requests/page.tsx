"use client";

/**
 * Admin Corporate Requests Page
 * View and manage corporate/group event quote requests
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface UploadedFile {
  filename: string;
  size: number;
  dataUrl: string;
  contentType?: string;
}

interface AIExtractedData {
  event_name?: string;
  suggested_services?: string[];
  estimated_budget?: number;
  key_requirements?: string[];
  timeline?: string;
  [key: string]: string | string[] | number | undefined;
}

interface CorporateRequest {
  id: number;
  request_number: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  party_size: number;
  event_type: string;
  description: string;
  special_requirements: string;
  budget_range: string;
  preferred_dates: string[];
  uploaded_files: UploadedFile[];
  ai_extracted_data: AIExtractedData | null;
  ai_confidence_score: number;
  status: string;
  created_at: string;
}

export default function CorporateRequestsPage() {
  const [requests, setRequests] = useState<CorporateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<CorporateRequest | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertMessage, setConvertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all' 
        ? '/api/corporate-request'
        : `/api/corporate-request?status=${statusFilter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      logger.error('Failed to load requests', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToProposal = async (requestId: number) => {
    if (!confirm('Convert this corporate request to a proposal? This will create a draft proposal with AI-extracted data.')) {
      return;
    }

    setConverting(true);
    setConvertMessage(null);

    try {
      const response = await fetch('/api/corporate-request/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to convert');
      }

      const data = await response.json();
      setConvertMessage({ 
        type: 'success', 
        text: `✓ Converted to ${data.proposalNumber}! Redirecting...` 
      });

      // Redirect to proposal editor
      setTimeout(() => {
        window.location.href = `/admin/proposals/${data.proposalId}`;
      }, 1500);

    } catch (error) {
      setConvertMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setConverting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading corporate requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏢 Corporate Requests</h1>
              <p className="text-sm text-gray-600">Manage group event quote requests</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="responded">Responded</option>
                <option value="converted">Converted to Proposal</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {convertMessage && (
          <div className={`mb-6 px-6 py-4 rounded-lg shadow-md ${
            convertMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {convertMessage.text}
          </div>
        )}
        
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Requests Yet</h3>
            <p className="text-gray-600 mb-4">
              {statusFilter === 'all' 
                ? 'No corporate requests have been submitted yet.'
                : `No ${statusFilter} requests found.`}
            </p>
            <Link
              href="/corporate-request"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View Public Form
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {request.company_name || request.contact_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      {request.ai_extracted_data && (
                        <span className={`text-xs font-semibold ${getConfidenceColor(request.ai_confidence_score)}`}>
                          🤖 AI: {(request.ai_confidence_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {request.contact_name} • {request.contact_email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      Request #{request.request_number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Party Size</p>
                    <p className="font-semibold text-gray-900">{request.party_size} guests</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Event Type</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {request.event_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Files Uploaded</p>
                    <p className="font-semibold text-gray-900">
                      {request.uploaded_files?.length || 0} file(s)
                    </p>
                  </div>
                </div>

                {request.description && (
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {request.description}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRequest(request);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConvertToProposal(request.id);
                    }}
                    disabled={converting || request.status === 'converted'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {request.status === 'converted' ? '✓ Converted' : 'Convert to Proposal'}
                  </button>
                  <a
                    href={`mailto:${request.contact_email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                  >
                    Email Customer
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedRequest.company_name || selectedRequest.contact_name}
                  </h3>
                  <p className="text-sm text-gray-600">Request #{selectedRequest.request_number}</p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{selectedRequest.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedRequest.contact_email}</p>
                  </div>
                  {selectedRequest.contact_phone && (
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{selectedRequest.contact_phone}</p>
                    </div>
                  )}
                  {selectedRequest.company_name && (
                    <div>
                      <p className="text-xs text-gray-500">Company</p>
                      <p className="font-medium text-gray-900">{selectedRequest.company_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Details */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Event Details</h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Party Size</p>
                    <p className="font-medium text-gray-900">{selectedRequest.party_size} guests</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Event Type</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedRequest.event_type.replace('_', ' ')}
                    </p>
                  </div>
                  {selectedRequest.budget_range && (
                    <div>
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="font-medium text-gray-900">{selectedRequest.budget_range}</p>
                    </div>
                  )}
                </div>
                {selectedRequest.preferred_dates && selectedRequest.preferred_dates.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Preferred Dates</p>
                    <p className="font-medium text-gray-900">
                      {typeof selectedRequest.preferred_dates === 'string' 
                        ? selectedRequest.preferred_dates
                        : selectedRequest.preferred_dates.join(', ')}
                    </p>
                  </div>
                )}
                {selectedRequest.description && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Description</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
                  </div>
                )}
                {selectedRequest.special_requirements && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">Special Requirements</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.special_requirements}</p>
                  </div>
                )}
              </div>

              {/* AI Extracted Data */}
              {selectedRequest.ai_extracted_data && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900">🤖 AI Extracted Data</h4>
                    <span className={`text-sm font-semibold ${getConfidenceColor(selectedRequest.ai_confidence_score)}`}>
                      Confidence: {(selectedRequest.ai_confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <pre className="text-xs text-gray-700 overflow-auto">
                    {JSON.stringify(selectedRequest.ai_extracted_data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Uploaded Files */}
              {selectedRequest.uploaded_files && selectedRequest.uploaded_files.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Uploaded Files</h4>
                  <div className="space-y-2">
                    {selectedRequest.uploaded_files.map((file: UploadedFile, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <p className="font-medium text-gray-900">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <a
                          href={file.dataUrl}
                          download={file.filename}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleConvertToProposal(selectedRequest.id);
                }}
                disabled={converting || selectedRequest.status === 'converted'}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {converting ? 'Converting...' : selectedRequest.status === 'converted' ? '✓ Already Converted' : 'Convert to Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

