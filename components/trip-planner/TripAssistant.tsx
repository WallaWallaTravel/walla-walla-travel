'use client';

import { useState, useRef, useEffect } from 'react';
import {
  useTripPlannerStore,
  useChatMessages,
  useIsSendingMessage,
  useProactiveTip,
} from '@/lib/stores/trip-planner';
import { TripChatMessage, TripAIAction } from '@/lib/types/trip-planner';

// ============================================================================
// Quick Suggestion Chips
// ============================================================================

const QUICK_SUGGESTIONS = [
  { label: 'Suggest wineries', message: 'Can you suggest some wineries for our trip?' },
  { label: 'Bold reds', message: 'We love bold red wines - any recommendations?' },
  { label: 'Views & scenery', message: 'Which wineries have the best views?' },
  { label: 'Lunch spots', message: 'Where should we stop for lunch?' },
];

// ============================================================================
// Chat Message Component
// ============================================================================

function ChatMessageBubble({
  message,
  onActionClick,
}: {
  message: TripChatMessage;
  onActionClick: (action: TripAIAction) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-[#722F37] text-white rounded-br-md'
            : 'bg-stone-100 text-stone-900 rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Action buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onActionClick(action)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors border border-white/10"
              >
                {action.type === 'add_stop' && '+ '}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Typing Indicator
// ============================================================================

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-stone-100 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main TripAssistant Component
// ============================================================================

interface TripAssistantProps {
  shareCode: string;
  tripTitle?: string;
  className?: string;
}

export function TripAssistant({ shareCode, tripTitle, className = '' }: TripAssistantProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMessages = useChatMessages();
  const isSending = useIsSendingMessage();
  const proactiveTip = useProactiveTip();
  const sendChatMessage = useTripPlannerStore((state) => state.sendChatMessage);
  const applySuggestion = useTripPlannerStore((state) => state.applySuggestion);
  const addStop = useTripPlannerStore((state) => state.addStop);
  const currentTrip = useTripPlannerStore((state) => state.currentTrip);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSending]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const message = inputValue.trim();
    setInputValue('');
    await sendChatMessage(shareCode, message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickSuggestion = (message: string) => {
    setInputValue(message);
    inputRef.current?.focus();
  };

  const handleActionClick = async (action: TripAIAction) => {
    if (!currentTrip) return;

    if (action.type === 'add_stop' && action.data) {
      await addStop(currentTrip.id, {
        name: action.data.name || 'New Stop',
        stop_type: action.data.stopType || 'winery',
        day_number: action.data.dayNumber || 1,
        planned_arrival: action.data.arrivalTime,
        notes: action.data.notes,
        winery_id: action.data.wineryId,
      });
    } else if (action.type === 'refresh_suggestions') {
      useTripPlannerStore.getState().loadSuggestions(shareCode);
    }
  };

  const isEmpty = chatMessages.length === 0;

  // Render input component (reused in both empty and chat states)
  const renderInput = () => (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about wineries, timing, etc..."
        disabled={isSending}
        className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#722F37] focus:border-transparent disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!inputValue.trim() || isSending}
        className="px-4 py-2.5 bg-[#722F37] text-white rounded-xl font-medium hover:bg-[#8B1538] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSending ? (
          <span className="flex items-center gap-1">
            <span className="animate-spin">⏳</span>
          </span>
        ) : (
          'Send'
        )}
      </button>
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍷</span>
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">Trip Assistant</h3>
            <p className="text-xs text-stone-500">I can help plan your itinerary</p>
          </div>
        </div>
      </div>

      {/* Content Area - scrollable, content stays together */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          /* Empty State - Compact layout with integrated input */
          <div className="py-2">
            {/* Welcome message */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🍷</div>
              <h4 className="font-semibold text-stone-900 mb-1">
                Hi! I'm here to help plan your trip
              </h4>
              <p className="text-sm text-stone-600">
                Ask me about wineries, restaurants, or timing.
              </p>
            </div>

            {/* Input - prominent in empty state */}
            <div className="mb-4">
              {renderInput()}
            </div>

            {/* Quick suggestion chips */}
            <div className="text-center">
              <p className="text-xs text-stone-500 mb-2">Or try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickSuggestion(suggestion.message)}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-full text-sm text-stone-700 transition-colors"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Proactive tip */}
            {proactiveTip && (
              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Tip:</span> {proactiveTip}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Chat State - Messages + Input together, grows from top */
          <div>
            {/* Messages */}
            {chatMessages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                onActionClick={handleActionClick}
              />
            ))}

            {/* Typing indicator */}
            {isSending && <TypingIndicator />}

            {/* Proactive tip (shown after messages) */}
            {proactiveTip && !isSending && (
              <div className="mt-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Tip:</span> {proactiveTip}
                </p>
              </div>
            )}

            {/* Input - right below messages */}
            <div className="mt-4 pt-4 border-t border-stone-200">
              {renderInput()}
            </div>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

export default TripAssistant;
