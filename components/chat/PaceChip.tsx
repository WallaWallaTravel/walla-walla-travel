'use client';

import { InputChip } from './InputChip';

interface PaceChipProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

const PACE_OPTIONS = [
  { value: 'standard', label: 'Standard (Recommended)', description: '3 wineries, perfectly paced' },
  { value: 'full-day', label: 'Full Day', description: '4 wineries, maximize your visit' },
];

export function PaceChip({ value, onChange }: PaceChipProps) {
  return (
    <InputChip
      icon="⏱️"
      label="Pace"
      value={value ? `${value.charAt(0).toUpperCase() + value.slice(1)} pace` : undefined}
      isSet={!!value}
      onClear={() => onChange(undefined)}
    >
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          What pace works for you?
        </label>
        <div className="space-y-2">
          {PACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                value === option.value
                  ? 'bg-purple-100 border-2 border-purple-300'
                  : 'bg-gray-50 border-2 border-transparent hover:border-purple-200'
              }`}
            >
              <div className="font-medium text-sm text-gray-900">{option.label}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
    </InputChip>
  );
}
