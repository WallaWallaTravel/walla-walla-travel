'use client'

import { useState } from 'react'
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder'

interface Message {
  id: string
  type: 'user' | 'ai'
  text: string
  timestamp: Date
  queryId?: number
}

const SUGGESTED_QUESTIONS = [
  "What wineries have outdoor seating?",
  "Best tours for a couple's anniversary?",
  "Can you accommodate 15 people?",
  "Do you provide hotel pickup?",
  "What's included in your tours?",
  "Wine tasting prices?"
]

export default function AIDirectoryPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useVoice, setUseVoice] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const {
    isRecording,
    duration,
    audioBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    clearRecording
  } = useAudioRecorder()

  const handleSubmitText = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: inputText })
      })

      const data = await response.json()

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: data.response,
          timestamp: new Date(),
          queryId: data.queryId
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error(data.error || 'Query failed')
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTranscribeAndSubmit = async () => {
    if (!audioBlob) return

    setIsTranscribing(true)

    try {
      // Transcribe audio
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      const transcribeData = await transcribeRes.json()

      if (!transcribeData.success) {
        throw new Error('Transcription failed')
      }

      const transcript = transcribeData.transcript
      clearRecording()
      
      // Now submit as text query
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        text: transcript,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMessage])
      setIsLoading(true)

      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: transcript })
      })

      const data = await response.json()

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: data.response,
          timestamp: new Date(),
          queryId: data.queryId
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error(data.error || 'Query failed')
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTranscribing(false)
      setIsLoading(false)
      setUseVoice(false)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            🤖 AI Travel Assistant
          </h1>
          <p className="text-sm text-gray-600">
            Ask me anything about Walla Walla wine tours!
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Messages */}
        <div className="space-y-4 mb-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍷</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome to Walla Walla Travel!
              </h2>
              <p className="text-gray-600 mb-6">
                I'm your AI assistant. Ask me anything about wine tours, wineries, or planning your visit!
              </p>
              
              {/* Suggested Questions */}
              <div className="max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Try asking:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedQuestion(q)}
                      className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm text-left hover:border-blue-400 hover:bg-blue-50 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border-2 border-gray-200 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-white/80 backdrop-blur-sm fixed bottom-0 left-0 right-0 py-4">
          <div className="max-w-4xl mx-auto px-4">
            {/* Mode Toggle */}
            <div className="flex justify-center mb-3">
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setUseVoice(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    !useVoice
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ⌨️ Type
                </button>
                <button
                  onClick={() => setUseVoice(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    useVoice
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎤 Voice
                </button>
              </div>
            </div>

            {/* Text Input */}
            {!useVoice && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitText()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSubmitText}
                  disabled={!inputText.trim() || isLoading}
                  className={`px-6 py-3 rounded-lg font-medium transition ${
                    inputText.trim() && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Send
                </button>
              </div>
            )}

            {/* Voice Input */}
            {useVoice && (
              <div className="text-center">
                {!isRecording && !audioBlob && (
                  <button
                    onClick={startRecording}
                    className="px-8 py-4 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition"
                  >
                    🎤 Tap to Record
                  </button>
                )}

                {isRecording && (
                  <div>
                    <div className="flex items-center justify-center space-x-3 mb-3">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xl font-mono text-gray-900">
                        {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="px-8 py-4 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition"
                    >
                      ⏹️ Stop Recording
                    </button>
                  </div>
                )}

                {audioBlob && !isTranscribing && (
                  <div className="space-y-3">
                    <p className="text-green-600 font-medium">
                      ✓ Recording complete ({duration}s)
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={clearRecording}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleTranscribeAndSubmit}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}

                {isTranscribing && (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-gray-600">Transcribing and processing...</p>
                  </div>
                )}

                {recordingError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{recordingError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Spacer for fixed input */}
        <div className="h-32" />
      </div>
    </div>
  )
}

