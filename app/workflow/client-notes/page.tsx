'use client'

import { useState, useEffect } from 'react'

export default function ClientNotes() {
  const [currentScreen, setCurrentScreen] = useState('quick') // 'quick' or 'detailed'
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

  // Load today's itinerary wineries from booking system
  useEffect(() => {
    // This would normally pull from the booking system
    // For now, using sample data
    const todaysItinerary = [
      'Rotie',
      'Saviah',
      'Zerba',
      'Amavi'
    ]
    setItineraryWineries(todaysItinerary)
  }, [])

  const handleQuickSubmit = () => {
    // Save quick data and offer detailed entry
    setCurrentScreen('detailed')
  }

  const handleFinalSubmit = () => {
    setSubmitting(true)
    
    // Combine all data
    const completeData = {
      ...quickData,
      customStops,
      detailedNotes,
      marketingInterests,
      timestamp: new Date().toISOString()
    }
    
    // Save to localStorage
    const saved = localStorage.getItem('workflowProgress')
    if (saved) {
      const data = JSON.parse(saved)
      data.clientNotes = completeData
      
      if (!data.completedSteps.includes('client_notes')) {
        data.completedSteps.push('client_notes')
        data.currentStep = data.currentStep + 1
      }
      localStorage.setItem('workflowProgress', JSON.stringify(data))
    }
    
    setTimeout(() => {
      window.location.href = '/workflow/daily'
    }, 500)
  }

  const handleSkipDetailed = () => {
    setSubmitting(true)
    // Save just quick data
    const saved = localStorage.getItem('workflowProgress')
    if (saved) {
      const data = JSON.parse(saved)
      data.clientNotes = {...quickData, customStops}
      
      if (!data.completedSteps.includes('client_notes')) {
        data.completedSteps.push('client_notes')
        data.currentStep = data.currentStep + 1
      }
      localStorage.setItem('workflowProgress', JSON.stringify(data))
    }
    
    setTimeout(() => {
      window.location.href = '/workflow/daily'
    }, 500)
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
                How was today's tour?
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
              <p className="text-sm text-gray-600 mb-3">Rate today's scheduled stops</p>
              <div className="space-y-3">
                {itineraryWineries.map(winery => (
                  <div key={winery} className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">{winery}</span>
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
                onChange={(e) => setCustomStops(e.target.value)}
                placeholder="List any unplanned stops (comma separated)"
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            {/* Favorite Stop */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Client's Favorite Stop</h3>
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
                    {winery}
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
                    {customStops}
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
                onChange={(e) => setDetailedNotes(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                rows={4}
                placeholder="Example: Client mentioned wanting to explore Rhone varietals next time, very interested in wine education, celebrating 25th anniversary..."
              />
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