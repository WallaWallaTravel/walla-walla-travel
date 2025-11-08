"use client";

import { useState } from 'react';

export default function VoiceInspectorTestPage() {
  const [step, setStep] = useState(0);

  if (step === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">🎤 Voice Inspector Test</h1>
          <p className="text-gray-700 mb-4">
            Basic page loaded successfully! Click below to continue.
          </p>
          <button
            onClick={() => setStep(1)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Continue to Voice Test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Step 2</h1>
        <p className="text-gray-700 mb-4">
          Voice inspector would load here. For now, this confirms the page works.
        </p>
        <button
          onClick={() => setStep(0)}
          className="w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
