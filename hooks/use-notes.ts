/**
 * useNotes Hook
 *
 * Notes tab operations: load notes, send a note.
 * Manages newNote input state internally.
 */

import { useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/utils/fetch-utils';
import { logger } from '@/lib/logger';
import type { NoteData, ToastFn } from '@/lib/types/proposal-detail';

interface UseNotesReturn {
  notes: NoteData[];
  notesLoading: boolean;
  newNote: string;
  setNewNote: (value: string) => void;
  loadNotes: () => Promise<void>;
  sendNote: () => Promise<void>;
}

export function useNotes(proposalId: string, toast: ToastFn): UseNotesReturn {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');

  const loadNotes = useCallback(async () => {
    if (!proposalId) return;
    setNotesLoading(true);
    try {
      const result = await apiGet<{ notes: NoteData[] }>(
        `/api/admin/trip-proposals/${proposalId}/notes`
      );
      if (result.success && result.data) {
        setNotes(result.data.notes || []);
      }
    } catch (error) {
      logger.error('Failed to load notes', { error });
    } finally {
      setNotesLoading(false);
    }
  }, [proposalId]);

  const sendNote = useCallback(async () => {
    if (!newNote.trim() || !proposalId) return;
    try {
      const result = await apiPost(
        `/api/admin/trip-proposals/${proposalId}/notes`,
        {
          author_name: 'Staff',
          content: newNote.trim(),
        }
      );
      if (result.success) {
        setNewNote('');
        await loadNotes();
      } else {
        toast(result.error || 'Failed to send note', 'error');
      }
    } catch (error) {
      logger.error('Failed to send note', { error });
      toast('Failed to send note', 'error');
    }
  }, [newNote, proposalId, loadNotes, toast]);

  return {
    notes,
    notesLoading,
    newNote,
    setNewNote,
    loadNotes,
    sendNote,
  };
}
