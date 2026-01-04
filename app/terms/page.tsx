/**
 * Terms and Conditions Page
 * Server Component - fetches deposit settings from database
 */

import Link from 'next/link';
import { getSetting } from '@/lib/settings/settings-service';

export const metadata = {
  title: 'Terms and Conditions | Walla Walla Travel',
  description: 'Terms and conditions for Walla Walla Travel wine country tours and transportation services'
};

// Default deposit amounts (fallback if settings unavailable)
const DEFAULT_DEPOSITS = {
  smallGroup: 250,
  largeGroup: 350,
};

export default async function TermsPage() {
  // Fetch deposit settings from database
  let smallGroupDeposit = DEFAULT_DEPOSITS.smallGroup;
  let largeGroupDeposit = DEFAULT_DEPOSITS.largeGroup;

  try {
    const depositSettings = await getSetting('deposit_rules');
    if (depositSettings?.reserve_refine) {
      smallGroupDeposit = depositSettings.reserve_refine['1-7'] ?? DEFAULT_DEPOSITS.smallGroup;
      largeGroupDeposit = depositSettings.reserve_refine['8-14'] ?? DEFAULT_DEPOSITS.largeGroup;
    }
  } catch {
    // Use defaults if settings fetch fails
  }
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
          <h1 className="text-4xl font-bold text-gray-900 mt-4">Terms and Conditions</h1>
          <p className="text-gray-600 mt-2">Last updated: November 11, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              Welcome to Walla Walla Travel. By booking a tour or service with us, you agree to the following terms and conditions. 
              Please read them carefully before making a reservation.
            </p>
          </section>

          {/* Booking and Reservations */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Booking and Reservations</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>1.1 Deposit:</strong> A deposit is required to secure your reservation. Deposit amounts vary based on party size:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>1-7 guests: ${smallGroupDeposit} deposit</li>
                <li>8-14 guests: ${largeGroupDeposit} deposit</li>
                <li>15+ guests: Custom deposit amount (contact us)</li>
              </ul>
              <p>
                <strong>1.2 Final Payment:</strong> Final payment is due within 48 hours after your tour concludes. 
                This allows us to accurately bill for actual service time, lunch costs, and any additional services provided during your experience.
              </p>
              <p>
                <strong>1.3 Itinerary Confirmation:</strong> After your deposit is received, we will contact you to finalize your itinerary. 
                Tours are not considered confirmed until you receive written confirmation from Walla Walla Travel.
              </p>
            </div>
          </section>

          {/* Services */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Services Provided</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>2.1 Transportation:</strong> We provide safe, professional transportation to Walla Walla wineries and other destinations 
                as agreed upon in your itinerary.
              </p>
              <p>
                <strong>2.2 Customization:</strong> We work with you to create a personalized experience, including winery selections, 
                lunch reservations, and timing preferences.
              </p>
              <p>
                <strong>2.3 What's Not Included:</strong> Unless otherwise stated, services do not include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Wine tasting fees at wineries</li>
                <li>Meals and beverages</li>
                <li>Gratuities for your driver (appreciated but not required)</li>
                <li>Personal expenses</li>
              </ul>
            </div>
          </section>

          {/* Cancellation Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Cancellation Policy</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                For detailed cancellation terms, please see our <Link href="/cancellation-policy" className="text-blue-600 hover:text-blue-800 underline">Cancellation Policy</Link>.
              </p>
            </div>
          </section>

          {/* Changes and Modifications */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Changes and Modifications</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>4.1 By Customer:</strong> We understand plans change! You may request changes to your itinerary up to 48 hours before 
                your scheduled tour. Changes made within 48 hours are subject to availability.
              </p>
              <p>
                <strong>4.2 By Walla Walla Travel:</strong> We reserve the right to make changes to your itinerary due to circumstances 
                beyond our control (e.g., winery closures, weather, vehicle issues). We will notify you immediately and work to provide 
                comparable alternatives.
              </p>
            </div>
          </section>

          {/* Guest Conduct */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Guest Conduct</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>5.1 Alcohol Consumption:</strong> All guests must be 21+ years old to participate in wine tasting. 
                We promote responsible drinking and reserve the right to refuse service to intoxicated guests.
              </p>
              <p>
                <strong>5.2 Vehicle Care:</strong> Guests are responsible for any damage to the vehicle caused by their party. 
                Additional cleaning fees may apply for excessive mess (up to $250 for specialized cleaning services if needed).
              </p>
              <p>
                <strong>5.3 Punctuality:</strong> Please be ready at your scheduled pickup time. Extended wait times may impact your itinerary.
              </p>
            </div>
          </section>

          {/* Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Liability</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>6.1 Insurance:</strong> Walla Walla Travel maintains appropriate commercial vehicle insurance and liability coverage.
              </p>
              <p>
                <strong>6.2 Personal Belongings:</strong> We are not responsible for lost, stolen, or damaged personal items. 
                Please keep valuables secure.
              </p>
              <p>
                <strong>6.3 Third-Party Services:</strong> Wineries, restaurants, and other venues are independent businesses. 
                We are not liable for their services, policies, or operations.
              </p>
            </div>
          </section>

          {/* Weather and Delays */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Weather and Delays</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Tours operate in most weather conditions. In cases of severe weather or unsafe driving conditions, 
                we may need to reschedule your tour at no additional charge.
              </p>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Privacy</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                We collect and store personal information (name, email, phone) to provide our services. 
                We do not sell or share your information with third parties except as necessary to fulfill your booking 
                (e.g., winery reservations).
              </p>
            </div>
          </section>

          {/* Disputes */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disputes and Resolution</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                If you have any concerns during or after your tour, please contact us immediately at info@wallawalla.travel or 509-200-8000. 
                We're committed to making things right.
              </p>
              <p>
                These terms are governed by the laws of Washington State. Any disputes will be resolved in Walla Walla County, Washington.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to These Terms</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                We may update these terms from time to time. The "Last updated" date at the top indicates when the most recent changes were made. 
                Continued use of our services after changes constitutes acceptance of the updated terms.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <div className="space-y-2 text-gray-700 leading-relaxed">
              <p>
                Questions about these terms? We're happy to clarify!
              </p>
              <p>
                <strong>Email:</strong> info@wallawalla.travel<br />
                <strong>Phone:</strong> 509-200-8000<br />
                <strong>Address:</strong> Walla Walla, WA
              </p>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-x-4 text-sm">
          <Link href="/cancellation-policy" className="text-blue-600 hover:text-blue-800">
            Cancellation Policy
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

