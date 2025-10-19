'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Content() {
  const searchParams = useSearchParams();
  const booking = searchParams.get('booking');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        {booking && <p className="text-gray-600">Booking: {booking}</p>}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Content /></Suspense>;
}
