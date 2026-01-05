'use client';

/**
 * AI Knowledge Base Chat Interface
 *
 * Public-facing chat interface for visitors to interact with the
 * Walla Walla Valley AI assistant
 */

import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

interface TripState {
  selections_count: number;
  ready_for_itinerary: boolean;
  ready_for_deposit: boolean;
}

interface BookingIntent {
  detected: boolean;
  signals: string[];
  suggestBooking: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function KBChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tripState, setTripState] = useState<TripState | null>(null);
  const [bookingIntent, setBookingIntent] = useState<BookingIntent | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Welcome to Walla Walla Valley! 🍷

I'm your personal wine country insider, here to help you discover the best of what our region has to offer.

Whether you're planning your first visit or looking for hidden gems, I can help you with:
• **Winery recommendations** tailored to your taste
• **Restaurant suggestions** from casual to fine dining
• **Custom itineraries** for any length of stay
• **Insider tips** you won't find in typical guides

What brings you to Walla Walla? Are you planning a trip, or just curious about the area?`,
          timestamp: new Date(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/kb/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.content,
          include_trip_state: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Update session ID if this is a new session
        if (!sessionId && data.data.session_id) {
          setSessionId(data.data.session_id);
        }

        // Add assistant response
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.data.message.content,
          sources: data.data.message.sources,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update trip state
        if (data.data.trip_state) {
          setTripState(data.data.trip_state);
        }

        // Check booking intent
        if (data.data.booking_intent) {
          setBookingIntent(data.data.booking_intent);
          if (data.data.booking_intent.suggestBooking) {
            // Could show a booking prompt here
          }
        }
      } else {
        // Error response
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: "I'm sorry, I encountered an issue. Please try again.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      logger.error('Chat error', { error });
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  // Render markdown-like content
  function renderContent(content: string) {
    // Simple markdown rendering
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="font-semibold mt-3 mb-1">
            {line.slice(2, -2)}
          </p>
        );
      }
      // Bold text inline
      const boldRegex = /\*\*(.+?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(/(\*\*.+?\*\*)/g);
        return (
          <p key={i} className="mb-1">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      }
      // List items
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <p key={i} className="ml-4 mb-1">
            • {line.slice(2)}
          </p>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <br key={i} />;
      }
      // Regular text
      return (
        <p key={i} className="mb-1">
          {line}
        </p>
      );
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white text-xl">
              🍷
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Walla Walla Valley Insider</h1>
              <p className="text-xs text-gray-500">Your AI Wine Country Guide</p>
            </div>
          </div>
          {tripState && tripState.selections_count > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full text-sm text-amber-800">
              <span>🧺</span>
              <span>{tripState.selections_count} in trip basket</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white shadow-sm border border-gray-100 rounded-bl-md'
                }`}
              >
                <div className={message.role === 'user' ? 'text-white' : 'text-gray-800'}>
                  {renderContent(message.content)}
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    Sources: {message.sources.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Booking Intent Banner */}
      {bookingIntent?.suggestBooking && !showBookingForm && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <p className="font-medium">Ready to make this trip happen?</p>
            </div>
            <button
              onClick={() => setShowBookingForm(true)}
              className="px-4 py-2 bg-white text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-colors"
            >
              Plan My Trip
            </button>
          </div>
        </div>
      )}

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <div className="bg-white border-t border-gray-100 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "What wineries should I visit for my first time?",
                "We're celebrating our anniversary - any suggestions?",
                "Best restaurants in downtown Walla Walla?",
                "Plan a 3-day wine trip for 2 people",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about wineries, restaurants, or plan your trip..."
                rows={1}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl hover:from-amber-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-center text-gray-400">
            Powered by AI • Information from verified local sources
          </p>
        </form>
      </div>
    </div>
  );
}

