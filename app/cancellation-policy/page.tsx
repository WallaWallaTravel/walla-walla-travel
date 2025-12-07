/**
 * Cancellation Policy Page
 */

import Link from 'next/link';

export const metadata = {
  title: 'Cancellation Policy | Walla Walla Travel',
  description: 'Cancellation and refund policy for Walla Walla Travel wine country tours'
};

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/book"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            ← Back
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">Cancellation Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: November 11, 2025</p>
        </div>

        {/* Quick Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-blue-900 mb-3">Quick Summary</h2>
          <ul className="space-y-2 text-blue-800">
            <li>✅ <strong>30+ days before:</strong> Full refund</li>
            <li>⚠️ <strong>15-29 days before:</strong> 50% refund</li>
            <li>❌ <strong>Less than 15 days:</strong> No refund (transfer/reschedule available)</li>
            <li>🌤️ <strong>Weather:</strong> Full refund or reschedule</li>
          </ul>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              We understand that plans change. This policy helps us manage our small business while being as flexible as possible with our guests. 
              Please review our cancellation terms carefully before booking.
            </p>
          </section>

          {/* Cancellation Tiers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Cancellation Timeline</h2>
            
            <div className="space-y-6">
              {/* 30+ Days */}
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-2">30+ Days Before Tour</h3>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Full Refund (100%)</strong><br />
                  Cancel at least 30 days before your scheduled tour date and receive a complete refund of your deposit and any payments made. 
                  No questions asked.
                </p>
              </div>

              {/* 15-29 Days */}
              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-2">15-29 Days Before Tour</h3>
                <p className="text-gray-700 leading-relaxed">
                  <strong>50% Refund</strong><br />
                  Cancellations made 15-29 days before your tour will receive a 50% refund. At this point, we've likely declined other bookings 
                  for your date and made reservations on your behalf.
                </p>
              </div>

              {/* Less than 15 Days */}
              <div className="border-l-4 border-red-500 pl-4 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Less Than 15 Days Before Tour</h3>
                <p className="text-gray-700 leading-relaxed">
                  <strong>No Refund</strong><br />
                  Unfortunately, cancellations within 15 days of your tour are non-refundable. However, you have two options:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                  <li><strong>Transfer:</strong> Give your reservation to friends/family</li>
                  <li><strong>Reschedule:</strong> Move your tour to another available date (one-time, subject to availability)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Weather and Emergencies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Weather and Emergencies</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>2.1 Severe Weather:</strong> If conditions are unsafe for travel (heavy snow, ice, flooding, etc.), we will contact you to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Reschedule your tour at no additional charge, OR</li>
                <li>Provide a full refund</li>
              </ul>
              <p>
                The decision to cancel due to weather is at the discretion of Walla Walla Travel for safety reasons.
              </p>
              
              <p>
                <strong>2.2 Emergencies:</strong> We understand that true emergencies happen (medical, family, etc.). 
                Contact us immediately and we'll work with you on a case-by-case basis to find a fair solution.
              </p>
            </div>
          </section>

          {/* Cancellation by Us */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Cancellation by Walla Walla Travel</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                If we need to cancel your tour due to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Vehicle breakdown</li>
                <li>Driver illness</li>
                <li>Circumstances beyond our control</li>
              </ul>
              <p>
                You will receive a <strong>full refund</strong> or the option to reschedule at no additional charge.
              </p>
            </div>
          </section>

          {/* No-Shows */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. No-Shows and Late Arrivals</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>4.1 No-Show:</strong> If you do not show up for your scheduled tour and do not contact us, 
                your reservation is considered a no-show and is <strong>non-refundable</strong>.
              </p>
              <p>
                <strong>4.2 Late Arrival:</strong> If you arrive late, we'll do our best to accommodate the remaining itinerary. 
                However, no refunds or credits will be provided for missed portions of the tour due to late arrival.
              </p>
              <p className="text-sm text-gray-600 italic">
                💡 Tip: Save our phone number and call if you're running late! We're understanding and flexible.
              </p>
            </div>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Modifications vs. Cancellations</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>Need to change your plans but not cancel?</strong> Great! Modifications are different from cancellations:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Party Size Changes:</strong> Let us know ASAP. Additional guests may incur extra charges; reducing party size may not reduce cost if vehicle/reservations are already set.</li>
                <li><strong>Date Changes:</strong> Rescheduling is generally free if done more than 30 days in advance (subject to availability).</li>
                <li><strong>Itinerary Changes:</strong> We can adjust wineries, timing, etc. up to 48 hours before your tour at no charge.</li>
              </ul>
            </div>
          </section>

          {/* How to Cancel */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. How to Cancel or Modify</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                To cancel or modify your reservation:
              </p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Contact us as soon as possible</li>
                <li>Provide your reservation number and name</li>
                <li>Let us know if you want to cancel, reschedule, or transfer</li>
              </ol>
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <p className="font-bold text-gray-900">Contact Information:</p>
                <p className="text-gray-700 mt-2">
                  <strong>Email:</strong> info@wallawalla.travel<br />
                  <strong>Phone:</strong> 509-200-8000<br />
                  <strong>Response Time:</strong> Usually within 2 hours during business hours
                </p>
              </div>
            </div>
          </section>

          {/* Refund Processing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Refund Processing</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>7.1 Timeline:</strong> Approved refunds will be processed within 5-7 business days.
              </p>
              <p>
                <strong>7.2 Method:</strong> Refunds will be issued to the original payment method:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Card payments: Refunded to card (may take 5-10 business days to appear)</li>
                <li>Check payments: Refund check mailed to billing address</li>
              </ul>
            </div>
          </section>

          {/* Group Bookings */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Group and Corporate Bookings</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Large group bookings (8+ guests) or corporate events may have custom cancellation terms agreed upon at booking. 
                Please refer to your booking confirmation for specific terms.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions?</h2>
            <div className="space-y-2 text-gray-700 leading-relaxed">
              <p>
                We're a small, family-run business and we genuinely care about your experience. If you have concerns about canceling, 
                talk to us first! We'll always try to work something out.
              </p>
              <p className="mt-4">
                <strong>Email:</strong> info@wallawalla.travel<br />
                <strong>Phone:</strong> 509-200-8000
              </p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-x-4 text-sm">
          <Link href="/terms" className="text-blue-600 hover:text-blue-800">
            Terms and Conditions
          </Link>
          <span className="text-gray-400">|</span>
          <Link href="/book" className="text-blue-600 hover:text-blue-800">
            Book a Tour
          </Link>
        </div>
      </div>
    </div>
  );
}

