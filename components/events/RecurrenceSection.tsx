'use client';

import { useMemo } from 'react';
import { generateInstanceDates } from '@/lib/utils/recurrence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecurrenceRuleValue {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  days_of_week?: number[];
  day_of_month?: number;
  end_type: 'count' | 'until_date';
  count?: number;
  until_date?: string;
}

export interface RecurrenceSectionProps {
  isRecurring: boolean;
  onIsRecurringChange: (value: boolean) => void;
  recurrenceRule: RecurrenceRuleValue | null;
  onRecurrenceRuleChange: (rule: RecurrenceSectionProps['recurrenceRule']) => void;
  startDate: string; // YYYY-MM-DD
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const FREQUENCY_OPTIONS: { value: RecurrenceRuleValue['frequency']; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const MAX_VISIBLE_DATES = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse YYYY-MM-DD into a local Date. */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Format a YYYY-MM-DD string as "Mar 1, 2026". */
function formatPreviewDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Build a sensible default rule from the given start date. */
function buildDefaultRule(startDate: string): RecurrenceRuleValue {
  const date = parseLocalDate(startDate);
  return {
    frequency: 'weekly',
    days_of_week: [date.getDay()],
    end_type: 'count',
    count: 12,
  };
}

/** Human-readable label for a frequency value. */
function frequencyLabel(freq: RecurrenceRuleValue['frequency']): string {
  switch (freq) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Every 2 weeks';
    case 'monthly':
      return 'Monthly';
    default:
      return freq;
  }
}

/** Shared input class matching the admin events forms. */
const INPUT_CLASS =
  'px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecurrenceSection({
  isRecurring,
  onIsRecurringChange,
  recurrenceRule,
  onRecurrenceRuleChange,
  startDate,
  readOnly = false,
}: RecurrenceSectionProps) {
  // ---- derived values ----
  const rule = recurrenceRule;
  const isWeeklyLike = rule?.frequency === 'weekly' || rule?.frequency === 'biweekly';
  const isMonthly = rule?.frequency === 'monthly';

  // Generate preview dates when there is a valid rule and a start date.
  const previewDates = useMemo(() => {
    if (!rule || !startDate) return [];
    try {
      return generateInstanceDates(startDate, rule);
    } catch {
      return [];
    }
  }, [rule, startDate]);

  // ---- handlers ----

  function handleToggle(checked: boolean) {
    onIsRecurringChange(checked);
    if (checked) {
      // Initialize with defaults derived from startDate
      if (startDate) {
        onRecurrenceRuleChange(buildDefaultRule(startDate));
      } else {
        onRecurrenceRuleChange({
          frequency: 'weekly',
          days_of_week: [],
          end_type: 'count',
          count: 12,
        });
      }
    } else {
      onRecurrenceRuleChange(null);
    }
  }

  function updateRule(patch: Partial<RecurrenceRuleValue>) {
    if (!rule) return;
    onRecurrenceRuleChange({ ...rule, ...patch });
  }

  function handleFrequencyChange(freq: RecurrenceRuleValue['frequency']) {
    if (!rule) return;

    const next: RecurrenceRuleValue = { ...rule, frequency: freq };

    if (freq === 'monthly') {
      // Switch to monthly: pre-fill day_of_month from startDate
      const day = startDate ? Math.min(parseLocalDate(startDate).getDate(), 28) : 1;
      next.day_of_month = day;
      delete next.days_of_week;
    } else {
      // Switch to weekly/biweekly: pre-fill day_of_week from startDate
      const dow = startDate ? parseLocalDate(startDate).getDay() : 0;
      next.days_of_week = [dow];
      delete next.day_of_month;
    }

    onRecurrenceRuleChange(next);
  }

  function handleDayOfWeekToggle(dayIndex: number) {
    if (!rule) return;
    const current = rule.days_of_week || [];
    const next = current.includes(dayIndex)
      ? current.filter((d) => d !== dayIndex)
      : [...current, dayIndex].sort((a, b) => a - b);
    // Ensure at least one day stays selected
    if (next.length === 0) return;
    updateRule({ days_of_week: next });
  }

  function handleDayOfMonthChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    updateRule({ day_of_month: Math.max(1, Math.min(28, num)) });
  }

  function handleEndTypeChange(endType: 'count' | 'until_date') {
    if (!rule) return;
    if (endType === 'count') {
      onRecurrenceRuleChange({
        ...rule,
        end_type: 'count',
        count: rule.count || 12,
        until_date: undefined,
      });
    } else {
      onRecurrenceRuleChange({
        ...rule,
        end_type: 'until_date',
        until_date: rule.until_date || '',
        count: undefined,
      });
    }
  }

  function handleCountChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    updateRule({ count: Math.max(1, Math.min(52, num)) });
  }

  function handleUntilDateChange(value: string) {
    updateRule({ until_date: value });
  }

  // ---- read-only rendering ----

  if (readOnly) {
    if (!isRecurring || !rule) return null;

    const daysText =
      isWeeklyLike && rule.days_of_week && rule.days_of_week.length > 0
        ? rule.days_of_week.map((d) => DAY_LABELS[d]).join(', ')
        : null;

    const endText =
      rule.end_type === 'count' && rule.count
        ? `${rule.count} occurrences`
        : rule.end_type === 'until_date' && rule.until_date
          ? `until ${formatPreviewDate(rule.until_date)}`
          : null;

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Recurrence</h3>
        <div className="space-y-1.5 text-sm text-gray-700">
          <p>
            <span className="font-medium text-gray-900">Frequency:</span>{' '}
            {frequencyLabel(rule.frequency)}
          </p>
          {daysText && (
            <p>
              <span className="font-medium text-gray-900">Days:</span> {daysText}
            </p>
          )}
          {isMonthly && rule.day_of_month && (
            <p>
              <span className="font-medium text-gray-900">Day of month:</span> {rule.day_of_month}
            </p>
          )}
          {endText && (
            <p>
              <span className="font-medium text-gray-900">Ends:</span> {endText}
            </p>
          )}
        </div>

        {/* Preview dates in read-only mode */}
        {previewDates.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-900 mb-2">
              {previewDates.length} event{previewDates.length !== 1 ? 's' : ''}:
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
              {previewDates.slice(0, MAX_VISIBLE_DATES).map((d) => (
                <li key={d} className="text-sm text-gray-700">
                  {formatPreviewDate(d)}
                </li>
              ))}
            </ul>
            {previewDates.length > MAX_VISIBLE_DATES && (
              <p className="mt-1.5 text-sm text-gray-600">
                +{previewDates.length - MAX_VISIBLE_DATES} more
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- editable rendering ----

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/30 cursor-pointer"
        />
        <span className="text-lg font-semibold text-gray-900">Make this a recurring event</span>
      </label>

      {/* Recurrence configuration (visible when toggled on) */}
      {isRecurring && rule && (
        <div className="mt-5 space-y-5">
          {/* Frequency */}
          <div>
            <label htmlFor="recurrence-frequency" className="block text-sm font-medium text-gray-900 mb-1">
              Frequency
            </label>
            <select
              id="recurrence-frequency"
              value={rule.frequency}
              onChange={(e) =>
                handleFrequencyChange(e.target.value as RecurrenceRuleValue['frequency'])
              }
              className={`w-full sm:w-64 ${INPUT_CLASS} bg-white`}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Days of week (weekly / biweekly) */}
          {isWeeklyLike && (
            <fieldset>
              <legend className="block text-sm font-medium text-gray-900 mb-2">
                Days of the week
              </legend>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, index) => {
                  const selected = rule.days_of_week?.includes(index) ?? false;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleDayOfWeekToggle(index)}
                      aria-pressed={selected}
                      className={`
                        w-11 h-11 rounded-lg text-sm font-medium transition-colors
                        focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30
                        ${
                          selected
                            ? 'bg-[#1E3A5F] text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Day of month (monthly) */}
          {isMonthly && (
            <div>
              <label htmlFor="recurrence-day-of-month" className="block text-sm font-medium text-gray-900 mb-1">
                Day of month (1-28)
              </label>
              <input
                id="recurrence-day-of-month"
                type="number"
                min={1}
                max={28}
                value={rule.day_of_month ?? 1}
                onChange={(e) => handleDayOfMonthChange(e.target.value)}
                className={`w-24 ${INPUT_CLASS}`}
              />
            </div>
          )}

          {/* End condition */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-900 mb-2">Ends</legend>
            <div className="space-y-3">
              {/* After N occurrences */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence-end-type"
                  checked={rule.end_type === 'count'}
                  onChange={() => handleEndTypeChange('count')}
                  className="w-4 h-4 text-[#1E3A5F] border-gray-300 focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
                <span className="text-sm text-gray-700">After</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={rule.end_type === 'count' ? (rule.count ?? 12) : 12}
                  onChange={(e) => handleCountChange(e.target.value)}
                  disabled={rule.end_type !== 'count'}
                  className={`w-20 ${INPUT_CLASS} ${
                    rule.end_type !== 'count' ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                  }`}
                />
                <span className="text-sm text-gray-700">occurrences</span>
              </label>

              {/* On date */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence-end-type"
                  checked={rule.end_type === 'until_date'}
                  onChange={() => handleEndTypeChange('until_date')}
                  className="w-4 h-4 text-[#1E3A5F] border-gray-300 focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
                <span className="text-sm text-gray-700">On date</span>
                <input
                  type="date"
                  value={rule.end_type === 'until_date' ? (rule.until_date ?? '') : ''}
                  onChange={(e) => handleUntilDateChange(e.target.value)}
                  disabled={rule.end_type !== 'until_date'}
                  min={startDate || undefined}
                  className={`${INPUT_CLASS} ${
                    rule.end_type !== 'until_date' ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                  }`}
                />
              </label>
            </div>
          </fieldset>

          {/* Preview */}
          {previewDates.length > 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                {previewDates.length} event{previewDates.length !== 1 ? 's' : ''} will be created:
              </p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                {previewDates.slice(0, MAX_VISIBLE_DATES).map((d) => (
                  <li key={d} className="text-sm text-gray-700">
                    {formatPreviewDate(d)}
                  </li>
                ))}
              </ul>
              {previewDates.length > MAX_VISIBLE_DATES && (
                <p className="mt-1.5 text-sm text-gray-600">
                  +{previewDates.length - MAX_VISIBLE_DATES} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
