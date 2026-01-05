"use client";

/**
 * Business Portal Interview Page
 * Main interface for businesses to answer questions via voice or text
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';

interface Question {
  id: number;
  question_number: number;
  question_text: string;
  help_text?: string;
  expected_duration_seconds: number;
  category: string;
  answered: boolean;
  answer_type?: 'voice' | 'text' | null;
  answer_text?: string; // For loading previous answers
}

interface Business {
  id: number;
  name: string;
  business_type: string;
  completion_percentage: number;
}

interface Stats {
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
}

export default function BusinessPortalPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerMode, setAnswerMode] = useState<'voice' | 'text'>('voice');
  const [textAnswer, setTextAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    duration,
    error: recorderError
  } = useAudioRecorder();
  
  // Load business and questions
  useEffect(() => {
    loadPortalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Load previous answer when question changes
  useEffect(() => {
    if (currentQuestion) {
      if (currentQuestion.answer_text) {
        setTextAnswer(currentQuestion.answer_text);
        setAnswerMode(currentQuestion.answer_type || 'voice');
      } else {
        setTextAnswer('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex]);
  
  const loadPortalData = async () => {
    try {
      setLoading(true);
      
      // Get business info
      const accessResponse = await fetch('/api/business-portal/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (!accessResponse.ok) {
        throw new Error('Invalid access code');
      }
      
      const accessData = await accessResponse.json();
      setBusiness(accessData.business);
      
      // Get questions and progress
      const questionsResponse = await fetch(
        `/api/business-portal/questions?businessId=${accessData.business.id}`
      );
      
      if (!questionsResponse.ok) {
        throw new Error('Failed to load questions');
      }
      
      const questionsData = await questionsResponse.json();
      setQuestions(questionsData.questions);
      setStats(questionsData.stats);
      
      // Find first unanswered question
      const firstUnanswered = questionsData.questions.findIndex((q: Question) => !q.answered);
      if (firstUnanswered !== -1) {
        setCurrentQuestionIndex(firstUnanswered);
      }
      
    } catch (err: unknown) {
      console.error('Load error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  
  const handleSubmitVoice = async () => {
    if (!audioBlob || !currentQuestion || !business) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('businessId', business.id.toString());
      formData.append('questionId', currentQuestion.id.toString());
      formData.append('questionNumber', currentQuestion.question_number.toString());
      formData.append('questionText', currentQuestion.question_text);
      formData.append('audio', audioBlob, 'audio.webm');
      
      const response = await fetch('/api/business-portal/voice-response', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to save voice response');
      }
      
      setSuccess('Voice answer saved! ✓');
      setTimeout(() => {
        handleNext();
      }, 1000);
      
    } catch (err: unknown) {
      console.error('Submit voice error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit voice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitText = async () => {
    if (!textAnswer.trim() || !currentQuestion || !business) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/business-portal/text-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          questionId: currentQuestion.id,
          questionNumber: currentQuestion.question_number,
          questionText: currentQuestion.question_text,
          responseText: textAnswer
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save text response');
      }
      
      setSuccess('Text answer saved! ✓');
      setTextAnswer('');
      setTimeout(() => {
        handleNext();
      }, 1000);
      
    } catch (err: unknown) {
      console.error('Submit text error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit text');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    // Auto-save if there's unsaved content
    if (answerMode === 'text' && textAnswer.trim() && !submitting) {
      await handleSubmitText();
      return; // handleSubmitText will call handleNext after saving
    }
    
    setSuccess(null);
    setError(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered - show completion
      loadPortalData(); // Refresh stats
    }
  };
  
  const handlePrevious = async () => {
    // Auto-save if there's unsaved content
    if (answerMode === 'text' && textAnswer.trim() && !submitting) {
      setSubmitting(true);
      try {
        const response = await fetch('/api/business-portal/text-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business!.id,
            questionId: currentQuestion.id,
            questionNumber: currentQuestion.question_number,
            questionText: currentQuestion.question_text,
            responseText: textAnswer
          })
        });
        
        if (response.ok) {
          setSuccess('Answer saved! ✓');
          // Reload to update question status
          await loadPortalData();
        }
      } catch (_err) {
        // Auto-save failed silently
      } finally {
        setSubmitting(false);
      }
    }
    
    setSuccess(null);
    setError(null);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleSkip = () => {
    handleNext();
  };
  
  const allQuestionsAnswered = questions.length > 0 && questions.every(q => q.answered);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portal...</p>
        </div>
      </div>
    );
  }
  
  if (!business || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error || 'Failed to load portal'}</p>
          <button
            onClick={() => router.push('/contribute')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Return to Entry Page
          </button>
        </div>
      </div>
    );
  }
  
  if (allQuestionsAnswered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🎉 All Questions Complete!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Great work, {business.name}! You&apos;ve answered all questions.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">What&apos;s next?</h3>
              <ul className="text-left space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">1.</span>
                  <span>Upload photos, menus, or wine lists (optional but recommended)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">2.</span>
                  <span>Submit your profile for review</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">3.</span>
                  <span>We&apos;ll review and add you to the AI directory</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/contribute/${code}/upload`)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Upload Files
              </button>
              <button
                onClick={() => router.push(`/contribute/${code}/review`)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Review Answers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
              <p className="text-sm text-gray-600">Business Portal</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/contribute/${code}/upload`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Files
              </button>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{stats?.completionPercentage ?? 0}%</div>
                <div className="text-sm text-gray-600">
                  {stats?.answeredQuestions ?? 0} of {stats?.totalQuestions ?? 0} complete
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats?.completionPercentage ?? 0}%` }}
            ></div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {currentQuestion && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Question header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-blue-600 font-semibold">
                  Question {currentQuestion.question_number} of {questions.length}
                </div>
                {currentQuestion.answered && (
                  <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    ✓ Previously Answered
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {currentQuestion.question_text}
              </h2>
              {currentQuestion.help_text && (
                <p className="text-gray-600 italic">{currentQuestion.help_text}</p>
              )}
              <div className="text-sm text-gray-500 mt-2">
                ⏱ Suggested time: {Math.floor(currentQuestion.expected_duration_seconds / 60)}–{Math.ceil(currentQuestion.expected_duration_seconds / 60)} minutes
              </div>
            </div>
            
            {/* Answer mode toggle */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setAnswerMode('voice')}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  answerMode === 'voice'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎤 Voice Answer
              </button>
              <button
                onClick={() => setAnswerMode('text')}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  answerMode === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✍️ Type Answer
              </button>
            </div>
            
            {/* Answer input */}
            {answerMode === 'voice' ? (
              <div className="space-y-4">
                {recorderError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-red-700">{recorderError}</p>
                    <p className="text-sm text-red-600 mt-1">
                      Please allow microphone access when prompted by your browser.
                    </p>
                  </div>
                )}
                
                <div className="text-center py-8">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={submitting}
                    className={`w-32 h-32 rounded-full transition-all transform hover:scale-105 ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isRecording ? (
                      <div>
                        <div className="text-4xl">⏸</div>
                        <div className="text-sm mt-2">{duration.toFixed(1)}s</div>
                      </div>
                    ) : (
                      <div className="text-4xl">🎤</div>
                    )}
                  </button>
                  <p className="mt-4 text-gray-600">
                    {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
                  </p>
                  {!isRecording && !audioBlob && (
                    <p className="text-sm text-gray-500 mt-2">
                      Your browser will ask for microphone permission
                    </p>
                  )}
                </div>
                
                {audioBlob && !isRecording && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium mb-2">✓ Recording complete ({duration.toFixed(1)}s)</p>
                    <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={handleSubmitVoice}
                        disabled={submitting}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        {submitting ? 'Saving...' : 'Save Answer'}
                      </button>
                      <button
                        onClick={startRecording}
                        className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Re-record
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={8}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  disabled={submitting}
                />
                <button
                  onClick={handleSubmitText}
                  disabled={!textAnswer.trim() || submitting}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Answer'}
                </button>
              </div>
            )}
            
            {/* Status messages */}
            {error && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-4">
                <p className="text-green-700">{success}</p>
              </div>
            )}
            
            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || submitting}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                ← Previous
              </button>
              
              <button
                onClick={handleSkip}
                disabled={submitting}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Skip for now
              </button>
              
              <button
                onClick={handleNext}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

