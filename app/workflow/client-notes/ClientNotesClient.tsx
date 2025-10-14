'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { sanitizeText, sanitizeHtml } from '@/lib/security'
import DOMPurify from 'isomorphic-dompurify'

interface Props {
  driver: {
    id: string
    name: string
    email: string
  }
}

export default function ClientNotesClient({ driver }: Props) {
  const [currentScreen, setCurrentScreen] = useState('quick')
  const [itineraryWineries, setItineraryWineries] = useState<string[]>([])
  const [customStops, setCustomStops] = useState('')
  const [quickData, setQuickData] = useState({
    overallRating: 0,
    wineryRatings: {} as Record<string, number>,
    purchases: [] as string[],
    favoriteStop: '',
    willReturn: '',
    customStops: ''
  })
  const [detailedNotes, setDetailedNotes] = useState('')
  const [marketingInterests, setMarketingInterests] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Load today's itinerary wineries from database
  useEffect(() => {
    const loadItinerary = async () => {
      try {
        const { data } = await supabase
          .from('itineraries')
          .select('wineries')
          .eq('driver_id', driver.id)
          .eq('date', new Date().toDateString())
          .single()
          
        if (data?.wineries) {
          setItineraryWineries(data.wineries)
        } else {
          // Fallback data
          setItineraryWineries(['Rotie', 'Saviah', 'Zerba', 'Amavi'])
        }
      } catch (error) {
        console.error('Error loading itinerary:', error)
        setItineraryWineries(['Rotie', 'Saviah', 'Zerba', 'Amavi'])
      }
    }
    
    loadItinerary()
  }, [driver.id])

  const handleQuickSubmit = () => {
    setCurrentScreen('detailed')
  }

  const saveNotesToDatabase = async (completeData: any) => {
    try {
      // Sanitize all text inputs
      const sanitizedData = {
        ...completeData,
        customStops: sanitizeText(completeData.customStops),
        detailedNotes: sanitizeText(completeData.detailedNotes),
        favoriteStop: sanitizeText(completeData.favoriteStop)
      }

      // Save to database with parameterized query
      const { error } = await supabase
        .from('client_notes')
        .insert({
          driver_id: driver.id,
          date: new Date().toDateString(),
          overall_rating: sanitizedData.overallRating,
          winery_ratings: sanitizedData.wineryRatings,
          purchases: sanitizedData.purchases,
          favorite_stop: sanitizedData.favoriteStop,
          will_return: sanitizedData.willReturn,
          custom_stops: sanitizedData.customStops,
          detailed_notes: sanitizedData.detailedNotes,
          marketing_interests: sanitizedData.marketingInterests,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      // Update workflow progress
      await supabase
        .from('workflow_progress')
        .upsert({
          driver_email: driver.email,
          completed_steps: ['clock_in', 'pre_trip', 'client_pickup', 'client_dropoff', 'client_notes'],
          current_step: 5,
          date: new Date().toDateString(),
          updated_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Error saving notes:', error)
      throw error
    }
  }

  const handleFinalSubmit = async () => {
    setSubmitting(true)
    
    try {
      const completeData = {
        ...quickData,
        customStops,
        detailedNotes,
        marketingInterests,
        timestamp: new Date().toISOString()
      }
      
      await saveNotesToDatabase(completeData)
      window.location.href = '/workflow/daily'
    } catch (error) {
      alert('Error saving notes. Please try again.')
      setSubmitting(false)
    }
  }

  const handleSkipDetailed = async () => {
    setSubmitting(true)
    
    try {
      const completeData = {
        ...quickData,
        customStops,
        detailedNotes: '',
        marketingInterests: [],
        timestamp: new Date().toISOString()
      }
      
      await saveNotesToDatabase(completeData)
      window.location.href = '/workflow/daily'
    } catch (error) {
      alert('Error saving notes. Please try again.')
      setSubmitting(false)
    }
  }

  // Safe display function for user input
  const safeDisplay = (text: string) => {
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gray-900 text-white p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.location.href = '/workflow/daily'}
              className="bg-gray-700 p-2 rounded-lg"
              title="Back to Dashboard"
            >
              🏠
            </button>
            <div>
              <h1 className="text-xl font-bold">Client Notes</h1>
              <p className="text-sm text-gray-300">
                {currentScreen === 'quick' ? 'Quick Entry' : 'Detailed Notes (Optional)'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/workflow/daily'}
            className="text-white"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="p-4">
        {currentScreen === 'quick' ? (
          <>
            {/* Quick Entry Screen */}
            
            {/* Overall Tour Rating */}
            <div className="bg-white rounded-lg p-6 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                How was today&apos;s tour?
              </h2>
              <div className="flex justify-center gap-3">
                {[1,2,3,4,5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setQuickData({...quickData, overallRating: rating})}
                    className={`text-3xl p-3 rounded-lg ${
                      quickData.overallRating === rating 
                        ? 'bg-blue-100 border-2 border-blue-500' 
                        : 'bg-gray-50'
                    }`}
                  >
                    {'⭐'.repeat(rating)}
                  </button>
                ))}
              </div>
            </div>

            {/* Winery Quick Ratings */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Stop Ratings</h3>
              <p className="text-sm text-gray-600 mb-3">Rate today&apos;s scheduled stops</p>
              <div className="space-y-3">
                {itineraryWineries.map(winery => (
                  <div key={winery} className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">{safeDisplay(winery)}</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <button
                          key={star}
                          onClick={() => setQuickData({
                            ...quickData,
                            wineryRatings: {...quickData.wineryRatings, [winery]: star}
                          })}
                          className={`text-xl p-1 ${
                            (quickData.wineryRatings[winery] || 0) >= star 
                              ? 'text-yellow-500' 
                              : 'text-gray-300'
                          }`}
                        >
                          ⭐
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          const purchases = quickData.purchases.includes(winery)
                            ? quickData.purchases.filter(w => w !== winery)
                            : [...quickData.purchases, winery]
                          setQuickData({...quickData, purchases})
                        }}
                        className={`ml-3 px-3 py-1 rounded text-sm ${
                          quickData.purchases.includes(winery)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        💰 Purchased
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Stops */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Additional Stops</h3>
              <input
                type="text"
                value={customStops}
                onChange={(e) => setCustomStops(e.target.value.substring(0, 200))}
                placeholder="List any unplanned stops (comma separated)"
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
                maxLength={200}
              />
            </div>

            {/* Favorite Stop */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Client&apos;s Favorite Stop</h3>
              <div className="grid grid-cols-2 gap-2">
                {itineraryWineries.map(winery => (
                  <button
                    key={winery}
                    onClick={() => setQuickData({...quickData, favoriteStop: winery})}
                    className={`p-3 rounded-lg text-sm font-medium ${
                      quickData.favoriteStop === winery
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {safeDisplay(winery)}
                  </button>
                ))}
                {customStops && (
                  <button
                    onClick={() => setQuickData({...quickData, favoriteStop: customStops})}
                    className={`p-3 rounded-lg text-sm font-medium ${
                      quickData.favoriteStop === customStops
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {safeDisplay(customStops)}
                  </button>
                )}
              </div>
            </div>

            {/* Will Return */}
            <div className="bg-white rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Will they book again?</h3>
              <div className="grid grid-cols-3 gap-3">
                {['Definitely', 'Likely', 'Maybe'].map(option => (
                  <button
                    key={option}
                    onClick={() => setQuickData({...quickData, willReturn: option})}
                    className={`p-4 rounded-lg font-medium ${
                      quickData.willReturn === option
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleQuickSubmit}
              className="w-full py-4 bg-blue-600 text-white rounded-lg text-lg font-medium"
            >
              Continue to Detailed Notes (Optional)
            </button>

            <button 
              onClick={handleSkipDetailed}
              className="w-full py-3 text-gray-600 mt-3"
            >
              Skip - Save Quick Notes Only
            </button>
          </>
        ) : (
          <>
            {/* Detailed Entry Screen */}
            
            {/* Additional Observations */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Additional Observations (Optional)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Add any other details about the tour that might be helpful
              </p>
              <textarea
                value={detailedNotes}
                onChange={(e) => setDetailedNotes(e.target.value.substring(0, 1000))}
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                rows={4}
                maxLength={1000}
                placeholder="Example: Client mentioned wanting to explore Rhone varietals next time, very interested in wine education, celebrating 25th anniversary..."
              />
              <p className="text-sm text-gray-500 mt-1">{detailedNotes.length}/1000 characters</p>
            </div>

            {/* Marketing Interests */}
            <div className="bg-white rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Client Interests</h3>
              <div className="space-y-2">
                {[
                  'Rockwalla Resort Updates',
                  'Wine Club Memberships',
                  'Harvest Season Tours',
                  'Winemaker Dinners',
                  'Release Parties',
                  'Educational Seminars'
                ].map(interest => (
                  <label key={interest} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={marketingInterests.includes(interest)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMarketingInterests([...marketingInterests, interest])
                        } else {
                          setMarketingInterests(marketingInterests.filter(i => i !== interest))
                        }
                      }}
                      className="mr-3"
                    />
                    <span className="text-gray-700">{interest}</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={handleFinalSubmit}
              disabled={submitting}
              className={`w-full py-4 rounded-lg text-lg font-medium ${
                submitting
                  ? 'bg-gray-300 text-gray-500' 
                  : 'bg-green-600 text-white'
              }`}
            >
              {submitting ? 'Saving...' : 'Save All Notes'}
            </button>

            <button 
              onClick={handleSkipDetailed}
              className="w-full py-3 text-gray-600 mt-3"
            >
              Skip Details - Save Quick Notes Only
            </button>
          </>
        )}
      </div>
    </div>
  )
}