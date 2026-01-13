'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AddToHomeScreen() {
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      return;
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome install
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Show iOS instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        setShowIOSInstructions(true);
      }
    }
  };

  // Don't show if already running as PWA
  if (isStandalone) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4m-4 4V4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
        </svg>
        Add to Home Screen
      </button>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-4">
              Add to Home Screen
            </h3>
            <div className="space-y-4 text-sm text-stone-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0 text-stone-500 font-medium">
                  1
                </div>
                <p>
                  Tap the <strong>Share</strong> button{' '}
                  <svg className="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>{' '}
                  at the bottom of Safari
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0 text-stone-500 font-medium">
                  2
                </div>
                <p>
                  Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0 text-stone-500 font-medium">
                  3
                </div>
                <p>
                  Tap <strong>&quot;Add&quot;</strong> in the top right
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-6 w-full py-3 bg-[#722F37] text-white rounded-xl font-medium hover:bg-[#8B1538] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
