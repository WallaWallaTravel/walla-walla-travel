import Link from 'next/link';
import type { Metadata } from 'next';
import { Cormorant_Garamond } from 'next/font/google';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Exclusive Experiences for Members & Guests | Walla Walla Country Club',
  description:
    'Wine tours, geology adventures, and golf packages for Walla Walla Country Club members and guests. Every experience features dining at the club.',
};

export default function WWCCPartnerPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="bg-wwcc-dark">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p className={`${serif.className} text-white text-2xl md:text-3xl font-semibold`}>
              Walla Walla Country Club
            </p>
            <p className="text-white/50 text-xs tracking-wider mt-0.5">
              Est. 1923 &middot; Curated by Walla Walla Travel
            </p>
          </div>
          <a
            href="tel:+15092008000"
            className="text-white/80 hover:text-white transition-colors text-sm font-medium"
          >
            (509) 200-8000
          </a>
        </div>
      </header>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="bg-wwcc-dark">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-wwcc-sage text-sm font-medium tracking-wider uppercase mb-4">
              Exclusive Member Experiences
            </p>
            <h1 className={`${serif.className} text-4xl md:text-6xl text-white font-medium leading-tight mb-6`}>
              Wine, Golf &amp; Adventure — Starting at the Club
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-8 max-w-2xl">
              Bring your family, friends, and out-of-town guests for unforgettable Walla Walla
              experiences. Every outing features dining at the Walla Walla Country Club.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#packages"
                className="inline-block bg-wwcc-sage text-white px-7 py-3.5 rounded-lg font-medium hover:bg-[#648548] transition-colors text-center"
              >
                Explore Packages
              </a>
              <Link
                href="/book?source=wwcc"
                className="inline-block border border-white/40 text-white px-7 py-3.5 rounded-lg font-medium hover:bg-white/10 transition-colors text-center"
              >
                Request a Custom Experience
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Trust Bar ───────────────────────── */}
      <section className="bg-wwcc-sage">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-white font-semibold text-sm">Private Tours</p>
              <p className="text-white/70 text-xs mt-0.5">Exclusively for your group</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Club Dining</p>
              <p className="text-white/70 text-xs mt-0.5">Featured with every package</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Locally Owned</p>
              <p className="text-white/70 text-xs mt-0.5">Walla Walla based</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Luxury Transportation</p>
              <p className="text-white/70 text-xs mt-0.5">Private Mercedes Sprinter</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Family Callout ───────────────────────── */}
      <section className="bg-stone-50 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="border-l-4 border-wwcc-sage bg-white rounded-r-lg p-6 md:p-8 shadow-sm">
            <p className="text-wwcc-sage text-xs font-semibold tracking-wider uppercase mb-2">
              Share the Experience
            </p>
            <p className="text-gray-700 leading-relaxed">
              These experiences are designed for sharing — bring your spouse, kids, parents,
              college friends, or out-of-town visitors. The club is your launching pad for
              experiences the whole family can enjoy.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Wine Tour Packages ───────────────────────── */}
      <section id="packages" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-wwcc-sage text-xs font-semibold tracking-wider uppercase mb-2">
              Wine Tours
            </p>
            <h2 className={`${serif.className} text-3xl md:text-4xl font-medium text-gray-900`}>
              Wine Tour Packages
            </h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">
              Every wine tour features a dining experience at the Walla Walla Country Club
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Wine & Dine */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <div className="bg-wwcc-sage px-6 py-4">
                <h3 className={`${serif.className} text-xl text-white font-semibold`}>
                  Wine &amp; Dine
                </h3>
                <p className="text-white/80 text-sm mt-1">~5 hours &middot; Great for couples</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">2 wineries, hand-selected for your group</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Lunch arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-wine-dine"
                  className="block w-full text-center bg-wwcc-sage text-white py-3 rounded-lg font-medium hover:bg-[#648548] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* The Walla Walla Experience (Featured) */}
            <div className="bg-white rounded-lg overflow-hidden shadow-xl ring-2 ring-wwcc-sage flex flex-col">
              <div className="bg-wwcc-dark px-6 py-4">
                <p className="text-wwcc-sage text-[11px] font-semibold uppercase tracking-wider mb-1">
                  Most Popular
                </p>
                <h3 className={`${serif.className} text-xl text-white font-semibold`}>
                  The Walla Walla Experience
                </h3>
                <p className="text-white/70 text-sm mt-1">
                  6 hours &middot; Ideal for visiting friends &amp; family
                </p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">3 wineries with varietals focus</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Dinner reserved at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Private Mercedes Sprinter transportation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Bottled water &amp; snacks</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-experience"
                  className="block w-full text-center bg-wwcc-dark text-white py-3 rounded-lg font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Custom Wine & Dine */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <div className="bg-wwcc-sage px-6 py-4">
                <h3 className={`${serif.className} text-xl text-white font-semibold`}>
                  Custom Wine &amp; Dine
                </h3>
                <p className="text-white/80 text-sm mt-1">Flexible duration &middot; Perfect for groups</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Wineries tailored to your group&apos;s preferences</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Meal arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-custom"
                  className="block w-full text-center bg-wwcc-sage text-white py-3 rounded-lg font-medium hover:bg-[#648548] transition-colors"
                >
                  Request a Custom Experience
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Geology Tours ───────────────────────── */}
      <section className="py-16 md:py-20 bg-wwcc-dark">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-wwcc-sage text-xs font-semibold tracking-wider uppercase mb-2">
              Geology Tours
            </p>
            <h2 className={`${serif.className} text-3xl md:text-4xl font-medium text-white`}>
              Explore the Story Beneath the Vines
            </h2>
            <p className="text-white/60 mt-3 max-w-xl mx-auto">
              Discover the volcanic and glacial forces that shaped Walla Walla&apos;s world-class
              terroir with renowned geologist Dr. Kevin Pogue
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {/* Geology Tour + Club Lunch */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg flex flex-col">
              <div className="bg-wwcc-sage px-6 py-4">
                <h3 className={`${serif.className} text-xl text-white font-semibold`}>
                  Geology Tour + Club Lunch
                </h3>
                <p className="text-white/80 text-sm mt-1">Half day &middot; Fun for all ages</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Guided tour with Dr. Kevin Pogue</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Explore the volcanic and glacial terroir</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Lunch arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-geology"
                  className="block w-full text-center bg-wwcc-sage text-white py-3 rounded-lg font-medium hover:bg-[#648548] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Geology & Wine Combo */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg flex flex-col">
              <div className="bg-wwcc-sage px-6 py-4">
                <h3 className={`${serif.className} text-xl text-white font-semibold`}>
                  Geology &amp; Wine Combo
                </h3>
                <p className="text-white/80 text-sm mt-1">Full day &middot; Educational &amp; entertaining</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Geology education and wine tasting combined</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Visit 2 wineries with geological context</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Meal arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-geology-wine"
                  className="block w-full text-center bg-wwcc-sage text-white py-3 rounded-lg font-medium hover:bg-[#648548] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Golf Excursions ───────────────────────── */}
      <section className="py-16 md:py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-wwcc-sage text-xs font-semibold tracking-wider uppercase mb-2">
              Golf
            </p>
            <h2 className={`${serif.className} text-3xl md:text-4xl font-medium text-gray-900`}>
              Golf Excursions
            </h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">
              Play the region&apos;s best courses with wine country integration
              and curated dining experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Day Golf Excursion */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <div className="bg-wwcc-sage px-6 py-4">
                <h3 className={`${serif.className} text-xl text-white font-semibold`}>
                  Day Golf Excursion
                </h3>
                <p className="text-white/80 text-sm mt-1">1 day &middot; Bring your golf buddies</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Round at a regional course</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Afternoon wine tasting (2 wineries)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Lunch or dinner arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-golf-day"
                  className="block w-full text-center bg-wwcc-sage text-white py-3 rounded-lg font-medium hover:bg-[#648548] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Weekend Golf & Wine Getaway (Featured) */}
            <div className="bg-white rounded-lg overflow-hidden shadow-xl ring-2 ring-wwcc-sage flex flex-col">
              <div className="bg-wwcc-dark px-6 py-4">
                <p className="text-wwcc-sage text-[11px] font-semibold uppercase tracking-wider mb-1">
                  Most Popular
                </p>
                <h3 className={`${serif.className} text-xl text-white font-semibold`}>
                  Weekend Golf &amp; Wine Getaway
                </h3>
                <p className="text-white/70 text-sm mt-1">2 days &middot; Perfect for visiting friends</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-4 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Day 1: Golf at a premier regional course + dinner</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Day 2: Wine tour (3 wineries) + lunch</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-500 italic mb-6">
                  Dining arrangements customized to your itinerary
                </p>
                <Link
                  href="/book?source=wwcc&package=wwcc-golf-weekend"
                  className="block w-full text-center bg-wwcc-dark text-white py-3 rounded-lg font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* The Ultimate Experience */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <div className="bg-wwcc-sage px-6 py-4">
                <h3 className={`${serif.className} text-xl text-white font-semibold`}>
                  The Ultimate Experience
                </h3>
                <p className="text-white/80 text-sm mt-1">3 days &middot; The complete immersion</p>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Golf, wine touring (2-3 wineries per day), geology</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Dining arranged throughout your experience</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-sage mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-ultimate"
                  className="block w-full text-center bg-wwcc-sage text-white py-3 rounded-lg font-medium hover:bg-[#648548] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white border-l-4 border-wwcc-sage rounded-r-lg p-5 max-w-2xl mx-auto shadow-sm">
            <p className="text-gray-700 text-sm">
              Outside play at the Walla Walla Country Club is also available — ask us about
              arranging a round on the club&apos;s course.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Dining ───────────────────────── */}
      <section className="bg-wwcc-dark py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-wwcc-sage text-xs font-semibold tracking-wider uppercase mb-2">
            Dining
          </p>
          <h2 className={`${serif.className} text-3xl md:text-4xl font-medium text-white mb-6`}>
            A Curated Dining Experience at the Club
          </h2>
          <p className="text-white/75 text-base leading-relaxed mb-4">
            The Walla Walla Country Club restaurant offers a refined dining experience
            in a relaxed, welcoming atmosphere. From seasonal menus to locally sourced
            ingredients, every meal is crafted to complement your day in wine country.
          </p>
          <p className="text-white/55 text-sm leading-relaxed">
            Menus are tailored to your group&apos;s preferences and dietary needs, so
            every guest enjoys a memorable meal to round out the experience.
          </p>
        </div>
      </section>

      {/* ───────────────────────── How It Works ───────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className={`${serif.className} text-3xl md:text-4xl font-medium text-gray-900`}>
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-wwcc-sage text-white flex items-center justify-center text-lg font-semibold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Choose Your Experience
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Browse our packages or tell us exactly what you want — we build
                custom experiences every day.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-wwcc-sage text-white flex items-center justify-center text-lg font-semibold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                We Plan Every Detail
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Winery reservations, dining arrangements, and private Mercedes Sprinter
                transportation — all coordinated for you.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-wwcc-sage text-white flex items-center justify-center text-lg font-semibold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Enjoy Your Day
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Sit back and experience the best of Walla Walla — great wine, stunning
                scenery, and a meal at the club to cap it off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Final CTA ───────────────────────── */}
      <section className="bg-wwcc-dark py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className={`${serif.className} text-3xl md:text-5xl font-medium text-white mb-4`}>
            Invite Your Friends &amp; Family
          </h2>
          <p className="text-white/70 text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Whether you know exactly what you want or need help building the perfect day,
            we are here to make it happen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book?source=wwcc"
              className="inline-block bg-wwcc-sage text-white px-7 py-3.5 rounded-lg font-medium hover:bg-[#648548] transition-colors"
            >
              Request a Custom Experience
            </Link>
            <Link
              href="/book?source=wwcc&type=group"
              className="inline-block border border-white/40 text-white px-7 py-3.5 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              Plan a Group Outing
            </Link>
            <a
              href="tel:+15092008000"
              className="inline-block border border-white/40 text-white px-7 py-3.5 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              (509) 200-8000
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="bg-wwcc-dark border-t border-white/10 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <p className={`${serif.className} text-white text-xl font-semibold mb-1`}>
                Walla Walla Country Club
              </p>
              <p className="text-white/40 text-xs tracking-wider mb-3">
                Est. 1923
              </p>
              <p className="text-white/60 text-sm">
                700 Country Club Dr, Walla Walla, WA 99362
              </p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs mb-1">Experiences curated by</p>
                <p className="text-white font-medium text-sm">Walla Walla Travel</p>
              </div>
            </div>
            <div>
              <p className="text-white/40 text-xs tracking-wider uppercase mb-3">
                Contact
              </p>
              <p className="text-white/70 text-sm mb-1.5">
                <a href="tel:+15092008000" className="hover:text-white transition-colors">
                  (509) 200-8000
                </a>
              </p>
              <p className="text-white/70 text-sm">
                <a href="mailto:info@wallawalla.travel" className="hover:text-white transition-colors">
                  info@wallawalla.travel
                </a>
              </p>
            </div>
            <div>
              <p className="text-white/40 text-xs tracking-wider uppercase mb-3">
                Legal
              </p>
              <div className="space-y-1.5">
                <Link href="/privacy" className="block text-white/60 text-sm hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block text-white/60 text-sm hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/cancellation-policy" className="block text-white/60 text-sm hover:text-white transition-colors">
                  Cancellation Policy
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-white/30 text-sm">
              &copy; {new Date().getFullYear()} Walla Walla Travel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
