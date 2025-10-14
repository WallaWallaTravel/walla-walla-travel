'use client'

import { useState, useEffect } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import Link from 'next/link'

interface Props {
  userEmail: string
}

export default function DailyWorkflowClient({ userEmail }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  
  const workflowSteps = [
    { id: 'clock_in', title: 'Clock In', path: null },
    { id: 'pre_trip', title: 'Pre-Trip Inspection', path: '/inspections/pre-trip' },
    { id: 'client_pickup', title: 'Client Pickup', path: null },
    { id: 'client_dropoff', title: 'Client Drop-off', path: null },
    { id: 'client_notes', title: 'Client Notes', path: '/workflow/client-notes' },
    { id: 'post_trip', title: 'Post-Trip Inspection', path: '/inspections/post-trip' },
    { id: 'clock_out', title: 'Clock Out', path: null }
  ]

  // Load saved progress from localStorage
  useEffect(() => {
    const loadProgress = () => {
      try {
        const today = new Date().toDateString()
        const saved = localStorage.getItem(`workflow-${userEmail}-${today}`)
        
        if (saved) {
          const data = JSON.parse(saved)
          setCompletedSteps(data.completedSteps || [])
          setCurrentStep(data.currentStep || 0)
        }
      } catch (error) {
        console.error('Error loading progress:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProgress()
  }, [userEmail])

  const handleStepComplete = (stepId: string) => {
    const newCompleted = [...completedSteps, stepId]
    const newStep = currentStep + 1
    
    setCompletedSteps(newCompleted)
    setCurrentStep(newStep)
    
    // Save progress to localStorage
    try {
      const today = new Date().toDateString()
      localStorage.setItem(`workflow-${userEmail}-${today}`, JSON.stringify({
        completedSteps: newCompleted,
        currentStep: newStep,
        updatedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  const handleStartStep = (step: any) => {
    if (step.path) {
      window.location.href = step.path
    } else {
      handleStepComplete(step.id)
    }
  }

  const resetWorkflow = () => {
    setCompletedSteps([])
    setCurrentStep(0)
    
    try {
      const today = new Date().toDateString()
      localStorage.removeItem(`workflow-${userEmail}-${today}`)
    } catch (error) {
      console.error('Error resetting workflow:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Daily Workflow</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Progress: {completedSteps.length} / {workflowSteps.length}
              </p>
            </div>
            <button
              onClick={resetWorkflow}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Reset Workflow
            </button>
          </div>

          <div className="space-y-3">
            {workflowSteps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id)
              const isActive = index === currentStep
              const isPending = index > currentStep

              return (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg border ${
                    isCompleted ? 'bg-green-50 border-green-300' :
                    isActive ? 'bg-blue-50 border-blue-300' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isActive ? 'bg-blue-500 text-white' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <span className={`font-medium ${
                        isPending ? 'text-gray-400' : 'text-gray-800'
                      }`}>
                        {DOMPurify.sanitize(step.title)}
                      </span>
                    </div>
                    
                    {isActive && (
                      <button
                        onClick={() => handleStartStep(step)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Start
                      </button>
                    )}
                    
                    {isCompleted && (
                      <span className="text-green-600 font-medium">✓ Completed</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-800"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
