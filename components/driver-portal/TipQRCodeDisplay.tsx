'use client';

import React, { useState, useEffect } from 'react';
import { TouchButton } from '@/components/mobile/TouchButton';
import { MobileCard } from '@/components/mobile/MobileCard';

interface TipQRCodeDisplayProps {
  tipCode: string;
  tipPaymentLink: string;
  qrCodeUrl: string;
  onDone: () => void;
}

interface TipStats {
  count: number;
  total: number;
}

/**
 * TipQRCodeDisplay - Shows QR code for guests to scan and tip
 *
 * Features:
 * - Large QR code for easy scanning
 * - NFC tag support for tap-to-tip
 * - Share button for SMS/messaging
 * - Real-time tip counter (polls for updates)
 * - Copy link functionality
 */
export function TipQRCodeDisplay({
  tipCode,
  tipPaymentLink,
  qrCodeUrl,
  onDone,
}: TipQRCodeDisplayProps) {
  const [tipStats, setTipStats] = useState<TipStats>({ count: 0, total: 0 });
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string>('');
  const [showNfcInfo, setShowNfcInfo] = useState(false);

  // Poll for tip updates every 10 seconds
  useEffect(() => {
    const fetchTipStats = async () => {
      try {
        // We'd need a new API endpoint to get live tip stats
        // For now, this is a placeholder
        // const response = await fetch(`/api/tips/${tipCode}/stats`);
        // if (response.ok) {
        //   const data = await response.json();
        //   setTipStats({ count: data.count, total: data.total });
        // }
      } catch {
        // Silently fail - this is just a nice-to-have feature
      }
    };

    fetchTipStats();
    const interval = setInterval(fetchTipStats, 10000);
    return () => clearInterval(interval);
  }, [tipCode]);

  const handleShare = async () => {
    const shareData = {
      title: 'Tip Your Driver',
      text: 'Thank you for touring with us! Leave a tip for your driver:',
      url: tipPaymentLink,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to copy
        await handleCopy();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setShareError('Unable to share. Link copied to clipboard.');
        await handleCopy();
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tipPaymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setShareError('Unable to copy link');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Tour Complete!</h2>
        <p className="text-gray-600 mt-1">Show this QR code to guests for tips</p>
      </div>

      {/* QR Code */}
      <MobileCard variant="elevated" className="p-4">
        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg shadow-inner">
            <img
              src={qrCodeUrl}
              alt="Tip QR Code"
              className="w-64 h-64"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">Scan to leave a tip</p>
          <p className="text-xs text-gray-400 font-mono mt-1">Code: {tipCode}</p>
        </div>
      </MobileCard>

      {/* Tip Stats */}
      {tipStats.count > 0 && (
        <MobileCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tips Received</p>
              <p className="text-lg font-semibold text-gray-900">{tipStats.count} tips</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-lg font-semibold text-green-600">
                ${tipStats.total.toFixed(2)}
              </p>
            </div>
          </div>
        </MobileCard>
      )}

      {/* NFC Tag Support */}
      <MobileCard className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <button
          onClick={() => setShowNfcInfo(!showNfcInfo)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* NFC Icon */}
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9c0-.5.5-1 1-1h4c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1h-4c-.5 0-1-.5-1-1V9z"
                  />
                  <path
                    strokeLinecap="round"
                    d="M8 3v2M16 3v2"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">NFC Tag Ready</p>
                <p className="text-sm text-gray-600">Tap {showNfcInfo ? 'to hide' : 'for'} setup info</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showNfcInfo ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showNfcInfo && (
          <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
            <div className="bg-white rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="text-lg">📱</span>
                What are NFC Tags?
              </h4>
              <p className="text-sm text-gray-700">
                NFC tags are small, inexpensive stickers or cards that guests can tap with their phone
                to instantly open the tip page - no camera or scanning needed!
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="text-lg">🛒</span>
                Where to Get NFC Tags
              </h4>
              <p className="text-sm text-gray-700">
                Search "NFC tags" on Amazon - look for NTAG215 or NTAG216 tags. A pack of 10-50
                costs around $10-20. Get waterproof ones for durability!
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                How to Program
              </h4>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Download "NFC Tools" app (free, iOS/Android)</li>
                <li>Copy your tip link using the button below</li>
                <li>Open NFC Tools → Write → Add record → URL</li>
                <li>Paste your link and tap "Write"</li>
                <li>Hold the NFC tag to your phone's back</li>
              </ol>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <span className="text-lg">💡</span>
                Pro Tips
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Put a tag in your vehicle's cup holder area</li>
                <li>• Attach one to a small "Tap to Tip" card you hand out</li>
                <li>• The same link works for QR codes AND NFC tags</li>
                <li>• Tags work even when your phone is locked</li>
              </ul>
            </div>

            <div className="pt-2">
              <TouchButton
                variant="secondary"
                size="medium"
                fullWidth
                onClick={(e) => {
                  e?.stopPropagation();
                  handleCopy();
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Link for NFC Programming
                </span>
              </TouchButton>
            </div>
          </div>
        )}
      </MobileCard>

      {/* Error message */}
      {shareError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm text-center">
          {shareError}
        </div>
      )}

      {/* Copied confirmation */}
      {copied && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
          Link copied to clipboard!
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <TouchButton variant="primary" size="large" fullWidth onClick={handleShare}>
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share Link
          </span>
        </TouchButton>

        <TouchButton variant="secondary" size="large" fullWidth onClick={handleCopy}>
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy Link
          </span>
        </TouchButton>

        <TouchButton variant="ghost" size="large" fullWidth onClick={onDone}>
          Done
        </TouchButton>
      </div>

      {/* Link display */}
      <div className="text-center">
        <p className="text-xs text-gray-400 break-all">{tipPaymentLink}</p>
      </div>
    </div>
  );
}
