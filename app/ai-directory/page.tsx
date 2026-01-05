'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';
import MessageFeedback from '@/components/ai/MessageFeedback';
import EmailCaptureModal from '@/components/ai/EmailCaptureModal';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
  queryId?: number;
}

interface Visitor {
  visitor_uuid: string;
  total_queries: number;
  email?: string | null;
}

const SUGGESTED_QUESTIONS = [
  "What wineries have outdoor seating?",
  "Best tours for a couple's anniversary?",
  "Can you accommodate 15 people?",
  "Do you provide hotel pickup?",
  "What's included in your tours?",
  "Wine tasting prices?"
];

export default function EnhancedAIDirectoryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    isRecording,
    duration,
    audioBlob,
    error: _recordingError,
    startRecording,
    stopRecording,
    clearRecording
  } = useAudioRecorder();

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Trigger email capture after 3 queries
  useEffect(() => {
    if (visitor && visitor.total_queries === 3 && !visitor.email) {
      // Small delay so user can read the last response
      const timer = setTimeout(() => {
        setShowEmailModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visitor]);

  // Handle text submission
  const handleSubmitText = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Focus input for mobile (keeps keyboard open)
    inputRef.current?.focus();

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: inputText })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: data.response,
          timestamp: new Date(),
          queryId: data.queryId
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Update visitor info
        if (data.visitor) {
          setVisitor(data.visitor);
        }
      } else {
        throw new Error(data.error || 'Query failed');
      }
    } catch (error: unknown) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voice submission
  const handleSubmitVoice = async () => {
    if (!audioBlob || isTranscribing) return;

    setIsTranscribing(true);

    try {
      // Transcribe audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const transcribeResponse = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const { transcription } = await transcribeResponse.json();
      
      // Set transcribed text and submit
      setInputText(transcription);
      clearRecording();
      setUseVoice(false);
      
      // Submit the transcribed text
      setTimeout(() => {
        handleSubmitText();
      }, 100);

    } catch (error: unknown) {
      console.error('Voice submission error:', error);
      alert('Failed to process voice input. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle suggested question - submit immediately
  const handleSuggestedQuestion = async (question: string) => {
    // Don't set input text, just submit directly
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: data.response,
          timestamp: new Date(),
          queryId: data.queryId
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Update visitor info
        if (data.visitor) {
          setVisitor(data.visitor);
        }
      } else {
        throw new Error(data.error || 'Query failed');
      }
    } catch (error: unknown) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email capture
  const handleEmailCapture = async (email: string, name?: string) => {
    if (!visitor) return;

    try {
      const response = await fetch('/api/visitor/capture-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_uuid: visitor.visitor_uuid,
          email,
          name,
          trigger_type: 'after_queries',
          query_count: visitor.total_queries
        })
      });

      const data = await response.json();
      if (data.success) {
        setVisitor(data.visitor);
        setShowEmailModal(false);
      }
    } catch (error) {
      console.error('Email capture error:', error);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitText();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              🍷 Walla Walla Valley Travel Guide
            </h1>
            <p className="text-xs md:text-sm text-gray-500">
              Your personal wine country assistant
            </p>
          </div>
          
          {visitor && visitor.email && (
            <div className="text-xs text-gray-500">
              👋 {visitor.email.split('@')[0]}
            </div>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="text-center space-y-6 py-8">
              <div className="text-4xl md:text-6xl">🍇</div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Welcome to Walla Walla!
                </h2>
                <p className="text-gray-600 max-w-xl mx-auto">
                  I&apos;m your AI guide to the best wineries, tours, and experiences in wine country. 
                  Ask me anything!
                </p>
              </div>

              {/* Suggested questions */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Try asking:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {SUGGESTED_QUESTIONS.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="text-left px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition text-sm text-gray-700 hover:text-blue-700"
                    >
                      💬 {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'ai' && (
                    <span className="text-xl flex-shrink-0">🤖</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                    <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Feedback for AI messages */}
                {message.type === 'ai' && message.queryId && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <MessageFeedback queryId={message.queryId} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🤖</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area - Fixed at bottom */}
      <footer className="bg-white border-t border-gray-200 shadow-lg sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Voice mode indicator */}
          {useVoice && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg text-sm">
              {isRecording ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-gray-700">Recording... {duration.toFixed(1)}s</span>
                  </span>
                  <button
                    onClick={stopRecording}
                    className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-medium hover:bg-red-700 transition"
                  >
                    Stop
                  </button>
                </div>
              ) : audioBlob ? (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">✓ Recording ready</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={clearRecording}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-300 transition"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSubmitVoice}
                      disabled={isTranscribing}
                      className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isTranscribing ? 'Processing...' : 'Send'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Tap mic to start recording</span>
                  <button
                    onClick={() => setUseVoice(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-end space-x-2">
            {/* Text input */}
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about wineries, tours, experiences..."
                disabled={isLoading || useVoice}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm md:text-base disabled:bg-gray-50 disabled:text-gray-500"
                rows={1}
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                  fontSize: '16px' // Prevents iOS zoom on focus
                }}
              />
            </div>

            {/* Voice toggle */}
            {!useVoice && (
              <button
                onClick={() => {
                  setUseVoice(true);
                  startRecording();
                }}
                disabled={isLoading}
                className="flex-shrink-0 p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition disabled:opacity-50"
                aria-label="Voice input"
                title="Use voice input"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}

            {/* Send button */}
            {!useVoice && (
              <button
                onClick={handleSubmitText}
                disabled={!inputText.trim() || isLoading}
                className="flex-shrink-0 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
                title="Send message"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>

          {/* Voice recording button (when in voice mode) */}
          {useVoice && !isRecording && !audioBlob && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={startRecording}
                className="p-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                aria-label="Start recording"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* Email capture modal */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailCapture}
        triggerType="after_queries"
        queryCount={visitor?.total_queries}
      />
    </div>
  );
}

