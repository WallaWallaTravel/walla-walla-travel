'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateWineTourPrice, calculateTransferPrice, calculateWaitTimePrice, calculateTax, calculateDeposit, formatCurrency } from '@/lib/rate-config';
import { WinerySelector } from './winery-selector';
import { SmartTimeInput } from '@/components/shared/form-inputs/SmartTimeInput';
import { SmartLocationInput } from '@/components/shared/form-inputs/SmartLocationInput';

interface ServiceItem {
  id: string;
  service_type: 'wine_tour' | 'airport_transfer' | 'local_transfer' | 'regional_transfer' | 'wait_time' | 'custom';
  name: string;
  description: string;
  date: string;
  start_time: string;
  
  // Party size per service
  party_size: number;
  
  // Wine tour specific
  duration_hours?: number;
  selected_wineries?: Array<{
    id: number;
    name: string;
    city: string;
  }>;
  
  // Pricing override
  pricing_override?: {
    enabled: boolean;
    pricing_mode?: 'hourly' | 'fixed'; // Track which mode is being used
    custom_hourly_rate?: number;
    custom_total: number;
    override_reason?: string;
  };
  
  // Transfer specific
  transfer_type?: 'seatac_to_walla' | 'walla_to_seatac' | 'pasco_to_walla' | 'walla_to_pasco' | 'local';
  pickup_location?: string;
  dropoff_location?: string;
  miles?: number;
  
  // Wait time specific
  wait_hours?: number;
  
  // Pricing
  pricing_type: 'calculated' | 'hourly' | 'flat';
  hourly_rate?: number;
  flat_rate?: number;
  calculated_price: number;
}

interface ProposalData {
  // Client Information
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company: string;
  
  // Service Items
  service_items: ServiceItem[];
  
  // Additional Services
  additional_services?: Array<{
    service_id: number;
    quantity: number;
  }>;
  
  // Discount
  discount_percentage: number;
  discount_reason: string;
  
  // Gratuity
  include_gratuity_request: boolean;
  suggested_gratuity_percentage: number;
  gratuity_optional: boolean;
  
  // Proposal Details
  proposal_title: string;
  introduction: string;
  special_notes: string;
  valid_until: string;
}

