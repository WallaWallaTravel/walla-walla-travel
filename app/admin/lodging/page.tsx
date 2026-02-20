'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface LodgingProperty {
  id: number;
  name: string;
  slug: string;
  property_type: string;
  city: string;
  price_range_min?: number;
  price_range_max?: number;
  is_active: boolean;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  str: 'Short-Term Rental',
  bnb: 'B&B',
  vacation_rental: 'Vacation Rental',
  boutique_hotel: 'Boutique Hotel',
  resort: 'Resort',
};

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'str', label: 'Short-Term Rental' },
  { value: 'bnb', label: 'B&B' },
  { value: 'vacation_rental', label: 'Vacation Rental' },
  { value: 'boutique_hotel', label: 'Boutique Hotel' },
  { value: 'resort', label: 'Resort' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function formatPrice(min?: number, max?: number): string {
  if (min === undefined && max === undefined) return '--';
  if (min !== undefined && max !== undefined) {
    return `$${min} - $${max}`;
  }
  if (min !== undefined) return `From $${min}`;
  return `Up to $${max}`;
}

export default function AdminLodgingPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<LodgingProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, limit: 50, offset: 0, hasMore: false });

  // Filters
  const [propertyType, setPropertyType] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProperties = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (propertyType) params.set('property_type', propertyType);
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      params.set('limit', '50');
      params.set('offset', String(offset));

      const response = await fetch(`/api/admin/lodging?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.data.properties);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      logger.error('Failed to fetch lodging properties', { error });
    } finally {
      setLoading(false);
    }
  }, [propertyType, search, status]);

  useEffect(() => {
    fetchProperties(0);
  }, [fetchProperties]);

  const handleVerify = async (id: number) => {
    setActionLoading(`verify-${id}`);
    try {
      const response = await fetch(`/api/admin/lodging/${id}/verify`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchProperties(pagination.offset);
      }
    } catch (error) {
      logger.error('Failed to verify property', { error });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(`delete-${id}`);
    try {
      const response = await fetch(`/api/admin/lodging/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDeleteConfirmId(null);
        fetchProperties(pagination.offset);
      }
    } catch (error) {
      logger.error('Failed to delete property', { error });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrevPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    fetchProperties(newOffset);
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      fetchProperties(pagination.offset + pagination.limit);
    }
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lodging Properties</h1>
          <p className="text-slate-500 mt-1">
            Manage lodging listings for the directory
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/lodging/new')}
          className="px-4 py-2.5 bg-[#8B1538] text-white rounded-lg font-medium hover:bg-[#722F37] transition-colors shadow-sm"
        >
          Add Property
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties..."
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent min-w-[220px]"
        />

        <button
          onClick={() => router.push('/admin/lodging/analytics')}
          className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors ml-auto"
        >
          View Analytics
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : properties.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 mb-4">
              No lodging properties found. Add your first property to get started.
            </p>
            <button
              onClick={() => router.push('/admin/lodging/new')}
              className="px-4 py-2.5 bg-[#8B1538] text-white rounded-lg font-medium hover:bg-[#722F37] transition-colors"
            >
              Add Property
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">City</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Price Range</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Verified</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((property) => (
                <tr key={property.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{property.name}</div>
                    <div className="text-xs text-slate-500">{property.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {PROPERTY_TYPE_LABELS[property.property_type] || property.property_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {property.city}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatPrice(property.price_range_min, property.price_range_max)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        property.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {property.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {property.is_verified ? (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Verified
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/admin/lodging/${property.id}`)}
                        className="text-xs text-[#1E3A5F] hover:text-[#2d4a6f] font-medium"
                      >
                        Edit
                      </button>

                      {!property.is_verified && (
                        <button
                          onClick={() => handleVerify(property.id)}
                          disabled={actionLoading === `verify-${property.id}`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                        >
                          {actionLoading === `verify-${property.id}` ? 'Verifying...' : 'Verify'}
                        </button>
                      )}

                      {deleteConfirmId === property.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(property.id)}
                            disabled={actionLoading === `delete-${property.id}`}
                            className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            {actionLoading === `delete-${property.id}` ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(property.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {properties.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} properties
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pagination.offset === 0}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={!pagination.hasMore}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
