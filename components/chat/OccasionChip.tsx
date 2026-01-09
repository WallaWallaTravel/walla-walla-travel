'use client';

import { InputChip } from './InputChip';

interface OccasionChipProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

const OCCASION_OPTIONS = [
  { value: 'Anniversary', label: '💕 Anniversary' },
  { value: 'Birthday', label: '🎂 Birthday' },
  { value: 'Corporate', label: '💼 Corporate' },
  { value: 'Girls Trip', label: '👯 Girls Trip' },
  { value: 'Guys Trip', label: '🍻 Guys Trip' },
  { value: 'Bachelorette', label: '💍 Bachelorette' },
  { value: 'Just for Fun', label: '🎉 Just for Fun' },
];

export function OccasionChip({ value, onChange }: OccasionChipProps) {
  return (
    <InputChip
      icon="🎉"
      label="Occasion"
      value={value}
      isSet={!!value}
      onClear={() => onChange(undefined)}
    >
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          What's the occasion?
        </label>
        <div className="space-y-1">
          {OCCASION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                value === option.value
                  ? 'bg-purple-100 text-purple-800'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </InputChip>
  );
}
