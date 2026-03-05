'use client';

/**
 * useFormState Hook
 *
 * Consolidates the common error/saving/success state pattern found across
 * many form components. Instead of declaring three separate useState calls
 * in every form, use this hook for a consistent interface with helper methods.
 *
 * @example
 * ```tsx
 * const { error, saving, success, startSaving, finishSaving, reset } = useFormState();
 *
 * async function handleSubmit() {
 *   startSaving();
 *   try {
 *     await saveData();
 *     finishSaving();
 *   } catch (err) {
 *     finishSaving(err instanceof Error ? err.message : 'Something went wrong');
 *   }
 * }
 * ```
 */

import { useState, useCallback } from 'react';

export function useFormState() {
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setError('');
    setSaving(false);
    setSuccess(false);
  }, []);

  const startSaving = useCallback(() => {
    setError('');
    setSaving(true);
    setSuccess(false);
  }, []);

  const finishSaving = useCallback((err?: string) => {
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  }, []);

  return {
    error,
    setError,
    saving,
    setSaving,
    success,
    setSuccess,
    reset,
    startSaving,
    finishSaving,
  };
}
