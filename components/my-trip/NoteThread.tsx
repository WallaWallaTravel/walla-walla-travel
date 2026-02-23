'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ProposalNote } from '@/lib/types/proposal-notes';

interface NoteThreadProps {
  notes: ProposalNote[];
  onSendNote: (content: string) => Promise<void>;
  isReadOnly?: boolean;
  compact?: boolean;
  authorName?: string;
}

/**
 * Formats a date string into a human-readable relative timestamp.
 * Shows "just now", "Xm ago", "Xh ago", "yesterday", or the date.
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function NoteThread({
  notes,
  onSendNote,
  isReadOnly = false,
  compact = false,
  authorName = '',
}: NoteThreadProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when notes change
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [notes, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSendNote(trimmed);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const containerHeight = compact ? 'max-h-64' : 'max-h-[480px]';
  const padding = compact ? 'p-3' : 'p-4';

  return (
    <div
      className={`flex flex-col ${
        compact
          ? 'h-full'
          : 'bg-white rounded-xl border border-gray-200 shadow-sm h-full'
      }`}
    >
      {/* Messages area */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto ${compact ? '' : containerHeight} ${padding} space-y-3`}
      >
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="w-10 h-10 text-gray-500 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
              />
            </svg>
            <p className="text-gray-700 text-sm font-medium">No messages yet</p>
            <p className="text-gray-600 text-xs mt-1">
              {isReadOnly
                ? 'No messages in this conversation.'
                : 'Send a message to start the conversation.'}
            </p>
          </div>
        )}

        {notes.map((note) => {
          const isClient = note.author_type === 'client';
          return (
            <div
              key={note.id}
              className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] ${compact ? 'max-w-[85%]' : ''}`}
              >
                {/* Author name */}
                <p
                  className={`text-xs font-medium mb-1 ${
                    isClient ? 'text-right text-gray-600' : 'text-left text-gray-600'
                  }`}
                >
                  {note.author_name}
                </p>
                {/* Message bubble */}
                <div
                  className={`rounded-xl p-3 ${
                    isClient
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      isClient ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {note.content}
                  </p>
                </div>
                {/* Timestamp */}
                <p
                  className={`text-xs mt-1 ${
                    isClient ? 'text-right text-gray-500' : 'text-left text-gray-500'
                  }`}
                >
                  {formatRelativeTime(note.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      {!isReadOnly && (
        <div className={`border-t border-gray-200 ${padding}`}>
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                authorName
                  ? `Message as ${authorName}...`
                  : 'Type a message...'
              }
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              {sending ? (
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                  />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Press Enter to send, Shift+Enter for a new line
          </p>
        </div>
      )}

      {/* Read-only banner */}
      {isReadOnly && notes.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-600 text-center">
            This conversation is read-only. Your trip has been finalized.
          </p>
        </div>
      )}
    </div>
  );
}
