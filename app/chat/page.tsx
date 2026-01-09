'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DateChip } from '@/components/chat/DateChip';
import { GroupSizeChip } from '@/components/chat/GroupSizeChip';
import { OccasionChip } from '@/components/chat/OccasionChip';
import { PaceChip } from '@/components/chat/PaceChip';

// ============================================================================
// Types
// ============================================================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TripTags {
  partySize?: number;
  dates?: string;
  occasion?: string;
  winePreferences?: string[];
  pace?: string;
  wineriesMentioned?: string[];
  hasLodgingNeeds?: boolean;
  hasTransportNeeds?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// Conversation starters that send to AI
const CONVERSATION_STARTERS = [
  { text: "I'd like to explore different wine styles", icon: "🍷", label: "Wine style" },
  { text: "This is my first time visiting Walla Walla!", icon: "🗺️", label: "First timer" },
  { text: "I'd love to meet some winemakers if possible", icon: "🤝", label: "Winemakers" },
];

const VISITOR_ID_KEY = 'walla_visitor_id';
const STORAGE_KEY = 'walla-walla-trip-tags';

// ============================================================================
// Visitor ID Management
// ============================================================================

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `visitor_${crypto.randomUUID()}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTagLabel(key: string, value: unknown): string {
  switch (key) {
    case 'partySize':
      return `${value} guests`;
    case 'dates':
      return String(value);
    case 'occasion':
      return String(value);
    case 'pace':
      return `${value} pace`;
    case 'winePreferences':
      return (value as string[]).join(', ');
    case 'wineriesMentioned':
      return (value as string[]).join(', ');
    case 'hasLodgingNeeds':
      return 'Needs lodging';
    case 'hasTransportNeeds':
      return 'Needs transport';
    default:
      return String(value);
  }
}

function getTagIcon(key: string): string {
  switch (key) {
    case 'partySize': return '👥';
    case 'dates': return '📅';
    case 'occasion': return '🎉';
    case 'pace': return '⏱️';
    case 'winePreferences': return '🍷';
    case 'wineriesMentioned': return '🏠';
    case 'hasLodgingNeeds': return '🛏️';
    case 'hasTransportNeeds': return '🚐';
    default: return '📌';
  }
}

// ============================================================================
// Components
// ============================================================================

function TripTag({
  tagKey,
  value,
  onRemove
}: {
  tagKey: string;
  value: unknown;
  onRemove: () => void;
}) {
  if (typeof value === 'boolean' && !value) return null;
  if (Array.isArray(value) && value.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium group">
      <span>{getTagIcon(tagKey)}</span>
      <span>{formatTagLabel(tagKey, value)}</span>
      <button
        onClick={onRemove}
        className="ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-purple-200 text-purple-600 opacity-60 group-hover:opacity-100 transition-opacity"
        title="Remove"
      >
        ×
      </button>
    </span>
  );
}

function ConversationStarter({
  icon,
  label,
  onClick,
  disabled
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// Session Types
// ============================================================================

interface SessionData {
  session: {
    id: string;
    visitor_id: string;
    message_count: number;
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;
  tripState: {
    partySize?: number;
    dates?: string;
    occasion?: string;
    pace?: string;
    winePreferences?: string[];
  } | null;
  isReturningVisitor: boolean;
  previousContext?: {
    partySize?: number;
    occasion?: string;
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<TripTags>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Session persistence state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isReturningVisitor, setIsReturningVisitor] = useState(false);
  const [welcomeBackShown, setWelcomeBackShown] = useState(false);

  // Load or create session from database on mount
  useEffect(() => {
    async function loadSession() {
      setIsSessionLoading(true);
      try {
        const visitorId = getOrCreateVisitorId();
        if (!visitorId) {
          setIsSessionLoading(false);
          return;
        }

        const response = await fetch(`/api/chat/session?visitor_id=${encodeURIComponent(visitorId)}`);
        const data = await response.json();

        if (data.success) {
          const sessionData = data.data as SessionData;

          // Set session ID
          setSessionId(sessionData.session.id);

          // Restore messages
          if (sessionData.messages && sessionData.messages.length > 0) {
            setMessages(sessionData.messages.map(m => ({
              role: m.role,
              content: m.content,
            })));
          }

          // Restore trip state
          if (sessionData.tripState) {
            setTags(prev => ({
              ...prev,
              ...(sessionData.tripState?.partySize && { partySize: sessionData.tripState.partySize }),
              ...(sessionData.tripState?.dates && { dates: sessionData.tripState.dates }),
              ...(sessionData.tripState?.occasion && { occasion: sessionData.tripState.occasion }),
              ...(sessionData.tripState?.pace && { pace: sessionData.tripState.pace }),
              ...(sessionData.tripState?.winePreferences && { winePreferences: sessionData.tripState.winePreferences }),
            }));
          }

          // Check if returning visitor
          setIsReturningVisitor(sessionData.isReturningVisitor && sessionData.session.message_count > 0);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        // Fall back to localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            setTags(JSON.parse(saved));
          } catch {
            // Ignore parse errors
          }
        }
      } finally {
        setIsSessionLoading(false);
      }
    }

    loadSession();
  }, []);

  // Save tags to localStorage as backup when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  }, [tags]);

  // Update trip state in database when chips change
  const updateTripStateInDB = useCallback(async (updates: Partial<TripTags>) => {
    if (!sessionId) return;

    try {
      await fetch('/api/chat/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          ...updates,
        }),
      });
    } catch (error) {
      console.error('Failed to update trip state:', error);
    }
  }, [sessionId]);

  // Save message to database
  const saveMessageToDB = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!sessionId) return;

    try {
      await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          role,
          content,
        }),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = messageText.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Save user message to database (fire and forget)
    saveMessageToDB('user', userMessage);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          // Send current trip context so AI can make smart recommendations
          tripContext: {
            partySize: tags.partySize,
            dates: tags.dates,
            occasion: tags.occasion,
            pace: tags.pace,
            winePreferences: tags.winePreferences,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage = data.data.message;
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

        // Save assistant message to database (fire and forget)
        saveMessageToDB('assistant', assistantMessage);

        // Merge new tags with existing
        if (data.data.tags) {
          setTags(prev => {
            const merged = { ...prev };
            for (const [key, value] of Object.entries(data.data.tags)) {
              if (value !== undefined && value !== null) {
                if (Array.isArray(value) && Array.isArray(merged[key as keyof TripTags])) {
                  const existing = merged[key as keyof TripTags] as string[];
                  merged[key as keyof TripTags] = [...new Set([...existing, ...(value as string[])])] as never;
                } else if (value !== false && (Array.isArray(value) ? value.length > 0 : true)) {
                  merged[key as keyof TripTags] = value as never;
                }
              }
            }
            return merged;
          });

          // Update extracted tags in database
          if (Object.keys(data.data.tags).length > 0) {
            updateTripStateInDB(data.data.tags);
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error?.message || 'Something went wrong'}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to connect to the server' }]);
    } finally {
      setIsLoading(false);
      // Re-focus the input for quick follow-up messages
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleConversationStarter = (text: string) => {
    sendMessage(text);
  };

  const removeTag = (key: keyof TripTags) => {
    setTags(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearAllTags = () => {
    setTags({});
  };

  // Get active tags (non-empty values) - excluding ones set via chips
  const aiExtractedTags = Object.entries(tags).filter(([key, value]) => {
    // These are set via input chips, don't show as separate tags
    if (['partySize', 'dates', 'occasion', 'pace'].includes(key)) return false;
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean' && !value) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col">
      <div className="max-w-2xl mx-auto p-4 w-full">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-purple-900">Walla Walla Valley Insider</h1>
          <p className="text-gray-600 mt-1">Your local wine country concierge</p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          {/* Messages */}
          <div className="overflow-y-auto p-4 space-y-4 h-[500px]">
            {/* Loading state */}
            {isSessionLoading && (
              <div className="text-center text-gray-500 py-8">
                <div className="animate-pulse">
                  <div className="text-4xl mb-3">🍷</div>
                  <p className="text-sm">Loading your conversation...</p>
                </div>
              </div>
            )}

            {/* Welcome back message for returning visitors */}
            {!isSessionLoading && isReturningVisitor && !welcomeBackShown && messages.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                <p className="text-purple-800 font-medium text-sm">
                  Welcome back! We&apos;ve saved your conversation.
                  {tags.partySize && ` Still planning for ${tags.partySize} guests`}
                  {tags.occasion && ` for a ${tags.occasion}`}?
                </p>
                <button
                  onClick={() => setWelcomeBackShown(true)}
                  className="text-purple-600 text-xs mt-2 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Empty state for new visitors */}
            {!isSessionLoading && messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-3">🍷</div>
                <p className="font-medium">Planning a Walla Walla wine trip?</p>
                <p className="text-sm mt-1 text-gray-600">
                  Tell us about your trip using the chips below, or just start chatting.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Chips Section */}
          <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3">
            {/* Row 1: Structured Input Chips */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Your trip details:</p>
              <div className="flex flex-wrap gap-2">
                <DateChip
                  value={tags.dates}
                  onChange={(v) => {
                    setTags(prev => ({ ...prev, dates: v }));
                    updateTripStateInDB({ dates: v });
                  }}
                />
                <GroupSizeChip
                  value={tags.partySize}
                  onChange={(v) => {
                    setTags(prev => ({ ...prev, partySize: v }));
                    updateTripStateInDB({ partySize: v });
                  }}
                />
                <OccasionChip
                  value={tags.occasion}
                  onChange={(v) => {
                    setTags(prev => ({ ...prev, occasion: v }));
                    updateTripStateInDB({ occasion: v });
                  }}
                />
                <PaceChip
                  value={tags.pace}
                  onChange={(v) => {
                    setTags(prev => ({ ...prev, pace: v }));
                    updateTripStateInDB({ pace: v });
                  }}
                />
              </div>
            </div>

            {/* Row 2: Conversation Starters */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Or tell us more:</p>
              <div className="flex flex-wrap gap-2">
                {CONVERSATION_STARTERS.map((starter) => (
                  <ConversationStarter
                    key={starter.label}
                    icon={starter.icon}
                    label={starter.label}
                    onClick={() => handleConversationStarter(starter.text)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Text Input */}
          <form onSubmit={handleSubmit} className="border-t border-gray-100 p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about wineries, tours, restaurants..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Bottom Panel - AI-extracted Tags & Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t border-purple-100 shadow-lg">
        <div className="max-w-2xl mx-auto p-4">
          {/* AI-Extracted Tags (wine preferences, wineries mentioned, etc.) */}
          {aiExtractedTags.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">From our chat</h3>
                <button
                  onClick={clearAllTags}
                  className="text-xs text-gray-500 hover:text-purple-600 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiExtractedTags.map(([key, value]) => (
                  <TripTag
                    key={key}
                    tagKey={key}
                    value={value}
                    onRemove={() => removeTag(key as keyof TripTags)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Link
              href={`/bookings/new?${new URLSearchParams({
                ...(tags.partySize && { guests: String(tags.partySize) }),
                ...(tags.dates && { dates: tags.dates }),
                ...(tags.occasion && { occasion: tags.occasion }),
                ...(tags.winePreferences && { preferences: tags.winePreferences.join(',') }),
                ...(tags.wineriesMentioned && { wineries: tags.wineriesMentioned.join(',') }),
              }).toString()}`}
              className="flex-1 py-3 px-4 bg-purple-600 text-white text-center font-semibold rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
            >
              Book a Wine Tour
            </Link>
            <Link
              href={`/concierge?${new URLSearchParams({
                ...(tags.partySize && { guests: String(tags.partySize) }),
                ...(tags.dates && { dates: tags.dates }),
                ...(tags.occasion && { occasion: tags.occasion }),
              }).toString()}`}
              className="flex-1 py-3 px-4 bg-white text-purple-700 text-center font-semibold rounded-xl border-2 border-purple-600 hover:bg-purple-50 transition-colors"
            >
              Full Trip Assistance
            </Link>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            Powered by OpenAI • Partner wineries only
          </p>
        </div>
      </div>
    </div>
  );
}
