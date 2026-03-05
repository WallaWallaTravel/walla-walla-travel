import { useEffect } from 'react';

/**
 * Calls `onEscape` when the Escape key is pressed, unless disabled.
 *
 * Extracted from the repeated pattern across all modal components:
 * - DeleteConfirmModal
 * - SendProposalModal
 * - AnnounceGuestsModal
 * - AssignmentModal
 * - ManualBookingModal
 */
export function useEscapeKey(onEscape: () => void, isDisabled?: boolean): void {
  useEffect(() => {
    if (isDisabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onEscape();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isDisabled]);
}
