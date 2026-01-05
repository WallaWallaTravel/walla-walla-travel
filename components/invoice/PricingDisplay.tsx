'use client';

/**
 * Pricing Display Components
 * Shows pricing for the three actual Walla Walla Travel models:
 * 1. Hourly Tours - tiered by guest count + day of week
 * 2. Fixed Rate Private Tours - negotiated flat rate
 * 3. Shared Group Tours - per-person ticketed
 */

import { useMemo } from 'react';
import {
  calculateHourlyTourPrice,
  calculateSharedTourPrice,
  calculateFixedTourPrice,
  formatPrice,
  formatDayType,
  isSharedTourDay,
  HOURLY_WINE_TOUR_RATES,
  SHARED_TOUR_RATES,
} from '@/lib/types/pricing-models';

// ============================================================================
// HOURLY TOUR PRICING DISPLAY
// ============================================================================

interface HourlyTourPricingProps {
  guestCount: number;
  hours: number;
  date: Date | string;
  showBreakdown?: boolean;
}

export function HourlyTourPricing({
  guestCount,
  hours,
  date,
  showBreakdown = true,
}: HourlyTourPricingProps) {
  const pricing = useMemo(
    () => calculateHourlyTourPrice(guestCount, hours, date),
    [guestCount, hours, date]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Wine Tour Pricing</h4>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {formatDayType(pricing.dayType)} Rate
        </span>
      </div>

      {showBreakdown && (
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between text-gray-600">
            <span>{pricing.tierName}</span>
            <span>{formatPrice(pricing.hourlyRate)}/hour</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>
              Duration
              {pricing.billableHours > pricing.hours && (
                <span className="text-xs text-amber-600 ml-1">
                  (min {pricing.billableHours} hrs)
                </span>
              )}
            </span>
            <span>{pricing.billableHours} hours</span>
          </div>
          <div className="flex justify-between font-medium text-gray-800 pt-2 border-t">
            <span>Subtotal</span>
            <span>{formatPrice(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax (8.9%)</span>
            <span>{formatPrice(pricing.tax)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
        <span className="font-bold text-gray-900">Total</span>
        <span className="text-xl font-bold text-blue-600">{formatPrice(pricing.total)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED TOUR PRICING DISPLAY
// ============================================================================

interface SharedTourPricingProps {
  ticketCount: number;
  includesLunch?: boolean;
  date?: Date | string;
  showBreakdown?: boolean;
}

export function SharedTourPricing({
  ticketCount,
  includesLunch = true,
  date,
  showBreakdown = true,
}: SharedTourPricingProps) {
  const pricing = useMemo(
    () => calculateSharedTourPrice(ticketCount, includesLunch),
    [ticketCount, includesLunch]
  );

  const isValidDay = date ? isSharedTourDay(date) : true;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Shared Tour Tickets</h4>
        <span
          className={`text-sm px-2 py-1 rounded ${
            includesLunch
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {includesLunch ? 'With Lunch' : 'Tour Only'}
        </span>
      </div>

      {!isValidDay && date && (
        <div className="bg-amber-50 text-amber-800 text-sm p-2 rounded mb-3">
          Shared tours are only available Sun-Wed
        </div>
      )}

      {showBreakdown && (
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between text-gray-600">
            <span>Per person rate</span>
            <span>{formatPrice(pricing.perPersonRate)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tickets</span>
            <span>× {ticketCount}</span>
          </div>
          <div className="flex justify-between font-medium text-gray-800 pt-2 border-t">
            <span>Subtotal</span>
            <span>{formatPrice(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax (8.9%)</span>
            <span>{formatPrice(pricing.tax)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
        <span className="font-bold text-gray-900">Total</span>
        <span className="text-xl font-bold text-green-600">{formatPrice(pricing.total)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// FIXED RATE PRICING DISPLAY
// ============================================================================

interface FixedTourPricingProps {
  description: string;
  fixedAmount: number;
  showBreakdown?: boolean;
}

export function FixedTourPricing({
  description,
  fixedAmount,
  showBreakdown = true,
}: FixedTourPricingProps) {
  const pricing = useMemo(
    () => calculateFixedTourPrice(description, fixedAmount),
    [description, fixedAmount]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Private Tour</h4>
        <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
          Custom Rate
        </span>
      </div>

      {showBreakdown && (
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between text-gray-600">
            <span className="flex-1 mr-4">{description}</span>
            <span>{formatPrice(pricing.fixedAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600 pt-2 border-t">
            <span>Tax (8.9%)</span>
            <span>{formatPrice(pricing.tax)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
        <span className="font-bold text-gray-900">Total</span>
        <span className="text-xl font-bold text-purple-600">{formatPrice(pricing.total)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// RATE CARD DISPLAY (for showing available rates)
// ============================================================================

interface RateCardProps {
  showWineTours?: boolean;
  showSharedTours?: boolean;
  showTransfers?: boolean;
}

export function RateCard({
  showWineTours = true,
  showSharedTours = true,
  showTransfers: _showTransfers = false,
}: RateCardProps) {
  const tiers = ['1-2', '3-4', '5-6', '7-8', '9-11', '12-14'] as const;

  return (
    <div className="space-y-6">
      {showWineTours && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
            <h3 className="font-semibold text-blue-900">Private Wine Tour Rates</h3>
            <p className="text-sm text-blue-700">Hourly rates based on group size</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Guests</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Sun-Wed</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Thu-Sat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tiers.map((tier) => (
                  <tr key={tier} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-800">{tier}</td>
                    <td className="px-4 py-2 text-right text-gray-800">
                      {formatPrice(HOURLY_WINE_TOUR_RATES.sun_wed[tier])}/hr
                    </td>
                    <td className="px-4 py-2 text-right text-gray-800">
                      {formatPrice(HOURLY_WINE_TOUR_RATES.thu_sat[tier])}/hr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
            {HOURLY_WINE_TOUR_RATES.sun_wed.minimumHours} hour minimum (Sun-Wed) / {HOURLY_WINE_TOUR_RATES.thu_sat.minimumHours} hour minimum (Thu-Sat)
          </div>
        </div>
      )}

      {showSharedTours && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-green-100">
            <h3 className="font-semibold text-green-900">Shared Tour Tickets</h3>
            <p className="text-sm text-green-700">Join a group tour (Sun-Wed only)</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{SHARED_TOUR_RATES.base.name}</p>
                <p className="text-sm text-gray-500">Tour experience only</p>
              </div>
              <span className="text-lg font-bold text-green-600">
                {formatPrice(SHARED_TOUR_RATES.base.perPersonRate)}/person
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <div>
                <p className="font-medium text-gray-800">{SHARED_TOUR_RATES.withLunch.name}</p>
                <p className="text-sm text-gray-500">Includes lunch at local restaurant</p>
              </div>
              <span className="text-lg font-bold text-green-600">
                {formatPrice(SHARED_TOUR_RATES.withLunch.perPersonRate)}/person
              </span>
            </div>
          </div>
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
            Available {SHARED_TOUR_RATES.availableDays.join(', ')} | Max {SHARED_TOUR_RATES.maxGuests} guests
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUICK QUOTE CALCULATOR
// ============================================================================

interface QuickQuoteProps {
  tourType: 'hourly' | 'shared' | 'fixed';
  guestCount: number;
  hours?: number;
  date?: Date | string;
  includesLunch?: boolean;
  fixedAmount?: number;
  fixedDescription?: string;
}

export function QuickQuote({
  tourType,
  guestCount,
  hours = 6,
  date = new Date(),
  includesLunch = true,
  fixedAmount = 0,
  fixedDescription = 'Private Wine Tour',
}: QuickQuoteProps) {
  switch (tourType) {
    case 'hourly':
      return <HourlyTourPricing guestCount={guestCount} hours={hours} date={date} />;
    case 'shared':
      return <SharedTourPricing ticketCount={guestCount} includesLunch={includesLunch} date={date} />;
    case 'fixed':
      return <FixedTourPricing description={fixedDescription} fixedAmount={fixedAmount} />;
    default:
      return null;
  }
}
