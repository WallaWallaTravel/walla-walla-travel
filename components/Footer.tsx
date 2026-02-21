import Link from 'next/link';
import { COMPANY_INFO, getPhoneLink, getEmailLink } from '@/lib/config/company';
import { isEventsDomain, getTravelUrl, getEventsUrl } from '@/lib/utils/domain';

export default async function Footer() {
  const onEventsDomain = await isEventsDomain();

  return (
    <footer className="bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {onEventsDomain ? 'Walla Walla Events' : COMPANY_INFO.name}
            </h3>
            <p className="text-gray-600 mb-4">
              {onEventsDomain
                ? 'Discover what\'s happening in Walla Walla, Washington.'
                : COMPANY_INFO.tagline}
            </p>
            {!onEventsDomain && (
              <p className="text-gray-600 text-sm">{COMPANY_INFO.address.full}</p>
            )}
          </div>

          {/* Quick Links — domain-aware */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              {onEventsDomain ? 'Events' : 'Quick Links'}
            </h4>
            <ul className="space-y-2">
              {onEventsDomain ? (
                <>
                  <li>
                    <Link href="/events" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Upcoming Events
                    </Link>
                  </li>
                  <li>
                    <Link href="/events#categories" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Categories
                    </Link>
                  </li>
                  <li>
                    <Link href="/events?free=true" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Free Events
                    </Link>
                  </li>
                  <li>
                    <Link href="/organizer-portal" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Submit an Event
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/tours" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Tours & Services
                    </Link>
                  </li>
                  <li>
                    <Link href="/events" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Events
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Contact
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Third column — domain-aware */}
          <div>
            {onEventsDomain ? (
              <>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                  Explore Wine Country
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a href={getTravelUrl('/wineries')} className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Wineries
                    </a>
                  </li>
                  <li>
                    <a href={getTravelUrl('/tours')} className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Tours
                    </a>
                  </li>
                  <li>
                    <a href={getTravelUrl('/plan-your-visit')} className="text-gray-600 hover:text-[#8B1538] transition-colors">
                      Plan Your Visit
                    </a>
                  </li>
                </ul>
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <a
                    href={getTravelUrl('/')}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#8B1538] transition-colors"
                  >
                    Part of the
                    <span className="font-semibold text-gray-900">Walla Walla Travel</span>
                    family
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </>
            ) : (
              <>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Get In Touch</h4>
                <div className="space-y-3">
                  <a
                    href={getPhoneLink()}
                    className="flex items-center text-gray-600 hover:text-[#8B1538] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#8B1538]/10 flex items-center justify-center mr-3 group-hover:bg-[#8B1538]/20 transition-colors">
                      <svg className="w-5 h-5 text-[#8B1538]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Call us</div>
                      <div className="font-semibold">{COMPANY_INFO.phone.formatted}</div>
                    </div>
                  </a>

                  <a
                    href={getEmailLink()}
                    className="flex items-center text-gray-600 hover:text-[#8B1538] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#8B1538]/10 flex items-center justify-center mr-3 group-hover:bg-[#8B1538]/20 transition-colors">
                      <svg className="w-5 h-5 text-[#8B1538]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Email us</div>
                      <div className="font-semibold">{COMPANY_INFO.email.general}</div>
                    </div>
                  </a>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} {onEventsDomain ? 'Walla Walla Events' : COMPANY_INFO.name}. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-gray-600 hover:text-[#8B1538] text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-[#8B1538] text-sm transition-colors">
              Terms of Service
            </Link>
            {!onEventsDomain && (
              <Link href="/cancellation-policy" className="text-gray-600 hover:text-[#8B1538] text-sm transition-colors">
                Cancellation Policy
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
