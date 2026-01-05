'use client'

import { useState, useEffect } from 'react'
import {
  TouchButton,
  MobileCard,
  BottomActionBar,
  BottomActionBarSpacer,
  StatusIndicator,
  AlertBanner,
  haptics
} from '@/components/mobile'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

interface Props {
  user?: {
    id: string
    name: string
    email: string
  }
  userEmail?: string // For backward compatibility
}

interface WorkflowStep {
  id: string
  title: string
  description: string
  icon: string
  path: string | null
  estimatedMinutes?: number
}

interface WorkflowProgress {
  currentStep: number
  completedSteps: string[]
  stepTimes?: Record<string, string>
  timestamp?: string
}

export function DailyWorkflowClient({ user, userEmail }: Props) {
  const _router = useRouter()
  const _email = user?.email || userEmail || 'guest'
  
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [stepTimes, setStepTimes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  
  const workflowSteps: WorkflowStep[] = [
    { 
      id: 'clock_in', 
      title: 'Clock In', 
      description: 'Start your shift and record arrival time',
      icon: '⏰',
      path: '/time-clock/clock-in',
      estimatedMinutes: 2
    },
    { 
      id: 'pre_trip', 
      title: 'Pre-Trip Inspection', 
      description: 'Complete vehicle safety check',
      icon: '🔍',
      path: '/inspections/pre-trip',
      estimatedMinutes: 10
    },
    { 
      id: 'client_pickup', 
      title: 'Client Pickup', 
      description: 'Record pickup time and location',
      icon: '🚐',
      path: '/workflow/client-pickup',
      estimatedMinutes: 5
    },
    { 
      id: 'client_dropoff', 
      title: 'Client Drop-off', 
      description: 'Record drop-off time and location',
      icon: '📍',
      path: '/workflow/client-dropoff',
      estimatedMinutes: 5
    },
    { 
      id: 'client_notes', 
      title: 'Client Notes', 
      description: 'Document trip details and observations',
      icon: '📝',
      path: '/workflow/client-notes',
      estimatedMinutes: 5
    },
    { 
      id: 'post_trip', 
      title: 'Post-Trip Inspection', 
      description: 'Complete DVIR and report defects',
      icon: '📋',
      path: '/inspections/post-trip',
      estimatedMinutes: 10
    },
    { 
      id: 'clock_out', 
      title: 'Clock Out', 
      description: 'End your shift and submit hours',
      icon: '🏁',
      path: '/time-clock/clock-out',
      estimatedMinutes: 2
    }
  ]

  // Load saved progress from localStorage
  useEffect(() => {
    const loadProgress = () => {
      try {
        const saved = localStorage.getItem('workflowProgress')
        
        if (saved) {
          const data: WorkflowProgress = JSON.parse(saved)
          
          // Check if it's today's workflow
          const savedDate = data.timestamp ? new Date(data.timestamp).toDateString() : ''
          const today = new Date().toDateString()
          
          if (savedDate === today) {
            setCompletedSteps(data.completedSteps || [])
            setCurrentStep(data.currentStep || 0)
            setStepTimes(data.stepTimes || {})
            
            // Check if workflow is complete
            if (data.completedSteps.length === workflowSteps.length) {
              setShowCompletion(true)
              haptics.success()
            }
          }
        }
      } catch (error) {
        logger.error('Error loading progress', { error })
      } finally {
        setLoading(false)
      }
    }
    
    loadProgress()
  }, [workflowSteps.length])

  const saveProgress = (newCompleted: string[], newStep: number, newTimes: Record<string, string>) => {
    try {
      const progressData: WorkflowProgress = {
        completedSteps: newCompleted,
        currentStep: newStep,
        stepTimes: newTimes,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('workflowProgress', JSON.stringify(progressData))
    } catch (error) {
      logger.error('Error saving progress', { error })
    }
  }

  const handleStepComplete = (stepId: string) => {
    const newCompleted = [...completedSteps, stepId]
    const newStep = currentStep + 1
    const newTimes = {
      ...stepTimes,
      [stepId]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    setCompletedSteps(newCompleted)
    setCurrentStep(newStep)
    setStepTimes(newTimes)
    
    saveProgress(newCompleted, newStep, newTimes)
    haptics.success()
    
    // Check if workflow is complete
    if (newCompleted.length === workflowSteps.length) {
      setShowCompletion(true)
      haptics.success()
    }
  }

  const handleStartStep = (step: WorkflowStep, index: number) => {
    // Can only start current step or revisit completed steps
    if (index > currentStep) {
      haptics.error()
      return
    }
    
    haptics.light()
    
    if (step.path) {
      // Navigate to step page
      window.location.href = step.path
    } else {
      // Mark as complete if no navigation needed
      if (!completedSteps.includes(step.id)) {
        handleStepComplete(step.id)
      }
    }
  }

  const resetWorkflow = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true)
      haptics.warning()
      return
    }
    
    setCompletedSteps([])
    setCurrentStep(0)
    setStepTimes({})
    setShowResetConfirm(false)
    setShowCompletion(false)
    
    try {
      localStorage.removeItem('workflowProgress')
    } catch (error) {
      logger.error('Error resetting workflow', { error })
    }
    
    haptics.medium()
  }

  const getStepStatus = (index: number): 'completed' | 'active' | 'pending' => {
    if (completedSteps.includes(workflowSteps[index].id)) return 'completed'
    if (index === currentStep) return 'active'
    return 'pending'
  }

  const progressPercentage = Math.round((completedSteps.length / workflowSteps.length) * 100)
  
  const estimatedTimeRemaining = workflowSteps
    .slice(currentStep)
    .reduce((acc, step) => acc + (step.estimatedMinutes || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="text-gray-800">Loading workflow...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-semibold">Daily Workflow</h1>
        <p className="text-sm text-gray-800">
          {user?.name || 'Driver'} • {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Progress Section */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {completedSteps.length} / {workflowSteps.length} Complete
          </span>
          <span className="text-sm font-bold text-blue-600">
            {progressPercentage}%
          </span>
        </div>
        
        {/* Visual Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Progress Dots */}
        <div className="flex justify-between mt-2" data-testid="progress-indicator">
          {workflowSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index < completedSteps.length ? 'bg-green-500' :
                index === currentStep ? 'bg-blue-500 animate-pulse' :
                'bg-gray-300'
              }`}
            />
          ))}
        </div>
        
        {estimatedTimeRemaining > 0 && !showCompletion && (
          <p className="text-xs text-gray-700 mt-2">
            Estimated time remaining: {estimatedTimeRemaining} minutes
          </p>
        )}
      </div>

      {/* Completion Message */}
      {showCompletion && (
        <AlertBanner
          type="success"
          message="🎉 Workflow Complete! Great job today!"
          onDismiss={() => setShowCompletion(false)}
        />
      )}

      {/* Reset Confirmation */}
      {showResetConfirm && (
        <AlertBanner
          type="warning"
          message="Are you sure you want to reset today's workflow? This will clear all progress."
          onDismiss={() => setShowResetConfirm(false)}
        />
      )}

      {/* Workflow Steps */}
      <div className="p-4 space-y-3">
        {workflowSteps.map((step, index) => {
          const status = getStepStatus(index)
          const isDisabled = status === 'pending' && index > currentStep
          
          return (
            <MobileCard
              key={step.id}
              className={`transition-all ${
                isDisabled ? 'opacity-80 bg-gray-50' : ''
              } ${
                status === 'active' ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => !isDisabled && handleStartStep(step, index)}
            >
              <div className="flex items-start">
                {/* Step Icon & Number */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl mr-4 ${
                  status === 'completed' ? 'bg-green-100' :
                  status === 'active' ? 'bg-blue-100' :
                  'bg-gray-100'
                }`}>
                  {status === 'completed' ? '✓' : step.icon}
                </div>
                
                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-medium text-lg ${
                      isDisabled ? 'text-gray-800' : 'text-gray-900'
                    }`}>
                      {step.title}
                    </h3>
                    <StatusIndicator status={status} />
                  </div>
                  
                  <p className={`text-sm mb-3 ${
                    isDisabled ? 'text-gray-800' : 'text-gray-800'
                  }`}>
                    {step.description}
                  </p>
                  
                  {/* Completion Time */}
                  {stepTimes[step.id] && (
                    <p className="text-xs text-green-600 mb-2">
                      ✓ Completed at {stepTimes[step.id]}
                    </p>
                  )}
                  
                  {/* Action Button */}
                  {status === 'active' && (
                    <TouchButton
                      variant="primary"
                      onClick={(e) => {
                        e?.stopPropagation()
                        handleStartStep(step, index)
                      }}
                      className="w-full"
                    >
                      Start {step.title}
                    </TouchButton>
                  )}
                  
                  {status === 'completed' && (
                    <TouchButton
                      variant="secondary"
                      onClick={(e) => {
                        e?.stopPropagation()
                        handleStartStep(step, index)
                      }}
                      className="w-full"
                    >
                      Review {step.title}
                    </TouchButton>
                  )}
                  
                  {status === 'pending' && index === currentStep + 1 && (
                    <div className="text-center text-sm text-gray-700 py-3 bg-gray-100 rounded-lg">
                      Complete previous step first
                    </div>
                  )}
                </div>
              </div>
              
              {/* Estimated Time */}
              {status === 'pending' && step.estimatedMinutes && (
                <div className="mt-2 text-xs text-gray-700 text-right">
                  ~{step.estimatedMinutes} min
                </div>
              )}
            </MobileCard>
          )
        })}
      </div>

      {/* Bottom spacer */}
      <BottomActionBarSpacer />
      
      {/* Bottom Action Bar */}
      <BottomActionBar>
        <div className="flex gap-3">
          <TouchButton
            variant={showResetConfirm ? "primary" : "secondary"}
            onClick={resetWorkflow}
            className="flex-1"
          >
            {showResetConfirm ? 'Confirm Reset' : 'Reset Workflow'}
          </TouchButton>
          
          {showResetConfirm && (
            <TouchButton
              variant="secondary"
              onClick={() => {
                setShowResetConfirm(false)
                haptics.light()
              }}
              className="flex-1"
            >
              Cancel
            </TouchButton>
          )}
          
          {!showResetConfirm && (
            <TouchButton
              variant="secondary"
              onClick={() => {
                haptics.light()
                window.location.href = '/'
              }}
              className="flex-1"
            >
              View History
            </TouchButton>
          )}
        </div>
      </BottomActionBar>
    </div>
  )
}

// Default export for backward compatibility
export default DailyWorkflowClient