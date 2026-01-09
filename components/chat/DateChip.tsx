'use client';

import { useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import { InputChip } from './InputChip';
import 'react-day-picker/style.css';

interface DateChipProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function DateChip({ value, onChange }: DateChipProps) {
  const [isFlexible, setIsFlexible] = useState(value === 'Flexible');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      if (range.to && range.from.getTime() !== range.to.getTime()) {
        // Date range: "Mar 15-17, 2026"
        const fromStr = format(range.from, 'MMM d');
        const toStr = format(range.to, 'd, yyyy');
        onChange(`${fromStr}-${toStr}`);
      } else {
        // Single date: "Mar 15, 2026"
        onChange(format(range.from, 'MMM d, yyyy'));
      }
    }
  };

  const handleFlexibleChange = (checked: boolean) => {
    setIsFlexible(checked);
    if (checked) {
      setDateRange(undefined);
      onChange('Flexible');
    } else {
      onChange(undefined);
    }
  };

  const handleClear = () => {
    setDateRange(undefined);
    setIsFlexible(false);
    onChange(undefined);
  };

  // Disable dates before today
  const disabledDays = { before: new Date() };

  return (
    <InputChip
      icon="📅"
      label="When"
      value={value}
      isSet={!!value}
      onClear={handleClear}
    >
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer pb-2 border-b border-gray-100">
          <input
            type="checkbox"
            checked={isFlexible}
            onChange={(e) => handleFlexibleChange(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">I&apos;m flexible on dates</span>
        </label>

        {!isFlexible && (
          <div className="rdp-wrapper">
            <style>{`
              .rdp-wrapper .rdp {
                --rdp-accent-color: #9333ea;
                --rdp-accent-background-color: #f3e8ff;
                font-size: 14px;
              }
              .rdp-wrapper .rdp-month {
                width: 280px;
              }
              .rdp-wrapper .rdp-day_button {
                width: 36px;
                height: 36px;
                border-radius: 6px;
              }
              .rdp-wrapper .rdp-day_button:hover {
                background-color: #f3e8ff;
              }
              .rdp-wrapper .rdp-selected .rdp-day_button {
                background-color: #9333ea;
                color: white;
              }
              .rdp-wrapper .rdp-range_middle .rdp-day_button {
                background-color: #f3e8ff;
                color: #6b21a8;
                border-radius: 0;
              }
              .rdp-wrapper .rdp-today .rdp-day_button {
                font-weight: bold;
                color: #9333ea;
              }
              .rdp-wrapper .rdp-disabled .rdp-day_button {
                color: #d1d5db;
              }
            `}</style>
            <DayPicker
              mode="range"
              selected={dateRange}
              onSelect={handleRangeSelect}
              disabled={disabledDays}
              numberOfMonths={1}
              defaultMonth={dateRange?.from || addDays(new Date(), 7)}
              showOutsideDays
            />
          </div>
        )}

        {dateRange?.from && !isFlexible && (
          <div className="text-center text-sm text-gray-600 pt-2 border-t border-gray-100">
            {dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
              <span>
                <strong>{format(dateRange.from, 'MMM d')}</strong> to{' '}
                <strong>{format(dateRange.to, 'MMM d, yyyy')}</strong>
              </span>
            ) : (
              <span>
                <strong>{format(dateRange.from, 'MMM d, yyyy')}</strong>
              </span>
            )}
          </div>
        )}

        {!dateRange?.from && !isFlexible && (
          <p className="text-xs text-gray-500 text-center">
            Click a date or drag to select a range
          </p>
        )}
      </div>
    </InputChip>
  );
}
