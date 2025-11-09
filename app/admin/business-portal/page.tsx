"use client";

/**
 * Admin: Business Portal Management
 * Invite businesses, view submissions, track progress
 */

import { useState, useEffect } from 'react';

interface Business {
  id: number;
  name: string;
  business_type: string;
  status: string;
  completion_percentage: number;
  contact_email: string;
  unique_code: string;
  created_at: string;
}

export default function AdminBusinessPortalPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    business_type: 'winery',
    name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadBusinesses();
  }, [filter]);
  
  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`/api/admin/businesses${statusParam}`);
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/admin/businesses/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to invite');
      }
      
      const data = await response.json();
      setSuccess(`✓ ${data.business.name} invited! Code: ${data.business.unique_code}`);
      
      // Reset form
      setFormData({
        business_type: 'winery',
        name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        website: ''
      });
      
      // Reload list
      loadBusinesses();
      
      // Hide form after 3 seconds
      setTimeout(() => {
        setShowInviteForm(false);
        setSuccess(null);
      }, 3000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };
  
  const statusColors: { [key: string]: string } = {
    invited: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    submitted: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800'
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Portal Management</h1>
          <p className="text-gray-600">Invite businesses and manage their contributions</p>
        </div>
        
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              All ({businesses.length})
            </button>
            <button
              onClick={() => setFilter('invited')}
              className={`px-4 py-2 rounded-lg ${filter === 'invited' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Invited
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-lg ${filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter('submitted')}
              className={`px-4 py-2 rounded-lg ${filter === 'submitted' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Submitted
            </button>
          </div>
          
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
          >
            + Invite Business
          </button>
        </div>
        
        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite New Business</h2>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <p className="text-green-700">{success}</p>
              </div>
            )}
            
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type *
                  </label>
                  <select
                    value={formData.business_type}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="winery">Winery</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="hotel">Hotel</option>
                    <option value="activity">Activity</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Inviting...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Business List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : businesses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No businesses found. Invite your first business to get started!
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {businesses.map((business) => (
                  <tr key={business.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{business.name}</div>
                      <div className="text-sm text-gray-500">{business.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{business.business_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[business.status] || 'bg-gray-100 text-gray-800'}`}>
                        {business.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${business.completion_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{business.completion_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => copyToClipboard(business.unique_code)}
                        className="text-sm font-mono text-blue-600 hover:text-blue-800"
                      >
                        {business.unique_code}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/contribute/${business.unique_code}`)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Copy Link
                      </button>
                      <a
                        href={`/contribute/${business.unique_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

