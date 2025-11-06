/**
 * Smart Time Input Hook
 * 
 * Manages state and logic for the SmartTimeInput component
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  parseTime, 
  parseISOTime, 
  togglePeriod as togglePeriodUtil,
  type ParsedTime, 
  type ServiceType 
} from '@/lib/utils/timeParser';

export interface UseSmartTimeInputOptions {
  initialValue?: string;                  // ISO time string (HH:MM:SS) or empty
  serviceType?: ServiceType;
  onChange?: (isoTime: string) => void;
}

export function useSmartTimeInput(options: UseSmartTimeInputOptions = {}) {
  const { initialValue, serviceType, onChange } = options;

  const [rawInput, setRawInput] = useState('');
  const [parsedTime, setParsedTime] = useState<ParsedTime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize from ISO time if provided
  useEffect(() => {
    if (initialValue && !rawInput) {
      const parsed = parseISOTime(initialValue);
      if (parsed) {
        setParsedTime(parsed);
        // Don't set rawInput on mount - let user type fresh
      }
    }
  }, [initialValue, rawInput]);

  const handleInput = useCallback((input: string) => {
    setRawInput(input);

    if (!input || input.trim() === '') {
      setParsedTime(null);
      setError(null);
      onChange?.('');
      return;
    }

    // Parse the input
    const parsed = parseTime(input, { serviceType });
    
    if (parsed) {
      setParsedTime(parsed);
      setError(null);
      onChange?.(parsed.iso);
    } else {
      setParsedTime(null);
      setError('Invalid time format');
      onChange?.('');
    }
  }, [serviceType, onChange]);

  const togglePeriod = useCallback(() => {
    if (parsedTime) {
      const toggled = togglePeriodUtil(parsedTime);
      setParsedTime(toggled);
      onChange?.(toggled.iso);
    }
  }, [parsedTime, onChange]);

  const clear = useCallback(() => {
    setRawInput('');
    setParsedTime(null);
    setError(null);
    onChange?.('');
  }, [onChange]);

  const setFocused = useCallback((focused: boolean) => {
    setIsFocused(focused);
  }, []);

  return {
    rawInput,
    parsedTime,
    error,
    isFocused,
    handleInput,
    togglePeriod,
    clear,
    setFocused,
    formattedTime: parsedTime ? parsedTime.formatted : '',
    isoTime: parsedTime ? parsedTime.iso : '',
    isValid: parsedTime !== null && error === null
  };
}

