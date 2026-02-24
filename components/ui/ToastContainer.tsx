'use client';

import type { Toast } from '@/lib/hooks/useToast';

const TYPE_STYLES: Record<Toast['type'], { bg: string; text: string; icon: string }> = {
  success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: '✓' },
  error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: '!' },
  info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: 'i' },
};

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => {
        const style = TYPE_STYLES[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-sm animate-in fade-in slide-in-from-top-2 ${style.bg}`}
            role="alert"
          >
            <span className={`font-bold text-sm ${style.text} flex-shrink-0`}>
              {style.icon}
            </span>
            <p className={`text-sm font-medium ${style.text} flex-1`}>{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              className={`${style.text} opacity-60 hover:opacity-100 text-lg leading-none flex-shrink-0`}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
