'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
    >
      Print Receipt
    </button>
  );
}
