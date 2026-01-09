/**
 * Privacy Policy Page
 * Server Component - comprehensive privacy policy for ChatGPT Store compliance
 */

import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Walla Walla Travel',
  description: 'Privacy policy for Walla Walla Travel - how we collect, use, and protect your personal information.'
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: January 8, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">

          {/* Introduction */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              Walla Walla Travel (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              visit our website wallawalla.travel and use our services, including our AI-powered trip planning tools.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <div>
                <p className="font-semibold">1.1 Personal Information You Provide</p>
                <p className="mt-2">When you book a tour, contact us, or use our services, we may collect:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Name and contact information (email, phone number)</li>
                  <li>Billing and payment information (processed securely via Stripe)</li>
                  <li>Tour preferences and special requests</li>
                  <li>Communications you send to us</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">1.2 Information Collected Automatically</p>
                <p className="mt-2">When you visit our website, we automatically collect:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Device information (browser type, operating system)</li>
                  <li>IP address and approximate location</li>
                  <li>Pages visited and time spent on our site</li>
                  <li>Referring website or source</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">1.3 AI Chat Interactions</p>
                <p className="mt-2">
                  When you use our AI trip planning assistant, we collect the questions you ask and
                  preferences you share to provide personalized recommendations. Chat history may be
                  retained to improve our services.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process and fulfill your tour bookings</li>
                <li>Communicate with you about your reservations</li>
                <li>Provide personalized trip recommendations</li>
                <li>Improve our website and services</li>
                <li>Send occasional updates about Walla Walla wine country (with your consent)</li>
                <li>Comply with legal obligations</li>
                <li>Detect and prevent fraud</li>
              </ul>
            </div>
          </section>

          {/* Sharing Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Sharing Your Information</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>We do not sell your personal information. We may share your information with:</p>

              <div>
                <p className="font-semibold">3.1 Service Providers</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>Stripe:</strong> For secure payment processing</li>
                  <li><strong>Supabase:</strong> For secure data storage</li>
                  <li><strong>Vercel:</strong> For website hosting</li>
                  <li><strong>Google Analytics:</strong> For website analytics (anonymized)</li>
                  <li><strong>OpenAI:</strong> For AI-powered trip planning features</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">3.2 Winery Partners</p>
                <p className="mt-2">
                  When you book tastings, we share necessary information (name, party size, time)
                  with the wineries you&apos;re visiting to confirm your reservations.
                </p>
              </div>

              <div>
                <p className="font-semibold">3.3 Legal Requirements</p>
                <p className="mt-2">
                  We may disclose information if required by law or to protect our rights,
                  safety, or property.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookies and Tracking Technologies</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Remember your preferences and login status</li>
                <li>Understand how you use our website</li>
                <li>Improve our services based on usage patterns</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. Disabling cookies may affect
                some website functionality.
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>We implement industry-standard security measures to protect your information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>HTTPS encryption for all data transmission</li>
                <li>Secure, encrypted payment processing via Stripe</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication requirements</li>
              </ul>
              <p className="mt-4">
                While we strive to protect your data, no method of transmission over the Internet
                is 100% secure. We cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your data</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
              </ul>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">California Residents (CCPA)</p>
                <p className="mt-2">
                  California residents have additional rights under the California Consumer Privacy Act.
                  We do not sell personal information. To exercise your rights, contact us at
                  privacy@wallawalla.travel.
                </p>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">European Residents (GDPR)</p>
                <p className="mt-2">
                  If you are in the European Economic Area, you have rights under the General Data
                  Protection Regulation. Contact us to exercise these rights.
                </p>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>We retain your personal information for as long as necessary to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide our services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
              </ul>
              <p className="mt-4">
                Booking records are typically retained for 7 years for tax and legal purposes.
                You can request deletion of your data at any time, subject to legal retention requirements.
              </p>
            </div>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Links</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Our website may contain links to third-party websites (wineries, restaurants, etc.).
                We are not responsible for the privacy practices of these external sites. We encourage
                you to review their privacy policies.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children&apos;s Privacy</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Our services are intended for users 21 years and older (wine tourism). We do not
                knowingly collect personal information from children under 13. If we learn we have
                collected such information, we will delete it promptly.
              </p>
            </div>
          </section>

          {/* AI and Automated Decision-Making */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. AI and Automated Decision-Making</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                We use AI-powered tools to provide trip recommendations and answer questions about
                Walla Walla wine country. These tools:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process your questions to provide relevant answers</li>
                <li>Do not make decisions that significantly affect you without human oversight</li>
                <li>May improve over time based on aggregate usage patterns</li>
              </ul>
              <p className="mt-4">
                You can always contact our human team for personalized assistance at info@wallawalla.travel.
              </p>
            </div>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the
                top indicates when changes were made. Continued use of our services after changes
                constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* Contact Us */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <div className="space-y-2 text-gray-700 leading-relaxed">
              <p>
                Questions about this Privacy Policy? Contact our privacy team:
              </p>
              <p className="mt-4">
                <strong>Email:</strong> privacy@wallawalla.travel<br />
                <strong>General Inquiries:</strong> info@wallawalla.travel<br />
                <strong>Phone:</strong> 509-200-8000<br />
                <strong>Address:</strong> Walla Walla, WA
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
