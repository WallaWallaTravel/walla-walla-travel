'use client';

import React from 'react';
import type { NoteData } from '@/lib/types/proposal-detail';

interface NotesTabProps {
  notes: NoteData[];
  notesLoading: boolean;
  newNote: string;
  setNewNote: (value: string) => void;
  loadNotes: () => Promise<void>;
  sendNote: () => Promise<void>;
}

export const NotesTab = React.memo(function NotesTab({
  notes,
  notesLoading,
  newNote,
  setNewNote,
  loadNotes,
  sendNote,
}: NotesTabProps) {
  return (
    <div className="space-y-4">
      {!notes.length && !notesLoading && (
        <button
          onClick={loadNotes}
          className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          Load Notes
        </button>
      )}

      {notesLoading && (
        <div className="text-center py-8 text-gray-600">Loading notes...</div>
      )}

      {/* Notes thread */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {notes.length === 0 && !notesLoading && (
          <div className="text-center py-8">
            <p className="text-gray-600">No notes yet. Start the conversation.</p>
          </div>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className={`p-3 rounded-xl ${
              note.author_type === 'staff'
                ? 'bg-indigo-50 border border-indigo-100'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-900">
                {note.author_name}
                {note.context_type && (
                  <span className="ml-2 text-xs font-normal text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                    {note.context_type} #{note.context_id}
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-600">
                {new Date(note.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
            {!note.is_read && note.author_type === 'client' && (
              <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                New
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Send note */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendNote()}
          placeholder="Type a note..."
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          onClick={sendNote}
          disabled={!newNote.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
});
