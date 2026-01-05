'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface AdditionalService {
  id: number;
  name: string;
  description: string;
  price: string;
  is_active: boolean;
  display_order: number;
  icon: string;
}

export default function AdditionalServicesPage() {
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<AdditionalService | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    icon: '✨'
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/additional-services');
      const result = await response.json();
      if (result.success) {
        setServices(result.data);
      }
    } catch (error) {
      logger.error('Failed to load services', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingService
        ? `/api/additional-services/${editingService.id}`
        : '/api/additional-services';
      
      const method = editingService ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price)
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(editingService ? 'Service updated!' : 'Service created!');
        setShowForm(false);
        setEditingService(null);
        setFormData({ name: '', description: '', price: '', icon: '✨' });
        loadServices();
      } else {
        alert(result.error || 'Failed to save service');
      }
    } catch (error) {
      logger.error('Failed to save service', { error });
      alert('Failed to save service');
    }
  };

  const handleEdit = (service: AdditionalService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      icon: service.icon
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const response = await fetch(`/api/additional-services/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('Service deleted!');
        loadServices();
      } else {
        alert(result.error || 'Failed to delete service');
      }
    } catch (error) {
      logger.error('Failed to delete service', { error });
      alert('Failed to delete service');
    }
  };

  const toggleActive = async (service: AdditionalService) => {
    try {
      const response = await fetch(`/api/additional-services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !service.is_active })
      });

      const result = await response.json();

      if (result.success) {
        loadServices();
      } else {
        alert(result.error || 'Failed to update service');
      }
    } catch (error) {
      logger.error('Failed to update service', { error });
      alert('Failed to update service');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/proposals"
            className="inline-flex items-center text-[#8B1538] hover:text-[#7A1230] font-bold mb-4"
          >
            ← Back to Proposals
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">✨ Additional Services</h1>
              <p className="text-gray-600 mt-2">Manage services that can be added to proposals</p>
            </div>
            <button
              onClick={() => {
                setEditingService(null);
                setFormData({ name: '', description: '', price: '', icon: '✨' });
                setShowForm(true);
              }}
              className="px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors shadow-lg"
            >
              + Add Service
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Service Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Icon</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="✨"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Price *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingService(null);
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors shadow-lg"
                  >
                    {editingService ? 'Update Service' : 'Create Service'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Services List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Services Yet</h3>
            <p className="text-gray-600 mb-6">Add your first additional service to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors"
            >
              + Add First Service
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-white rounded-xl shadow-md p-6 ${!service.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{service.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{service.name}</h3>
                        {!service.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                    </div>
                    {service.description && (
                      <p className="text-gray-600 mb-2">{service.description}</p>
                    )}
                    <p className="text-2xl font-bold text-[#8B1538]">
                      ${parseFloat(service.price).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(service)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        service.is_active
                          ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-900'
                          : 'bg-green-100 hover:bg-green-200 text-green-900'
                      }`}
                    >
                      {service.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(service)}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-sm font-bold transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-sm font-bold transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

