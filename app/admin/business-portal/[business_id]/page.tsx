"use client";

/**
 * Admin: Business Review Page
 * Complete review interface for business submissions
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface Business {
  id: number;
  name: string;
  business_type: string;
  status: string;
  completion_percentage: number;
  contact_email: string;
  contact_phone?: string;
  unique_code: string;
  submitted_at?: string;
}

interface Answer {
  id: number;
  question_number: number;
  question_text: string;
  response_text?: string;
  transcription?: string;
  extracted_data?: any;
  category?: string;
  answered_at: string;
}

interface FileItem {
  id: number;
  file_type: string;
  original_filename: string;
  file_size_bytes: number;
  ai_description?: string;
  ai_tags?: string[];
  category?: string;
  processing_status: string;
  approved: boolean;
  uploaded_at: string;
  storage_url?: string;
}

interface Discrepancy {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  sources: any[];
  suggestedResolution: string;
  draftMessage?: string;
}

export default function BusinessReviewPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.business_id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [voiceEntries, setVoiceEntries] = useState<Answer[]>([]);
  const [textEntries, setTextEntries] = useState<Answer[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'answers' | 'files' | 'discrepancies' | 'insights'>('answers');
  const [processingAction, setProcessingAction] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [insightForm, setInsightForm] = useState({
    insight_type: 'recommendation',
    title: '',
    content: '',
    priority: 5,
    is_public: true,
    tags: [] as string[],
    best_for: [] as string[],
    recommended_for: [] as string[]
  });
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadBusinessData();
  }, [businessId]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/business-portal/${businessId}`);
      
      if (!response.ok) throw new Error('Failed to load business');
      
      const data = await response.json();
      setBusiness(data.business);
      setVoiceEntries(data.voiceEntries || []);
      setTextEntries(data.textEntries || []);
      setFiles(data.files || []);
      setDiscrepancies(data.discrepancies || []);
      
      // Load insights
      loadInsights();
    } catch (error: any) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await fetch(`/api/admin/business-portal/${businessId}/insights`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const handleAddInsight = async () => {
    if (!insightForm.title || !insightForm.content) {
      setMessage({ type: 'error', text: 'Title and content are required' });
      return;
    }

    try {
      setProcessingAction(true);
      const response = await fetch(`/api/admin/business-portal/${businessId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insightForm)
      });

      if (!response.ok) throw new Error('Failed to add insight');

      setMessage({ type: 'success', text: 'Insight added!' });
      setShowInsightForm(false);
      setInsightForm({
        insight_type: 'recommendation',
        title: '',
        content: '',
        priority: 5,
        is_public: true,
        tags: [],
        best_for: [],
        recommended_for: []
      });
      loadInsights();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessingAction(false);
    }
  };

  const allAnswers = [...voiceEntries, ...textEntries].sort((a, b) => 
    a.question_number - b.question_number
  );

  const handleApproveFile = async (fileId: number) => {
    if (!confirm('Approve this file for the directory?')) return;

    try {
      setProcessingAction(true);
      const response = await fetch(`/api/admin/business-portal/files/${fileId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      });

      if (!response.ok) throw new Error('Failed to approve file');

      setMessage({ type: 'success', text: 'File approved!' });
      loadBusinessData(); // Reload to show updated status
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleApproveBusiness = async () => {
    if (!confirm(`Approve ${business?.name} and publish to directory?`)) return;

    try {
      setProcessingAction(true);
      const response = await fetch(`/api/admin/business-portal/${businessId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });

      if (!response.ok) throw new Error('Failed to approve business');

      setMessage({ type: 'success', text: 'Business approved and published!' });
      loadBusinessData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessingAction(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business details...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h2>
          <button
            onClick={() => router.push('/admin/business-portal')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/business-portal')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                <p className="text-sm text-gray-600">
                  {business.business_type} • {business.contact_email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <a
                href={`/contribute/${business.unique_code}/upload`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm flex items-center gap-2"
              >
                📤 Upload More Files
              </a>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                business.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                business.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {business.status}
              </span>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {business.completion_percentage}%
                </div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {[
              { id: 'answers', label: `Answers (${allAnswers.length})`, icon: '💬' },
              { id: 'files', label: `Files (${files.length})`, icon: '📁' },
              { id: 'insights', label: `Your Insights (${insights.length})`, icon: '💡' },
              { id: 'discrepancies', label: `Issues (${discrepancies.length})`, icon: '⚠️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Answers Tab */}
        {activeTab === 'answers' && (
          <div className="space-y-4">
            {allAnswers.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No answers submitted yet
              </div>
            ) : (
              allAnswers.map(answer => (
                <div key={answer.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          Question {answer.question_number}
                        </span>
                        {answer.category && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {answer.category}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {answer.question_text}
                      </h3>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(answer.answered_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {answer.transcription || answer.response_text}
                    </p>
                  </div>

                  {answer.extracted_data && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-blue-600 font-medium">
                        📊 View Extracted Data
                      </summary>
                      <pre className="mt-2 bg-blue-50 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(answer.extracted_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No files uploaded yet
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gray-100 h-48 flex items-center justify-center overflow-hidden relative group">
                    {file.file_type === 'photo' && file.storage_url ? (
                      <div className="relative w-full h-full">
                        {!imageErrors.has(file.id) ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={file.storage_url}
                              alt={file.original_filename}
                              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                              onClick={() => window.open(file.storage_url, '_blank')}
                              onError={() => {
                                console.error('Image failed to load:', file.id, '- Size:', file.file_size_bytes);
                                setImageErrors(prev => new Set(prev).add(file.id));
                              }}
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center pointer-events-none">
                              <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded">
                                Click to view
                              </span>
                            </div>
                          </>
                        ) : (
                          <div 
                            className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition"
                            onClick={() => window.open(file.storage_url, '_blank')}
                          >
                            <span className="text-6xl block mb-3">🖼️</span>
                            <p className="text-xs text-gray-600 px-2 mb-1">Image preview unavailable</p>
                            <p className="text-xs text-blue-600 underline">Click to open in new tab</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {(file.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-4xl block mb-2">📄</span>
                        <p className="text-xs text-gray-600">Document</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 truncate mb-2">
                      {file.original_filename}
                    </h4>
                    
                    {file.ai_description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {file.ai_description}
                      </p>
                    )}

                    {file.ai_tags && file.ai_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {file.ai_tags.slice(0, 5).map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {/* View/Download Button if preview failed */}
                      {file.file_type === 'photo' && imageErrors.has(file.id) && file.storage_url && (
                        <a
                          href={file.storage_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          🔍 View Full Image in New Tab
                        </a>
                      )}
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                        {!file.approved ? (
                          <button
                            onClick={() => handleApproveFile(file.id)}
                            disabled={processingAction}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 text-xs font-medium"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                            ✓ Approved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* Add Insight Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tour Operator Insights</h2>
                <p className="text-gray-600">Add your expertise and recommendations</p>
              </div>
              <button
                onClick={() => setShowInsightForm(!showInsightForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                {showInsightForm ? 'Cancel' : '+ Add Insight'}
              </button>
            </div>

            {/* Insight Form */}
            {showInsightForm && (
              <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Insight</h3>
                
                <div className="space-y-4">
                  {/* Type & Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={insightForm.insight_type}
                        onChange={(e) => setInsightForm({ ...insightForm, insight_type: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="recommendation">Recommendation</option>
                        <option value="warning">Warning/Note</option>
                        <option value="highlight">Highlight</option>
                        <option value="internal">Internal Note</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={insightForm.priority}
                        onChange={(e) => setInsightForm({ ...insightForm, priority: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={insightForm.title}
                      onChange={(e) => setInsightForm({ ...insightForm, title: e.target.value })}
                      placeholder="e.g., Perfect for Romantic Occasions"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Insight *
                    </label>
                    <p className="text-xs text-blue-600 mb-2">
                      💡 This is YOUR expert recommendation to share with visitors, not info from the winery
                    </p>
                    <textarea
                      value={insightForm.content}
                      onChange={(e) => setInsightForm({ ...insightForm, content: e.target.value })}
                      placeholder="Share YOUR expert opinion... Example: 'I recommend this winery for couples because the sunset view is incredible and the owner always makes anniversaries special.' or 'This is my go-to for large groups - they can handle 30+ people with dedicated event space.'"
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Best For Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Best For (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Couples', 'Groups', 'Families', 'Corporate Events', 'Wine Education', 'First-time Visitors', 'Wine Enthusiasts'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const newBestFor = insightForm.best_for.includes(tag)
                              ? insightForm.best_for.filter(t => t !== tag)
                              : [...insightForm.best_for, tag];
                            setInsightForm({ ...insightForm, best_for: newBestFor });
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                            insightForm.best_for.includes(tag)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Public/Private */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={insightForm.is_public}
                      onChange={(e) => setInsightForm({ ...insightForm, is_public: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="is_public" className="text-sm text-gray-700">
                      Make this visible to AI Travel Guide (recommended)
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddInsight}
                      disabled={processingAction}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {processingAction ? 'Saving...' : 'Save Insight'}
                    </button>
                    <button
                      onClick={() => setShowInsightForm(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Insights List */}
            {insights.length === 0 && !showInsightForm ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="text-6xl mb-4">💡</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Add Your Expertise
                </h3>
                <p className="text-gray-600 mb-4">
                  Share what makes this business special. Your insights help the AI Travel Guide give better recommendations.
                </p>
                <button
                  onClick={() => setShowInsightForm(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Add First Insight
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map(insight => (
                  <div
                    key={insight.id}
                    className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                            insight.insight_type === 'recommendation' ? 'bg-green-100 text-green-800' :
                            insight.insight_type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            insight.insight_type === 'highlight' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {insight.insight_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            Priority: {insight.priority}/10
                          </span>
                          {!insight.is_public && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              Internal Only
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">{insight.title}</h4>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{insight.content}</p>

                    {insight.best_for && insight.best_for.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600 font-medium">Best for:</span>
                        {insight.best_for.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discrepancies Tab */}
        {activeTab === 'discrepancies' && (
          <div className="space-y-4">
            {discrepancies.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  No Issues Found!
                </h3>
                <p className="text-gray-600">
                  This submission looks great. All information is consistent and complete.
                </p>
              </div>
            ) : (
              discrepancies.map(disc => (
                <div
                  key={disc.id}
                  className={`border-l-4 rounded-lg p-6 ${getSeverityColor(disc.severity)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase">
                          {disc.severity} Priority
                        </span>
                        <span className="text-xs px-2 py-1 bg-white rounded">
                          {disc.type}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold">{disc.title}</h3>
                    </div>
                  </div>

                  <p className="mb-4">{disc.description}</p>

                  <div className="bg-white bg-opacity-50 rounded p-3 mb-3">
                    <p className="text-sm font-medium mb-1">💡 Suggested Resolution:</p>
                    <p className="text-sm">{disc.suggestedResolution}</p>
                  </div>

                  {disc.draftMessage && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium mb-2">
                        📧 View Draft Message
                      </summary>
                      <div className="bg-white rounded p-3 whitespace-pre-wrap">
                        {disc.draftMessage}
                      </div>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {insights.length} insight(s) • {discrepancies.length} issue(s) • {files.length} file(s) • {allAnswers.length} answer(s)
          </div>
          <div className="flex gap-3">
            <button 
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              onClick={() => alert('Message UI coming next!')}
            >
              Send Message
            </button>
            <button 
              onClick={handleApproveBusiness}
              disabled={processingAction || business?.status === 'approved'}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingAction ? 'Processing...' : business?.status === 'approved' ? '✓ Approved' : 'Approve & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

