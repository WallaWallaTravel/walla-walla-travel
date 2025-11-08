"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Load VoiceInspector only on client side to prevent SSR issues
const VoiceInspector = dynamic(
  () => import('@/components/inspections/VoiceInspector').then(mod => ({ default: mod.VoiceInspector })),
  { ssr: false, loading: () => <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="text-gray-600">Loading voice inspector...</div></div> }
);

const MOCK_INSPECTION_ITEMS = [
  { id: '1', label: 'Tire Pressure', category: 'tires' },
  { id: '2', label: 'Brake Lights', category: 'lights' },
  { id: '3', label: 'Windshield Condition', category: 'glass' },
  { id: '4', label: 'Oil Level', category: 'fluids' },
  { id: '5', label: 'Horn', category: 'safety' },
];

export default function VoiceInspectorTestPage() {
  const [mounted, setMounted] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleComplete = (inspectionResults: any) => {
    setResults(inspectionResults);
    setShowInspector(false);
    console.log('✅ Inspection Complete:', inspectionResults);
  };

  const handleCancel = () => {
    setShowInspector(false);
    console.log('❌ Inspection Cancelled');
  };

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (showInspector) {
    return (
      <VoiceInspector
        items={MOCK_INSPECTION_ITEMS}
        onComplete={handleComplete}
        onCancel={handleCancel}
        vehicleName="Test Vehicle"
        inspectionType="pre_trip"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">🎤 Voice Inspector Test</h1>
        
        {results ? (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-green-600">✅ Last Results:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs max-h-64 mb-3">
              {JSON.stringify(results, null, 2)}
            </pre>
            <button
              onClick={() => setResults(null)}
              className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600 transition"
            >
              Clear Results
            </button>
          </div>
        ) : null}

        <button
          onClick={() => setShowInspector(true)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-md mb-4"
        >
          🎤 Start Voice Inspection
        </button>

        <div className="bg-blue-50 p-4 rounded-lg text-sm mb-4">
          <p className="font-semibold text-blue-900 mb-2">📋 Quick Test:</p>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Click "Start Voice Inspection"</li>
            <li>Grant microphone permission</li>
            <li>Listen to the prompt</li>
            <li>Say <strong>"Pass"</strong> or <strong>"Fail"</strong></li>
            <li>Try: <strong>"Fail crack in windshield"</strong></li>
            <li>Say <strong>"Help"</strong> for all commands</li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg text-sm mb-4">
          <p className="font-semibold text-yellow-900 mb-2">🎯 Voice Commands:</p>
          <div className="text-yellow-800 space-y-1 text-xs">
            <p>• <code className="bg-yellow-100 px-1 rounded">Pass</code> - Mark item as passed</p>
            <p>• <code className="bg-yellow-100 px-1 rounded">Fail</code> - Mark item as failed</p>
            <p>• <code className="bg-yellow-100 px-1 rounded">Fail [note]</code> - Fail with note</p>
            <p>• <code className="bg-yellow-100 px-1 rounded">Repeat</code> - Repeat current item</p>
            <p>• <code className="bg-yellow-100 px-1 rounded">Help</code> - Show all commands</p>
            <p>• <code className="bg-yellow-100 px-1 rounded">Cancel</code> - Exit inspection</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-sm">
          <p className="font-semibold mb-2 text-gray-700">✅ Requirements:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-xs">
            <li><strong>Browser:</strong> Chrome, Edge, or Safari (latest)</li>
            <li><strong>Connection:</strong> HTTPS or localhost</li>
            <li><strong>Permission:</strong> Microphone access</li>
            <li><strong>Audio:</strong> Speakers or headphones</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

