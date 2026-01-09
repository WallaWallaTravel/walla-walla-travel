'use client';

import { InputChip } from './InputChip';

interface GroupSizeChipProps {
  value?: number;
  onChange: (value: number | undefined) => void;
}

const GROUP_OPTIONS = [
  { value: 2, label: '2' },
  { value: 4, label: '3-4' },
  { value: 6, label: '5-6' },
  { value: 8, label: '7-10' },
  { value: 12, label: '11+' },
];

export function GroupSizeChip({ value, onChange }: GroupSizeChipProps) {
  const displayValue = value
    ? GROUP_OPTIONS.find(o => o.value === value)?.label || `${value}`
    : undefined;

  return (
    <InputChip
      icon="👥"
      label="Group"
      value={displayValue ? `${displayValue} guests` : undefined}
      isSet={!!value}
      onClear={() => onChange(undefined)}
    >
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          How many guests?
        </label>
        <div className="flex flex-wrap gap-2">
          {GROUP_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                value === option.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700'
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
