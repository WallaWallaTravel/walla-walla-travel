'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id: number;
  name: string;
  capacity: number;
  is_active: boolean;
}

interface AvailabilityBlock {
  id: number;
  vehicle_id: number;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  block_type: 'maintenance' | 'blackout' | 'hold' | 'booking';
  reason: string | null;
  vehicle_name: string;
  vehicle_capacity: number;
  created_at: string;
}

export default function AvailabilityManagement() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AvailabilityBlock | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    block_date: '',
    start_time: '',
    end_time: '',
    block_type: 'maintenance' as 'maintenance' | 'blackout' | 'hold',
    reason: ''
  });

  // Filters
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterVehicle !== 'all') params.append('vehicle_id', filterVehicle);
      if (filterType !== 'all') params.append('block_type', filterType);
      if (filterDateStart) params.append('start_date', filterDateStart);
      if (filterDateEnd) params.append('end_date', filterDateEnd);

      const response = await fetch(`/api/admin/availability?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.blocks || []);
        setVehicles(data.vehicles || []);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to load data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      const method = editingBlock ? 'PUT' : 'POST';
      const body = editingBlock
        ? { ...formData, id: editingBlock.id }
        : formData;

      const response = await fetch('/api/admin/availability', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save');
        return;
      }

      setSuccessMessage(editingBlock ? 'Block updated successfully' : 'Block created successfully');
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (block: AvailabilityBlock) => {
    if (!confirm(`Delete this ${block.block_type} block for ${block.vehicle_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/availability?id=${block.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to delete');
        return;
      }

      setSuccessMessage('Block deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleEdit = (block: AvailabilityBlock) => {
    setEditingBlock(block);
    setFormData({
      vehicle_id: String(block.vehicle_id),
      block_date: block.block_date,
      start_time: block.start_time || '',
      end_time: block.end_time || '',
      block_type: block.block_type as 'maintenance' | 'blackout' | 'hold',
      reason: block.reason || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingBlock(null);
    setFormData({
      vehicle_id: '',
      block_date: '',
      start_time: '',
      end_time: '',
      block_type: 'maintenance',
      reason: ''
    });
    setShowForm(false);
  };

  const getBlockTypeColor = (blockType: string): string => {
    switch (blockType) {
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'blackout':
        return 'bg-gray-800 text-white border-gray-900';
      case 'hold':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'booking':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBlockTypeIcon = (blockType: string): string => {
    switch (blockType) {
      case 'maintenance':
        return '🔧';
      case 'blackout':
        return '⛔';
      case 'hold':
        return '⏸️';
      case 'booking':
        return '📅';
      default:
        return '📅';
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string | null): string => {
    if (!time) return 'All Day';
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Availability Management</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-colors"
            >
              + Add Block
            </button>
            <button
              onClick={() => router.push('/admin/calendar')}
              className="text-gray-900 hover:text-gray-700 font-semibold text-lg"
            >
              ← Calendar
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingBlock ? 'Edit Block' : 'Add New Availability Block'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Vehicle *</label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
                    required
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} ({vehicle.capacity} seats)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Block Type *</label>
                  <select
                    value={formData.block_type}
                    onChange={(e) => setFormData({ ...formData, block_type: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
                    required
                  >
                    <option value="maintenance">🔧 Maintenance</option>
                    <option value="blackout">⛔ Blackout</option>
                    <option value="hold">⏸️ Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.block_date}
                    onChange={(e) => setFormData({ ...formData, block_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">End Time</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Reason / Notes</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
                  rows={2}
                  placeholder="e.g., Oil change scheduled, Vehicle in shop for repairs"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                >
                  {editingBlock ? 'Update Block' : 'Create Block'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Vehicle</label>
              <select
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
              >
                <option value="all">All Vehicles</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Block Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="maintenance">Maintenance</option>
                <option value="blackout">Blackout</option>
                <option value="hold">Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilterVehicle('all');
                setFilterType('all');
                setFilterDateStart('');
                setFilterDateEnd('');
                loadData();
              }}
              className="ml-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Blocks List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b-2 border-gray-200">
            <h3 className="font-bold text-gray-900">{blocks.length} Availability Blocks</h3>
          </div>

          {blocks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-600 text-lg font-semibold">No availability blocks found</p>
              <p className="text-gray-500">Create a new block to manage vehicle availability</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {blocks.map(block => (
                <div key={block.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`px-3 py-2 rounded-lg border-2 ${getBlockTypeColor(block.block_type)}`}>
                        <span className="text-lg">{getBlockTypeIcon(block.block_type)}</span>
                        <span className="ml-2 font-bold capitalize">{block.block_type}</span>
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{block.vehicle_name}</h4>
                        <p className="text-gray-600">
                          {formatDate(block.block_date)} &bull;{' '}
                          {block.start_time && block.end_time
                            ? `${formatTime(block.start_time)} - ${formatTime(block.end_time)}`
                            : 'All Day'}
                        </p>
                        {block.reason && (
                          <p className="text-gray-500 mt-1">{block.reason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {block.block_type !== 'booking' && (
                        <>
                          <button
                            onClick={() => handleEdit(block)}
                            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-semibold transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(block)}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-semibold transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {block.block_type === 'booking' && (
                        <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg font-semibold">
                          Linked to Booking
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
