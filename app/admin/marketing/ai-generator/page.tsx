'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface Winery {
  id: number
  name: string
  slug: string
  description: string | null
  specialties: string[] | null
  winemaker: string | null
}

interface GeneratedContent {
  platform: string
  content: string
  hashtags: string[]
  bestTimeToPost: string
  imagePrompt?: string
}

type Platform = 'instagram' | 'facebook' | 'linkedin'
type ContentType = 'wine_spotlight' | 'event_promo' | 'seasonal' | 'educational' | 'behind_scenes' | 'customer_story'
type Tone = 'professional' | 'casual' | 'sophisticated' | 'playful' | 'educational'

const PLATFORMS: { id: Platform; label: string; icon: string; maxLength: number }[] = [
  { id: 'instagram', label: 'Instagram', icon: '📸', maxLength: 2200 },
  { id: 'facebook', label: 'Facebook', icon: '👥', maxLength: 63206 },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', maxLength: 3000 },
]

const CONTENT_TYPES: { id: ContentType; label: string; description: string }[] = [
  { id: 'wine_spotlight', label: 'Wine Spotlight', description: 'Feature a specific wine or varietal' },
  { id: 'event_promo', label: 'Event Promo', description: 'Promote upcoming tastings or events' },
  { id: 'seasonal', label: 'Seasonal', description: 'Tie content to current season or holiday' },
  { id: 'educational', label: 'Educational', description: 'Wine education and tips' },
  { id: 'behind_scenes', label: 'Behind the Scenes', description: 'Winery life and process' },
  { id: 'customer_story', label: 'Customer Story', description: 'Share visitor experiences' },
]

const TONES: { id: Tone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual & Friendly' },
  { id: 'sophisticated', label: 'Sophisticated' },
  { id: 'playful', label: 'Playful & Fun' },
  { id: 'educational', label: 'Educational' },
]

export default function AIContentGenerator() {
  const [wineries, setWineries] = useState<Winery[]>([])
  const [loadingWineries, setLoadingWineries] = useState(true)

  // Form state
  const [selectedWinery, setSelectedWinery] = useState<number | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram')
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('wine_spotlight')
  const [selectedTone, setSelectedTone] = useState<Tone>('casual')
  const [customPrompt, setCustomPrompt] = useState('')

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  // History state
  const [history, setHistory] = useState<GeneratedContent[]>([])
  const [copied, setCopied] = useState(false)

  // Fetch wineries on mount
  useEffect(() => {
    async function fetchWineries() {
      try {
        const response = await fetch('/api/admin/marketing/wineries')
        if (response.ok) {
          const data = await response.json()
          setWineries(data.wineries || [])
          if (data.wineries?.length > 0) {
            setSelectedWinery(data.wineries[0].id)
          }
        }
      } catch (err) {
        logger.error('Failed to fetch wineries', { error: err })
      } finally {
        setLoadingWineries(false)
      }
    }
    fetchWineries()
  }, [])

  const handleGenerate = async () => {
    if (!selectedWinery) {
      setError('Please select a winery')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedContent(null)

    try {
      const response = await fetch('/api/admin/marketing/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wineryId: selectedWinery,
          platform: selectedPlatform,
          contentType: selectedContentType,
          tone: selectedTone,
          customPrompt: customPrompt || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      const data = await response.json()
      setGeneratedContent(data)
      setHistory(prev => [data, ...prev.slice(0, 9)]) // Keep last 10
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedContent) return

    const fullContent = `${generatedContent.content}\n\n${generatedContent.hashtags.join(' ')}`
    await navigator.clipboard.writeText(fullContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedWineryData = wineries.find(w => w.id === selectedWinery)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/marketing"
          className="text-sm text-purple-600 hover:text-purple-700 mb-2 inline-block"
        >
          ← Back to Marketing Hub
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <span className="text-4xl">🤖</span>
          AI Content Generator
        </h1>
        <p className="text-gray-600 mt-2">
          Generate engaging social media content for partner wineries using AI
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Winery Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🍷</span> Select Winery
              </h2>
              {loadingWineries ? (
                <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
              ) : (
                <select
                  value={selectedWinery || ''}
                  onChange={(e) => setSelectedWinery(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a winery...</option>
                  {wineries.map((winery) => (
                    <option key={winery.id} value={winery.id}>
                      {winery.name}
                    </option>
                  ))}
                </select>
              )}

              {selectedWineryData && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-900 font-medium">{selectedWineryData.name}</p>
                  {selectedWineryData.specialties && selectedWineryData.specialties.length > 0 && (
                    <p className="text-xs text-purple-700 mt-1">
                      Specialties: {selectedWineryData.specialties.join(', ')}
                    </p>
                  )}
                  {selectedWineryData.winemaker && (
                    <p className="text-xs text-purple-700 mt-1">
                      Winemaker: {selectedWineryData.winemaker}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Platform Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📱</span> Platform
              </h2>
              <div className="flex gap-3">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedPlatform === platform.id
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{platform.icon}</span>
                    <span className="text-sm font-medium">{platform.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Type */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📝</span> Content Type
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedContentType(type.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedContentType === type.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-900 block">{type.label}</span>
                    <span className="text-xs text-gray-500">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🎭</span> Tone
              </h2>
              <div className="flex flex-wrap gap-2">
                {TONES.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedTone === tone.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>✨</span> Custom Instructions (Optional)
              </h2>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add any specific details or instructions... e.g., 'Focus on the 2022 Reserve Cabernet' or 'Mention the upcoming harvest festival'"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedWinery}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <span className="text-2xl">🪄</span>
                  Generate Content
                </>
              )}
            </button>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-6">
            {/* Generated Content */}
            <div className="bg-white rounded-xl shadow-sm p-6 min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span>📄</span> Generated Content
                </h2>
                {generatedContent && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                  {error}
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">AI is crafting your content...</p>
                  <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
                </div>
              )}

              {!isGenerating && !generatedContent && !error && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <span className="text-6xl mb-4">📝</span>
                  <p className="text-lg">Your content will appear here</p>
                  <p className="text-sm mt-1">Select options and click Generate</p>
                </div>
              )}

              {generatedContent && !isGenerating && (
                <div className="space-y-4">
                  {/* Platform badge */}
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {PLATFORMS.find(p => p.id === generatedContent.platform)?.icon} {generatedContent.platform}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                      {generatedContent.content.length} characters
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {generatedContent.content}
                    </p>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Suggested Hashtags:</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedContent.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Best time to post */}
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">🕐 Best time to post:</span> {generatedContent.bestTimeToPost}
                    </p>
                  </div>

                  {/* Image prompt if available */}
                  {generatedContent.imagePrompt && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm font-medium text-amber-800 mb-1">📷 Image Suggestion:</p>
                      <p className="text-sm text-amber-700">{generatedContent.imagePrompt}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📚</span> Recent Generations
                </h2>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {history.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setGeneratedContent(item)}
                      className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">
                          {PLATFORMS.find(p => p.id === item.platform)?.icon}
                        </span>
                        <span className="text-xs text-gray-500">{item.platform}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {item.content.substring(0, 100)}...
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