export default function NewProposalPageV2() {
  const router = useRouter();
  const [wineries, setWineries] = useState<any[]>([]);
  const [availableAdditionalServices, setAvailableAdditionalServices] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [pricingStrategy, setPricingStrategy] = useState<'conservative' | 'standard' | 'aggressive'>('standard');
  const [showPriceRange, setShowPriceRange] = useState(true); // Toggle between exact and range
  
  const [formData, setFormData] = useState<ProposalData>({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_company: '',
    service_items: [],
    discount_percentage: 0,
    discount_reason: '',
    include_gratuity_request: true,
    suggested_gratuity_percentage: 18,
    gratuity_optional: true,
    proposal_title: 'Walla Walla Wine Country Experience',
    introduction: 'Thank you for your interest in Walla Walla Travel! We are excited to create a memorable wine country experience for you and your guests.',
    special_notes: '',
    valid_until: '',
  });

  useEffect(() => {
    loadWineries();
    loadAdditionalServices();
    
    // Set valid until date (30 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    setFormData(prev => ({ ...prev, valid_until: validUntil.toISOString().split('T')[0] }));
  }, []);

  const loadWineries = async () => {
    try {
      const response = await fetch('/api/wineries');
      const result = await response.json();
      if (result.success) {
        setWineries(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load wineries:', error);
    }
  };

  const loadAdditionalServices = async () => {
    try {
      const response = await fetch('/api/additional-services?active=true');
      const result = await response.json();
      if (result.success) {
        setAvailableAdditionalServices(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load additional services:', error);
    }
  };

  // Add new service item
  const addServiceItem = async (type: ServiceItem['service_type']) => {
    const newItem: ServiceItem = {
      id: `service-${Date.now()}`,
      service_type: type,
      name: getServiceName(type),
      description: '',
      date: new Date().toISOString().split('T')[0], // Default to today for pricing
      start_time: '10:00',
      party_size: 4,
      pricing_type: type === 'wine_tour' ? 'calculated' : type === 'wait_time' ? 'hourly' : 'flat',
      calculated_price: 0,
    };

    if (type === 'wine_tour') {
      newItem.duration_hours = 6;
      newItem.selected_wineries = [];
    } else if (type === 'airport_transfer') {
      newItem.transfer_type = 'seatac_to_walla';
      newItem.pickup_location = 'SeaTac Airport';
      newItem.dropoff_location = 'Walla Walla';
    } else if (type === 'local_transfer' || type === 'regional_transfer') {
      newItem.pickup_location = '';
      newItem.dropoff_location = '';
      newItem.miles = 0;
      newItem.pricing_type = 'flat';
      newItem.flat_rate = 0;
    } else if (type === 'wait_time') {
      newItem.wait_hours = 2;
      newItem.hourly_rate = 75;
    }

    // Fetch dynamic price from database
    try {
      const dynamicPrice = await fetchDynamicPrice(newItem);
      newItem.calculated_price = dynamicPrice;
      console.log('✅ Dynamic pricing:', dynamicPrice);
    } catch (error) {
      console.error('Failed to fetch dynamic price, using fallback:', error);
      newItem.calculated_price = calculateServicePrice(newItem);
    }

    setFormData(prev => ({
      ...prev,
      service_items: [...prev.service_items, newItem]
    }));
  };

  const getServiceName = (type: string): string => {
    const names = {
      wine_tour: 'Wine Tour',
      airport_transfer: 'Airport Transfer',
      local_transfer: 'Local Transfer',
      regional_transfer: 'Regional Transfer',
      wait_time: 'Wait Time',
      custom: 'Custom Service'
    };
    return names[type as keyof typeof names] || 'Service';
  };

  // Update service item
  const updateServiceItem = async (id: string, updates: Partial<ServiceItem>) => {
    // Check if we should refresh pricing
    const shouldRefreshPrice = 
      updates.duration_hours !== undefined || 
      updates.party_size !== undefined || 
      updates.date !== undefined ||
      updates.transfer_type !== undefined ||
      updates.wait_hours !== undefined;
    
    setFormData(prev => ({
      ...prev,
      service_items: prev.service_items.map(item => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      })
    }));
    
    // Fetch dynamic pricing if relevant fields changed
    if (shouldRefreshPrice) {
      const item = formData.service_items.find(i => i.id === id);
      if (item) {
        const updatedItem = { ...item, ...updates };
        
        try {
          const dynamicPrice = await fetchDynamicPrice(updatedItem);
          setFormData(prev => ({
            ...prev,
            service_items: prev.service_items.map(item =>
              item.id === id ? { ...item, calculated_price: dynamicPrice } : item
            )
          }));
          console.log('✅ Price refreshed:', dynamicPrice);
        } catch (error) {
          console.error('Failed to refresh price, using fallback:', error);
          const fallbackPrice = calculateServicePrice(updatedItem);
          setFormData(prev => ({
            ...prev,
            service_items: prev.service_items.map(item =>
              item.id === id ? { ...item, calculated_price: fallbackPrice } : item
            )
          }));
        }
      }
    } else {
      // Just recalculate with fallback for non-dynamic fields
      setFormData(prev => ({
        ...prev,
        service_items: prev.service_items.map(item => {
          if (item.id === id) {
            const updated = { ...item, ...updates };
            updated.calculated_price = calculateServicePrice(updated);
            return updated;
          }
          return item;
        })
      }));
    }
  };

  // Remove service item
  const removeServiceItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      service_items: prev.service_items.filter(item => item.id !== id)
    }));
  };

  // Fetch dynamic pricing from database
  const fetchDynamicPrice = async (item: ServiceItem): Promise<number> => {
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: item.service_type,
          partySize: item.party_size,
          durationHours: item.duration_hours,
          date: item.date,
          transferType: item.transfer_type,
          hours: item.wait_hours,
          applyModifiers: false // Backend-only, not automatic
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.finalPrice;
      }
    } catch (error) {
      console.error('Dynamic pricing fetch failed, using fallback:', error);
    }
    
    // Fallback to hardcoded rates if API fails
    return calculateServicePriceFallback(item);
  };

  // Calculate price for a service (synchronous fallback)
  const calculateServicePriceFallback = (item: ServiceItem): number => {
    // Check for pricing override first
    if (item.pricing_override?.enabled && item.pricing_override.custom_total) {
      return item.pricing_override.custom_total;
    }

    if (item.pricing_type === 'flat' && item.flat_rate) {
      return item.flat_rate;
    }

    if (item.pricing_type === 'hourly' && item.hourly_rate && item.wait_hours) {
      return item.hourly_rate * item.wait_hours;
    }

    if (item.service_type === 'wine_tour' && item.duration_hours && item.date) {
      const pricing = calculateWineTourPrice(
        item.duration_hours,
        item.party_size,
        new Date(item.date)
      );
      
      return pricing.total;
    }

    if (item.service_type === 'airport_transfer' && item.transfer_type) {
      return calculateTransferPrice(item.transfer_type, item.miles);
    }

    if (item.service_type === 'wait_time' && item.wait_hours) {
      return calculateWaitTimePrice(item.wait_hours, item.party_size, item.date);
    }

    return 0;
  };
  
  // Main price calculator (uses fallback for sync context)
  const calculateServicePrice = (item: ServiceItem): number => {
    return calculateServicePriceFallback(item);
  };

  // Calculate totals
  const calculateTotals = () => {
    const servicesSubtotal = formData.service_items.reduce((sum, item) => sum + item.calculated_price, 0);
    
    // Calculate additional services total
    const additionalServicesTotal = (formData.additional_services || []).reduce((sum, selected) => {
      const service = availableAdditionalServices.find(s => s.id === selected.service_id);
      return sum + (service ? service.price * selected.quantity : 0);
    }, 0);
    
    const subtotal = servicesSubtotal + additionalServicesTotal;
    const discount = subtotal * (formData.discount_percentage / 100);
    const afterDiscount = subtotal - discount;
    const tax = calculateTax(afterDiscount);
    const total = afterDiscount + tax;
    const deposit = calculateDeposit(total);
    const balance = total - deposit;
    
    // Calculate price range based on strategy
    const rangeMultipliers = {
      conservative: { low: 0.85, high: 0.95 }, // Show 85-95% of calculated price
      standard: { low: 0.90, high: 1.10 },     // Show 90-110% of calculated price
      aggressive: { low: 1.05, high: 1.20 }    // Show 105-120% of calculated price
    };
    
    const multiplier = rangeMultipliers[pricingStrategy];
    const lowTotal = total * multiplier.low;
    const highTotal = total * multiplier.high;
    
    return {
      servicesSubtotal,
      additionalServicesTotal,
      subtotal,
      discount,
      afterDiscount,
      tax,
      total,
      deposit,
      balance,
      lowTotal,
      highTotal,
      showRange: showPriceRange
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.service_items.length === 0) {
      alert('Please add at least one service');
      return;
    }

    setSaving(true);

    try {
      // Calculate totals
      const totals = calculateTotals();
      
      // Prepare proposal data
      const proposalData = {
        ...formData,
        subtotal: totals.subtotal,
        discount_amount: totals.discount,
        total: totals.total
      };
      
      // Create proposal
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proposalData)
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create proposal');
      }
      
      alert(`Proposal created successfully! Proposal #${result.data.proposal_number}`);
      router.push('/admin/proposals');
    } catch (error) {
      console.error('Failed to create proposal:', error);
      alert(error instanceof Error ? error.message : 'Failed to create proposal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/proposals"
            className="inline-flex items-center text-[#8B1538] hover:text-[#7A1230] font-bold mb-4"
          >
            ← Back to Proposals
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📝 Create New Proposal</h1>
          <p className="text-gray-600">Build a custom proposal with multiple services</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Client Information */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 Client Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Client Name *</label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Company</label>
                    <input
                      type="text"
                      value={formData.client_company}
                      onChange={(e) => setFormData({...formData, client_company: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Service Items */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">🎯 Services</h2>
                  <div className="text-sm text-gray-600">
                    {formData.service_items.length} service{formData.service_items.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Service Items List */}
                {formData.service_items.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-gray-600 font-bold mb-4">No services added yet</p>
                    <p className="text-sm text-gray-500">Click a button below to add your first service</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {formData.service_items.map((item, index) => (
                      <ServiceItemCard
                        key={item.id}
                        item={item}
                        index={index}
                        wineries={wineries}
                        onUpdate={(updates) => updateServiceItem(item.id, updates)}
                        onRemove={() => removeServiceItem(item.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Add Service Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <button
                    type="button"
                    onClick={() => addServiceItem('wine_tour')}
                    className="p-4 border-2 border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538] hover:text-white rounded-lg font-bold transition-all"
                  >
                    <div className="text-2xl mb-1">🍷</div>
                    <div className="text-sm">Wine Tour</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => addServiceItem('airport_transfer')}
                    className="p-4 border-2 border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538] hover:text-white rounded-lg font-bold transition-all"
                  >
                    <div className="text-2xl mb-1">✈️</div>
                    <div className="text-sm">Airport Transfer</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => addServiceItem('local_transfer')}
                    className="p-4 border-2 border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538] hover:text-white rounded-lg font-bold transition-all"
                  >
                    <div className="text-2xl mb-1">🚐</div>
                    <div className="text-sm">Local Transfer</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => addServiceItem('regional_transfer')}
                    className="p-4 border-2 border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538] hover:text-white rounded-lg font-bold transition-all"
                  >
                    <div className="text-2xl mb-1">🗺️</div>
                    <div className="text-sm">Regional Transfer</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => addServiceItem('wait_time')}
                    className="p-4 border-2 border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538] hover:text-white rounded-lg font-bold transition-all"
                  >
                    <div className="text-2xl mb-1">⏰</div>
                    <div className="text-sm">Wait Time</div>
                  </button>
                </div>
              </div>

              {/* Discount & Gratuity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Discount */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Discount</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Discount %</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.discount_percentage}
                          onChange={(e) => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0})}
                          onFocus={(e) => e.target.select()}
                          className="w-full pl-4 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">%</span>
                      </div>
                    </div>

                    {formData.discount_percentage > 0 && (
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">Reason</label>
                        <input
                          type="text"
                          value={formData.discount_reason}
                          onChange={(e) => setFormData({...formData, discount_reason: e.target.value})}
                          placeholder="e.g., Repeat customer, Corporate rate"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Services */}
                <AdditionalServicesSection
                  selectedServices={formData.additional_services || []}
                  onChange={(services) => setFormData({...formData, additional_services: services})}
                />

                {/* Gratuity */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">💝 Gratuity</h2>
                  
                  <div className="space-y-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.include_gratuity_request}
                        onChange={(e) => setFormData({...formData, include_gratuity_request: e.target.checked})}
                        className="w-5 h-5 text-[#8B1538] rounded focus:ring-[#8B1538]"
                      />
                      <span className="text-sm font-bold text-gray-900">Include Gratuity</span>
                    </label>

                    {formData.include_gratuity_request && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">Suggested %</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.suggested_gratuity_percentage}
                              onChange={(e) => setFormData({...formData, suggested_gratuity_percentage: parseInt(e.target.value)})}
                              onFocus={(e) => e.target.select()}
                              className="w-full pl-4 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">%</span>
                          </div>
                        </div>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.gratuity_optional}
                            onChange={(e) => setFormData({...formData, gratuity_optional: e.target.checked})}
                            className="w-5 h-5 text-[#8B1538] rounded focus:ring-[#8B1538]"
                          />
                          <span className="text-sm font-bold text-gray-900">Gratuity is optional</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Proposal Details */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📄 Proposal Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Proposal Title</label>
                    <input
                      type="text"
                      value={formData.proposal_title}
                      onChange={(e) => setFormData({...formData, proposal_title: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Introduction</label>
                    <textarea
                      value={formData.introduction}
                      onChange={(e) => setFormData({...formData, introduction: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Special Notes</label>
                    <textarea
                      value={formData.special_notes}
                      onChange={(e) => setFormData({...formData, special_notes: e.target.value})}
                      rows={3}
                      placeholder="Any special requests or notes..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Valid Until</label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Pricing Summary (Sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <PricingSummary
                  formData={formData}
                  totals={totals}
                  saving={saving}
                  pricingStrategy={pricingStrategy}
                  setPricingStrategy={setPricingStrategy}
                  showPriceRange={showPriceRange}
                  setShowPriceRange={setShowPriceRange}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Service Item Card Component
interface ServiceItemCardProps {
  item: ServiceItem;
  index: number;
  wineries: Array<{ id: number; name: string; city: string }>;
  onUpdate: (updates: Partial<ServiceItem>) => void;
  onRemove: () => void;
}

function ServiceItemCard({ item, index, wineries, onUpdate, onRemove }: ServiceItemCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[#FDF2F4] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-600 hover:text-gray-900"
          >
            {expanded ? '▼' : '▶'}
          </button>
          <div>
            <div className="font-bold text-gray-900">
              Service #{index + 1}: {item.name}
            </div>
            <div className="text-sm text-gray-600">
              {item.date || 'No date set'} • {item.party_size} guests • {formatCurrency(item.calculated_price)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition-colors"
        >
          Remove
        </button>
      </div>

      {/* Details */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Date *</label>
              <input
                type="date"
                value={item.date}
                onChange={(e) => onUpdate({ date: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                required
              />
            </div>

            <div>
              <SmartTimeInput
                value={item.start_time}
                onChange={(time) => onUpdate({ start_time: time })}
                serviceType={item.service_type}
                label="Start Time"
                nextFieldId={`duration-${item.id}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Party Size *</label>
            <input
              type="number"
              min="1"
              max="14"
              value={item.party_size}
              onChange={(e) => onUpdate({ party_size: parseInt(e.target.value) })}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              required
            />
          </div>

          {/* Wine Tour Specific */}
          {item.service_type === 'wine_tour' && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Duration (hours)</label>
                <div className="space-y-2">
                  {/* Quick Select Buttons */}
                  <div className="flex gap-2">
                    {[5, 5.5, 6, 6.5].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => onUpdate({ duration_hours: hours })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          item.duration_hours === hours
                            ? 'bg-[#8B1538] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {hours}h
                      </button>
                    ))}
                  </div>
                  
                  {/* Manual Input */}
                  <input
                    id={`duration-${item.id}`}
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.25"
                    value={item.duration_hours || 6}
                    onChange={(e) => onUpdate({ duration_hours: parseFloat(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                    placeholder="6.0"
                  />
                  <p className="text-xs text-gray-500">Or enter custom duration (e.g., 5.75, 7.25)</p>
                </div>
              </div>

              <WinerySelector
                selectedWineries={item.selected_wineries || []}
                allWineries={wineries}
                onUpdate={(selected) => onUpdate({ selected_wineries: selected })}
                descriptionFieldId={`description-${item.id}`}
              />
            </>
          )}

          {/* Airport Transfer Specific */}
          {item.service_type === 'airport_transfer' && (
            <div className="grid grid-cols-2 gap-4">
              <SmartLocationInput
                value={item.pickup_location || ''}
                onChange={(location) => onUpdate({ pickup_location: location })}
                label="Pickup Location"
                placeholder="Type to search..."
                nextFieldId={`dropoff-${item.id}`}
              />

              <SmartLocationInput
                id={`dropoff-${item.id}`}
                value={item.dropoff_location || ''}
                onChange={(location) => onUpdate({ dropoff_location: location })}
                label="Dropoff Location"
                placeholder="Type to search..."
                nextFieldId={`description-${item.id}`}
              />
            </div>
          )}

          {/* Local Transfer & Regional Transfer Specific */}
          {(item.service_type === 'local_transfer' || item.service_type === 'regional_transfer') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <SmartLocationInput
                  value={item.pickup_location || ''}
                  onChange={(location) => onUpdate({ pickup_location: location })}
                  label="Pickup Location"
                  placeholder="Type to search..."
                  nextFieldId={`dropoff-local-${item.id}`}
                />

                <SmartLocationInput
                  id={`dropoff-local-${item.id}`}
                  value={item.dropoff_location || ''}
                  onChange={(location) => onUpdate({ dropoff_location: location })}
                  label="Dropoff Location"
                  placeholder="Type to search..."
                  nextFieldId={`miles-${item.id}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Distance (miles)</label>
                  <input
                    id={`miles-${item.id}`}
                    type="number"
                    min="0"
                    value={item.miles || 0}
                    onChange={(e) => onUpdate({ miles: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Flat Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.flat_rate || 0}
                      onChange={(e) => onUpdate({ flat_rate: parseFloat(e.target.value) || 0, calculated_price: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      className="w-full pl-8 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Wait Time Specific */}
          {item.service_type === 'wait_time' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Hours</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={item.wait_hours}
                  onChange={(e) => onUpdate({ wait_hours: parseFloat(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Hourly Rate</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                  <input
                    type="number"
                    value={item.hourly_rate}
                    onChange={(e) => onUpdate({ hourly_rate: parseFloat(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pricing Override Section */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={item.pricing_override?.enabled || false}
                onChange={(e) => {
                  if (e.target.checked) {
                    onUpdate({ 
                      pricing_override: { 
                        enabled: true, 
                        custom_total: item.calculated_price || 0,
                        override_reason: ''
                      } 
                    });
                  } else {
                    onUpdate({ pricing_override: undefined });
                  }
                }}
                className="w-5 h-5 text-[#8B1538] rounded focus:ring-[#8B1538]"
              />
              <span className="text-sm font-bold text-gray-900">Override Pricing (for negotiation)</span>
            </label>

            {item.pricing_override?.enabled && (
              <div className="space-y-3 pl-7">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Standard Price: <span className="text-gray-900">{formatCurrency(item.calculated_price)}</span>
                  </label>
                  
                  {/* Pricing Mode Selection */}
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Pricing Type</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`pricing-mode-${item.id}`}
                          checked={item.pricing_override.pricing_mode === 'hourly'}
                          onChange={() => {
                            onUpdate({
                              pricing_override: {
                                enabled: item.pricing_override?.enabled ?? true,
                                pricing_mode: 'hourly',
                                custom_hourly_rate: item.pricing_override?.custom_hourly_rate || undefined,
                                custom_total: item.pricing_override?.custom_hourly_rate && item.duration_hours
                                  ? item.pricing_override.custom_hourly_rate * item.duration_hours
                                  : 0,
                                override_reason: item.pricing_override?.override_reason
                              }
                            });
                          }}
                          className="w-4 h-4 text-[#8B1538]"
                        />
                        <span className="text-sm text-gray-900">Hourly Rate</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`pricing-mode-${item.id}`}
                          checked={item.pricing_override.pricing_mode === 'fixed'}
                          onChange={() => {
                            // Auto-populate $450 for 1-2 guests
                            const defaultFixed = item.party_size <= 2 ? 450 : item.pricing_override?.custom_total || 0;
                            onUpdate({
                              pricing_override: {
                                enabled: item.pricing_override?.enabled ?? true,
                                pricing_mode: 'fixed',
                                custom_hourly_rate: undefined,
                                custom_total: defaultFixed,
                                override_reason: item.pricing_override?.override_reason
                              },
                              calculated_price: defaultFixed
                            });
                          }}
                          className="w-4 h-4 text-[#8B1538]"
                        />
                        <span className="text-sm text-gray-900">Fixed Price</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Hourly Rate - only if hourly mode */}
                  {item.service_type === 'wine_tour' && item.pricing_override.pricing_mode === 'hourly' && (
                    <div className="mb-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Custom Hourly Rate * <span className="text-[#8B1538]">(Client will see this rate)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.pricing_override.custom_hourly_rate || ''}
                          onChange={(e) => {
                            const hourlyRate = e.target.value ? parseFloat(e.target.value) : undefined;
                            const calculatedTotal = hourlyRate && item.duration_hours 
                              ? hourlyRate * item.duration_hours 
                              : 0;
                            
                            onUpdate({ 
                              pricing_override: { 
                                enabled: item.pricing_override?.enabled ?? true,
                                pricing_mode: 'hourly',
                                custom_hourly_rate: hourlyRate,
                                custom_total: calculatedTotal,
                                override_reason: item.pricing_override?.override_reason
                              },
                              calculated_price: calculatedTotal
                            });
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder="Enter hourly rate"
                          className="w-full pl-8 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">/hr</span>
                      </div>
                      {item.pricing_override.custom_hourly_rate && item.duration_hours && (
                        <p className="text-xs mt-1 font-bold text-[#8B1538]">
                          Estimated Total: {formatCurrency(item.pricing_override.custom_hourly_rate * item.duration_hours)} for {item.duration_hours} hours
                          <br />
                          <span className="text-gray-600 font-normal">Final bill based on actual tour duration</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Custom Total Price - only if fixed mode */}
                  {item.pricing_override.pricing_mode === 'fixed' && (
                    <div className="mb-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Fixed Price * <span className="text-[#8B1538]">(Client pays this exact amount)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.pricing_override.custom_total || 0}
                          onChange={(e) => {
                            const customTotal = parseFloat(e.target.value) || 0;
                            onUpdate({ 
                              pricing_override: { 
                                enabled: item.pricing_override?.enabled ?? true,
                                pricing_mode: 'fixed',
                                custom_hourly_rate: undefined,
                                custom_total: customTotal,
                                override_reason: item.pricing_override?.override_reason
                              },
                              calculated_price: customTotal
                            });
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full pl-8 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                        />
                      </div>
                      {item.pricing_override.custom_total !== item.calculated_price && (
                        <p className="text-xs mt-1 font-bold">
                          {item.pricing_override.custom_total < item.calculated_price ? (
                            <span className="text-green-600">
                              Discount: {formatCurrency(item.calculated_price - item.pricing_override.custom_total)} 
                              ({Math.round(((item.calculated_price - item.pricing_override.custom_total) / item.calculated_price) * 100)}% off)
                            </span>
                          ) : (
                            <span className="text-blue-600">
                              Premium: +{formatCurrency(item.pricing_override.custom_total - item.calculated_price)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Override (Internal Note)</label>
                  <input
                    type="text"
                    value={item.pricing_override.override_reason || ''}
                    onChange={(e) => onUpdate({ 
                      pricing_override: { 
                        enabled: item.pricing_override?.enabled ?? true,
                        custom_total: item.pricing_override?.custom_total ?? 0,
                        override_reason: e.target.value
                      } 
                    })}
                    placeholder="e.g., Corporate discount, repeat customer, competitive match..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Description (Optional)</label>
            <textarea
              id={`description-${item.id}`}
              value={item.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
              placeholder="Add any notes about this service..."
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
            />
          </div>

          {/* Price Display */}
          <div className="bg-[#FAF6ED] rounded-lg p-3 border-2 border-[#D4AF37]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Service Price:</span>
              <span className="text-2xl font-bold text-[#8B1538]">{formatCurrency(item.calculated_price)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pricing Summary Component
function PricingSummary({ formData, totals, saving, pricingStrategy, setPricingStrategy, showPriceRange, setShowPriceRange }: any) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#8B1538]">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Pricing Summary</h2>
      
      {/* Pricing Strategy Controls */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={showPriceRange}
            onChange={(e) => setShowPriceRange(e.target.checked)}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            Show Price Range (instead of exact price)
          </span>
        </label>
        
        {showPriceRange && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Pricing Strategy
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPricingStrategy('conservative')}
                className={`px-3 py-2 text-xs rounded-lg font-medium transition ${
                  pricingStrategy === 'conservative'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Conservative<br />
                <span className="text-[10px] opacity-75">85-95%</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingStrategy('standard')}
                className={`px-3 py-2 text-xs rounded-lg font-medium transition ${
                  pricingStrategy === 'standard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Standard<br />
                <span className="text-[10px] opacity-75">90-110%</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingStrategy('aggressive')}
                className={`px-3 py-2 text-xs rounded-lg font-medium transition ${
                  pricingStrategy === 'aggressive'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Aggressive<br />
                <span className="text-[10px] opacity-75">105-120%</span>
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Range gives flexibility without locking into exact pricing
            </p>
          </div>
        )}
      </div>
      
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-gray-700">
          <span>Services ({formData.service_items.length})</span>
          <span className="font-bold">{formatCurrency(totals.servicesSubtotal)}</span>
        </div>

        {totals.additionalServicesTotal > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Additional Services ({formData.additional_services?.length || 0})</span>
            <span className="font-bold">{formatCurrency(totals.additionalServicesTotal)}</span>
          </div>
        )}

        <div className="border-t-2 border-gray-200 pt-3 flex justify-between text-gray-900">
          <span className="font-bold">Subtotal</span>
          <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
        </div>

        {totals.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({formData.discount_percentage}%)</span>
            <span className="font-bold">-{formatCurrency(totals.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-700">
          <span>Tax (8.9%)</span>
          <span className="font-bold">{formatCurrency(totals.tax)}</span>
        </div>

        <div className="border-t-2 border-[#8B1538] pt-3 flex justify-between">
          <span className="text-xl font-bold text-gray-900">Total</span>
          {showPriceRange ? (
            <div className="text-right">
              <div className="text-2xl font-bold text-[#8B1538]">
                {formatCurrency(totals.lowTotal)} - {formatCurrency(totals.highTotal)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                (Exact: {formatCurrency(totals.total)})
              </div>
            </div>
          ) : (
            <span className="text-2xl font-bold text-[#8B1538]">{formatCurrency(totals.total)}</span>
          )}
        </div>

        <div className="bg-[#FDF2F4] rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Deposit (50%)</span>
            <span className="font-bold text-gray-900">{formatCurrency(totals.deposit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Balance</span>
            <span className="font-bold text-gray-900">{formatCurrency(totals.balance)}</span>
          </div>
        </div>

        {formData.include_gratuity_request && (
          <div className="bg-[#FAF6ED] rounded-lg p-3">
            <div className="text-sm text-gray-700 mb-1">Suggested Gratuity ({formData.suggested_gratuity_percentage}%)</div>
            <div className="font-bold text-[#D4AF37]">
              {formatCurrency(totals.total * (formData.suggested_gratuity_percentage / 100))}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {formData.gratuity_optional ? 'Optional' : 'Required'}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || formData.service_items.length === 0}
        className="w-full px-6 py-4 bg-[#8B1538] hover:bg-[#7A1230] disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
      >
        {saving ? '⏳ Creating...' : '📝 Create Proposal'}
      </button>

      {formData.service_items.length === 0 && (
        <p className="text-sm text-center text-gray-600 mt-3">
          Add at least one service to continue
        </p>
      )}
    </div>
  );
}

// Additional Services Section Component
interface AdditionalService {
  id: number;
  name: string;
  description: string;
  price: number;
  icon: string;
  is_active: boolean;
}

interface AdditionalServicesSectionProps {
  selectedServices: Array<{ service_id: number; quantity: number }>;
  onChange: (services: Array<{ service_id: number; quantity: number }>) => void;
}

function AdditionalServicesSection({ selectedServices, onChange }: AdditionalServicesSectionProps) {
  const [availableServices, setAvailableServices] = useState<AdditionalService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/additional-services?active=true');
      const data = await response.json();
      if (data.success) {
        setAvailableServices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching additional services:', error);
    } finally {
      setLoading(false);
    }
  };

  const isServiceSelected = (serviceId: number) => {
    return selectedServices.some(s => s.service_id === serviceId);
  };

  const getServiceQuantity = (serviceId: number) => {
    const service = selectedServices.find(s => s.service_id === serviceId);
    return service?.quantity || 1;
  };

  const toggleService = (serviceId: number) => {
    if (isServiceSelected(serviceId)) {
      // Remove service
      onChange(selectedServices.filter(s => s.service_id !== serviceId));
    } else {
      // Add service
      onChange([...selectedServices, { service_id: serviceId, quantity: 1 }]);
    }
  };

  const updateQuantity = (serviceId: number, quantity: number) => {
    onChange(
      selectedServices.map(s =>
        s.service_id === serviceId ? { ...s, quantity: Math.max(1, quantity) } : s
      )
    );
  };

  const calculateTotal = () => {
    return selectedServices.reduce((total, selected) => {
      const service = availableServices.find(s => s.id === selected.service_id);
      return total + (service ? service.price * selected.quantity : 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">✨ Additional Services</h2>
        <p className="text-gray-600">Loading services...</p>
      </div>
    );
  }

  if (!availableServices || availableServices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">✨ Additional Services</h2>
        <p className="text-gray-600">
          No additional services available. <a href="/admin/additional-services" className="text-[#8B1538] hover:underline font-bold">Manage services</a>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">✨ Additional Services</h2>
        <a
          href="/admin/additional-services"
          target="_blank"
          className="text-sm text-[#8B1538] hover:underline font-bold"
        >
          Manage Services →
        </a>
      </div>

      <div className="space-y-3">
        {availableServices.map((service) => {
          const selected = isServiceSelected(service.id);
          const quantity = getServiceQuantity(service.id);

          return (
            <div
              key={service.id}
              className={`border-2 rounded-lg p-4 transition-all ${
                selected
                  ? 'border-[#8B1538] bg-[#FDF2F4]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleService(service.id)}
                    className="w-5 h-5 text-[#8B1538] rounded focus:ring-[#8B1538]"
                  />
                </label>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {service.icon} {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(service.price)}
                      </p>
                      {selected && quantity > 1 && (
                        <p className="text-sm text-gray-600">
                          Total: {formatCurrency(service.price * quantity)}
                        </p>
                      )}
                    </div>
                  </div>

                  {selected && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-sm font-bold text-gray-700">Quantity:</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(service.id, quantity - 1)}
                          disabled={quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => updateQuantity(service.id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-center border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(service.id, quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedServices.length > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-gray-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">Additional Services Total:</span>
            <span className="text-xl font-bold text-[#8B1538]">{formatCurrency(calculateTotal())}</span>
          </div>
        </div>
      )}
    </div>
  );
}

