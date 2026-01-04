/**
 * Proposal Form Hook
 *
 * @module app/admin/proposals/new/hooks/useProposalForm
 * @description Custom hook for managing proposal form state and logic.
 * Centralizes form state management, service item operations, and pricing calculations.
 *
 * @example
 * ```tsx
 * const {
 *   formData,
 *   updateFormData,
 *   addServiceItem,
 *   updateServiceItem,
 *   removeServiceItem,
 *   calculateTotals,
 *   saving,
 *   submitProposal
 * } = useProposalForm();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import type { ServiceItem, ProposalData, PricingStrategy, Winery, AdditionalService, PriceCalculation } from '../types';
import { calculateWineTourPrice, calculateTransferPrice, calculateWaitTimePrice, calculateTax, calculateDeposit } from '@/lib/rate-config';

/**
 * Initial form state
 */
const getInitialFormData = (): ProposalData => ({
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

/**
 * Service type display names
 */
const SERVICE_NAMES: Record<string, string> = {
  wine_tour: 'Wine Tour',
  airport_transfer: 'Airport Transfer',
  local_transfer: 'Local Transfer',
  regional_transfer: 'Regional Transfer',
  wait_time: 'Wait Time',
  custom: 'Custom Service',
};

/**
 * Custom hook for proposal form management
 */
export function useProposalForm() {
  const [formData, setFormData] = useState<ProposalData>(getInitialFormData);
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
  const [saving, setSaving] = useState(false);
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>('standard');
  const [showPriceRange, setShowPriceRange] = useState(true);

  // Initialize valid until date
  useEffect(() => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    setFormData(prev => ({
      ...prev,
      valid_until: validUntil.toISOString().split('T')[0],
    }));
  }, []);

  // Load wineries
  useEffect(() => {
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
    loadWineries();
  }, []);

  // Load additional services
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch('/api/additional-services?active=true');
        const result = await response.json();
        if (result.success) {
          setAdditionalServices(result.data || []);
        }
      } catch (error) {
        console.error('Failed to load additional services:', error);
      }
    };
    loadServices();
  }, []);

  /**
   * Get service display name
   */
  const getServiceName = useCallback((type: string): string => {
    return SERVICE_NAMES[type] || 'Service';
  }, []);

  /**
   * Calculate service price (fallback)
   */
  const calculateServicePrice = useCallback((item: ServiceItem): number => {
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
  }, []);

  /**
   * Fetch dynamic pricing from API
   */
  const fetchDynamicPrice = useCallback(async (item: ServiceItem): Promise<number> => {
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
          applyModifiers: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.finalPrice;
      }
    } catch (error) {
      console.error('Dynamic pricing fetch failed:', error);
    }

    return calculateServicePrice(item);
  }, [calculateServicePrice]);

  /**
   * Add a new service item
   */
  const addServiceItem = useCallback(async (type: ServiceItem['service_type']) => {
    const newItem: ServiceItem = {
      id: `service-${Date.now()}`,
      service_type: type,
      name: getServiceName(type),
      description: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      party_size: 4,
      pricing_type: type === 'wine_tour' ? 'calculated' : type === 'wait_time' ? 'hourly' : 'flat',
      calculated_price: 0,
    };

    // Type-specific defaults
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

    // Fetch dynamic price
    try {
      newItem.calculated_price = await fetchDynamicPrice(newItem);
    } catch {
      newItem.calculated_price = calculateServicePrice(newItem);
    }

    setFormData(prev => ({
      ...prev,
      service_items: [...prev.service_items, newItem],
    }));
  }, [getServiceName, fetchDynamicPrice, calculateServicePrice]);

  /**
   * Update a service item
   */
  const updateServiceItem = useCallback(async (id: string, updates: Partial<ServiceItem>) => {
    const shouldRefreshPrice =
      updates.duration_hours !== undefined ||
      updates.party_size !== undefined ||
      updates.date !== undefined ||
      updates.transfer_type !== undefined ||
      updates.wait_hours !== undefined;

    setFormData(prev => ({
      ...prev,
      service_items: prev.service_items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));

    if (shouldRefreshPrice) {
      const item = formData.service_items.find(i => i.id === id);
      if (item) {
        const updatedItem = { ...item, ...updates };
        try {
          const dynamicPrice = await fetchDynamicPrice(updatedItem);
          setFormData(prev => ({
            ...prev,
            service_items: prev.service_items.map(i =>
              i.id === id ? { ...i, calculated_price: dynamicPrice } : i
            ),
          }));
        } catch {
          const fallbackPrice = calculateServicePrice(updatedItem);
          setFormData(prev => ({
            ...prev,
            service_items: prev.service_items.map(i =>
              i.id === id ? { ...i, calculated_price: fallbackPrice } : i
            ),
          }));
        }
      }
    }
  }, [formData.service_items, fetchDynamicPrice, calculateServicePrice]);

  /**
   * Remove a service item
   */
  const removeServiceItem = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      service_items: prev.service_items.filter(item => item.id !== id),
    }));
  }, []);

  /**
   * Update form data
   */
  const updateFormData = useCallback((updates: Partial<ProposalData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Calculate all totals
   */
  const calculateTotals = useCallback((): PriceCalculation => {
    const servicesSubtotal = formData.service_items.reduce(
      (sum, item) => sum + item.calculated_price,
      0
    );

    const additionalServicesTotal = (formData.additional_services || []).reduce((sum, selected) => {
      const service = additionalServices.find(s => s.id === selected.service_id);
      return sum + (service ? service.price * selected.quantity : 0);
    }, 0);

    const subtotal = servicesSubtotal + additionalServicesTotal;
    const discountAmount = (subtotal * formData.discount_percentage) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxes = calculateTax(subtotalAfterDiscount);
    const gratuityAmount = formData.include_gratuity_request
      ? (subtotalAfterDiscount * formData.suggested_gratuity_percentage) / 100
      : 0;
    const total = subtotalAfterDiscount + taxes + gratuityAmount;
    const depositAmount = calculateDeposit(total);

    return {
      servicesSubtotal,
      additionalServicesTotal,
      discountAmount,
      subtotalAfterDiscount,
      taxes,
      gratuityAmount,
      total,
      depositAmount,
    };
  }, [formData, additionalServices]);

  return {
    // State
    formData,
    wineries,
    additionalServices,
    saving,
    pricingStrategy,
    showPriceRange,

    // Setters
    setFormData,
    setSaving,
    setPricingStrategy,
    setShowPriceRange,

    // Actions
    updateFormData,
    addServiceItem,
    updateServiceItem,
    removeServiceItem,
    calculateTotals,
    calculateServicePrice,
    getServiceName,
  };
}

export default useProposalForm;
