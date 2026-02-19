/**
 * Privacy Policy Page
 * Required for ChatGPT GPT Store listing and general compliance.
 */

import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Walla Walla Travel',
  description: 'Privacy policy for Walla Walla Travel — how we collect, use, and protect your personal information.',
  alternates: {
    canonical: 'https://wallawalla.travel/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            ← Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: February 18, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">

          {/* Introduction */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              Walla Walla Travel (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website wallawalla.travel and related services,
              including AI-powered tools available through the ChatGPT Store. This Privacy Policy explains what information
              we collect, how we use it, and your choices regarding your data.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>1.1 Information You Provide:</strong> When you book a tour, submit an inquiry, or contact us,
                we collect information you voluntarily provide, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name and contact information (email, phone number)</li>
                <li>Tour preferences (dates, party size, winery interests)</li>
                <li>Messages and communications with our team</li>
                <li>Payment information (processed securely through our payment provider — we do not store credit card numbers)</li>
              </ul>
              <p>
                <strong>1.2 Information Collected Automatically:</strong> When you visit our website, we may automatically collect:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Browser type and device information</li>
                <li>Pages visited and time spent on the site</li>
                <li>Referring website or search terms</li>
                <li>IP address (anonymized for analytics)</li>
              </ul>
              <p>
                <strong>1.3 AI Chat Interactions:</strong> When you use our geology chat feature on the website,
                we store chat messages with anonymized session identifiers. We do not link chat messages to your personal
                identity unless you voluntarily provide identifying information in the conversation.
              </p>
              <p>
                <strong>1.4 ChatGPT Store GPTs:</strong> When you interact with our GPTs (Walla Walla Travel Concierge,
                Walla Walla Geology Guide) through ChatGPT, your conversations are handled by OpenAI. We only receive
                data when the GPT calls our API endpoints — specifically, search queries and inquiry submissions. We do
                not receive or store your ChatGPT conversation history.
              </p>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process and fulfill tour bookings and inquiries</li>
                <li>Communicate with you about your reservations</li>
                <li>Coordinate with wineries and restaurants for your itinerary</li>
                <li>Improve our website, services, and AI tools</li>
                <li>Respond to your questions and support requests</li>
                <li>Send booking confirmations and follow-up communications</li>
              </ul>
            </div>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>We do not sell your personal information.</strong> We may share limited information with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Transportation partner:</strong> NW Touring &amp; Concierge (Northwest Touring LLC), our preferred
                  transportation provider, receives booking details necessary to operate your tour</li>
                <li><strong>Wineries and restaurants:</strong> We share your name and party size when making reservations on your behalf</li>
                <li><strong>Payment processors:</strong> Secure payment processing through industry-standard providers</li>
                <li><strong>Hosting and infrastructure:</strong> Our website and database are hosted on Vercel and Supabase,
                  both of which maintain their own privacy and security practices</li>
              </ul>
              <p>
                We may also disclose information if required by law or to protect the safety of our guests and staff.
              </p>
            </div>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Storage and Security</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Your data is stored in a secure PostgreSQL database hosted by Supabase with encryption at rest and in transit.
                We use industry-standard security measures to protect your information, including HTTPS encryption
                for all web traffic and secure authentication for administrative access.
              </p>
              <p>
                While we take reasonable steps to protect your data, no method of electronic transmission or storage
                is 100% secure. We cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Cookies</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Our website uses cookies for essential functionality (such as authentication sessions) and may use
                analytics cookies to understand how visitors use the site. You can control cookie preferences through
                your browser settings.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access</strong> the personal information we hold about you</li>
                <li><strong>Correct</strong> inaccurate or incomplete information</li>
                <li><strong>Delete</strong> your personal information (subject to legal and business retention requirements)</li>
                <li><strong>Opt out</strong> of marketing communications at any time</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at info@wallawalla.travel or (509) 200-8000.
              </p>
            </div>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Third-Party Services</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Our website and services integrate with third-party platforms that have their own privacy policies:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>OpenAI / ChatGPT:</strong> Our GPT Store integrations are subject
                  to <a href="https://openai.com/policies/privacy-policy" className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">OpenAI&apos;s Privacy Policy</a></li>
                <li><strong>Supabase:</strong> Database hosting and authentication</li>
                <li><strong>Vercel:</strong> Website hosting</li>
              </ul>
              <p>
                We encourage you to review the privacy policies of these services.
              </p>
            </div>
          </section>

          {/* Children */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children&apos;s Privacy</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Our services are not directed to individuals under 18 years of age. Wine tasting services require
                guests to be 21 or older. We do not knowingly collect personal information from children.
              </p>
            </div>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Policy</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top indicates
                when the most recent changes were made. Continued use of our services after changes constitutes
                acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <div className="space-y-2 text-gray-700 leading-relaxed">
              <p>
                Questions about this Privacy Policy? We&apos;re happy to help.
              </p>
              <p>
                <strong>Email:</strong> info@wallawalla.travel<br />
                <strong>Phone:</strong> (509) 200-8000<br />
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
          <Link href="/contact" className="text-blue-600 hover:text-blue-800">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
