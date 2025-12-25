'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface VariantData {
  name: string
  description: string
  caption: string
  image_url: string
  hashtags: string
  cta: string
  post_time: string
}

export default function NewABTestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  
  const [testData, setTestData] = useState({
    name: '',
    description: '',
    hypothesis: '',
    test_type: 'content',
    variable_tested: '',
    platform: 'instagram',
    sample_size_target: 10000,
    duration_days: 14,
  })

  const [variantA, setVariantA] = useState<VariantData>({
    name: 'Variant A',
    description: '',
    caption: '',
    image_url: '',
    hashtags: '',
    cta: '',
    post_time: '',
  })

  const [variantB, setVariantB] = useState<VariantData>({
    name: 'Variant B',
    description: '',
    caption: '',
    image_url: '',
    hashtags: '',
    cta: '',
    post_time: '',
  })

  const testTypes = [
    { value: 'content', label: 'Content', icon: '✍️', description: 'Test captions, hashtags, CTAs' },
    { value: 'timing', label: 'Timing', icon: '⏰', description: 'Test posting times and days' },
    { value: 'format', label: 'Format', icon: '🎨', description: 'Test image vs video, carousel vs single' },
    { value: 'audience', label: 'Audience', icon: '👥', description: 'Test targeting different segments' },
    { value: 'pricing', label: 'Pricing', icon: '💰', description: 'Test different price presentations' },
    { value: 'cta', label: 'CTA', icon: '👆', description: 'Test call-to-action variations' },
  ]

  const platforms = [
    { value: 'instagram', label: 'Instagram', icon: '📸' },
    { value: 'facebook', label: 'Facebook', icon: '👥' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'tiktok', label: 'TikTok', icon: '🎵' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'website', label: 'Website', icon: '🌐' },
    { value: 'all', label: 'All Platforms', icon: '🌍' },
  ]

  const templates = [
    { name: 'Caption Length', hypothesis: 'Longer captions with storytelling will drive higher engagement', variable: 'caption_length' },
    { name: 'Posting Time', hypothesis: 'Evening posts (7pm) will outperform morning posts (9am)', variable: 'post_time' },
    { name: 'CTA Style', hypothesis: 'Soft CTAs will feel less salesy and drive more clicks', variable: 'cta_style' },
    { name: 'Image Style', hypothesis: 'Candid lifestyle shots will outperform professional photos', variable: 'image_style' },
    { name: 'Hashtag Count', hypothesis: '5-7 hashtags will perform better than 15+ hashtags', variable: 'hashtag_count' },
    { name: 'Emoji Usage', hypothesis: 'Posts with emojis will get more engagement than text-only', variable: 'emoji_usage' },
  ]

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/marketing/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testData,
          variant_a: {
            ...variantA,
            hashtags: variantA.hashtags.split(',').map(h => h.trim()).filter(Boolean),
          },
          variant_b: {
            ...variantB,
            hashtags: variantB.hashtags.split(',').map(h => h.trim()).filter(Boolean),
          },
        }),
      })

      if (response.ok) {
        router.push('/admin/marketing/ab-testing')
      } else {
        alert('Failed to create test. Please try again.')
      }
    } catch (error) {
      console.error('Error creating test:', error)
      alert('Failed to create test. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = (template: typeof templates[0]) => {
    setTestData({
      ...testData,
      name: template.name + ' Test',
      hypothesis: template.hypothesis,
      variable_tested: template.variable,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
            <span>/</span>
            <Link href="/admin/marketing/ab-testing" className="hover:text-purple-600">A/B Testing</Link>
            <span>/</span>
            <span>New Test</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">🧪 Create A/B Test</h1>
          <p className="text-gray-600 mt-1">Set up a new experiment to optimize your marketing</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= s ? 'text-purple-600' : 'text-gray-500'}`}>
                {s === 1 ? 'Test Setup' : s === 2 ? 'Variants' : 'Review'}
              </span>
              {s < 3 && <div className={`w-24 h-1 mx-4 ${step > s ? 'bg-purple-600' : 'bg-gray-200'}`}></div>}
            </div>
          ))}
        </div>

        {/* Step 1: Test Setup */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Test Setup</h2>
            
            {/* Quick Templates */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Start Templates</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => applyTemplate(template)}
                    className="p-3 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 text-sm">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.hypothesis}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                <input
                  type="text"
                  value={testData.name}
                  onChange={(e) => setTestData({ ...testData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Caption Length: Short vs Long"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hypothesis</label>
                <textarea
                  value={testData.hypothesis}
                  onChange={(e) => setTestData({ ...testData, hypothesis: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={2}
                  placeholder="What do you expect to happen? e.g., 'Longer captions will drive higher engagement'"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Test Type</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {testTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setTestData({ ...testData, test_type: type.value })}
                      className={`p-4 text-left border-2 rounded-lg transition-colors ${
                        testData.test_type === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <p className="font-medium text-gray-900 mt-2">{type.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform.value}
                      onClick={() => setTestData({ ...testData, platform: platform.value })}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        testData.platform === platform.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <span className="mr-2">{platform.icon}</span>
                      {platform.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Sample Size</label>
                  <input
                    type="number"
                    value={testData.sample_size_target}
                    onChange={(e) => setTestData({ ...testData, sample_size_target: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Impressions per variant</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={testData.duration_days}
                    onChange={(e) => setTestData({ ...testData, duration_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 14+ days</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep(2)}
                disabled={!testData.name}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Define Variants →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Variants */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Variant A */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">A</div>
                  <h3 className="text-lg font-bold text-gray-900">Variant A (Control)</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={variantA.name}
                      onChange={(e) => setVariantA({ ...variantA, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Short Caption"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={variantA.description}
                      onChange={(e) => setVariantA({ ...variantA, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Brief description of this variant"
                    />
                  </div>
                  {testData.test_type === 'content' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                        <textarea
                          value={variantA.caption}
                          onChange={(e) => setVariantA({ ...variantA, caption: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={3}
                          placeholder="The caption text for this variant"
                        />
                        <p className="text-xs text-gray-500 mt-1">{variantA.caption.length} characters</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA</label>
                        <input
                          type="text"
                          value={variantA.cta}
                          onChange={(e) => setVariantA({ ...variantA, cta: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Call to action text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                        <input
                          type="text"
                          value={variantA.hashtags}
                          onChange={(e) => setVariantA({ ...variantA, hashtags: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="#WallaWalla, #WineTour"
                        />
                      </div>
                    </>
                  )}
                  {testData.test_type === 'timing' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Post Time</label>
                      <input
                        type="time"
                        value={variantA.post_time}
                        onChange={(e) => setVariantA({ ...variantA, post_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Variant B */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">B</div>
                  <h3 className="text-lg font-bold text-gray-900">Variant B (Test)</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={variantB.name}
                      onChange={(e) => setVariantB({ ...variantB, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Long Caption"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={variantB.description}
                      onChange={(e) => setVariantB({ ...variantB, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Brief description of this variant"
                    />
                  </div>
                  {testData.test_type === 'content' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                        <textarea
                          value={variantB.caption}
                          onChange={(e) => setVariantB({ ...variantB, caption: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={3}
                          placeholder="The caption text for this variant"
                        />
                        <p className="text-xs text-gray-500 mt-1">{variantB.caption.length} characters</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA</label>
                        <input
                          type="text"
                          value={variantB.cta}
                          onChange={(e) => setVariantB({ ...variantB, cta: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Call to action text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                        <input
                          type="text"
                          value={variantB.hashtags}
                          onChange={(e) => setVariantB({ ...variantB, hashtags: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="#WallaWalla, #WineTour"
                        />
                      </div>
                    </>
                  )}
                  {testData.test_type === 'timing' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Post Time</label>
                      <input
                        type="time"
                        value={variantB.post_time}
                        onChange={(e) => setVariantB({ ...variantB, post_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!variantA.name || !variantB.name}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review Your Test</h2>
            
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Test Details</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Name</dt>
                    <dd className="font-medium text-gray-900">{testData.name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Type</dt>
                    <dd className="font-medium text-gray-900 capitalize">{testData.test_type}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Platform</dt>
                    <dd className="font-medium text-gray-900 capitalize">{testData.platform}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Duration</dt>
                    <dd className="font-medium text-gray-900">{testData.duration_days} days</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-gray-500">Hypothesis</dt>
                    <dd className="font-medium text-gray-900">{testData.hypothesis || 'Not specified'}</dd>
                  </div>
                </dl>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Variant A: {variantA.name}</h4>
                  <p className="text-sm text-blue-800">{variantA.description || 'No description'}</p>
                  {variantA.caption && (
                    <p className="text-sm text-blue-700 mt-2 italic">&quot;{variantA.caption.substring(0, 100)}...&quot;</p>
                  )}
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Variant B: {variantB.name}</h4>
                  <p className="text-sm text-purple-800">{variantB.description || 'No description'}</p>
                  {variantB.caption && (
                    <p className="text-sm text-purple-700 mt-2 italic">&quot;{variantB.caption.substring(0, 100)}...&quot;</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">⚠️ Important Notes</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Test will be created as a draft - you&apos;ll need to start it manually</li>
                  <li>• Run for at least {testData.duration_days} days for statistical significance</li>
                  <li>• Need ~{testData.sample_size_target.toLocaleString()} impressions per variant</li>
                  <li>• Only change ONE variable between variants for valid results</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : '🧪 Create Test'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}







