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
    <div className="min-h-screen bg-wwcc-cream">
      {/* ───────────────────────── Header Bar ───────────────────────── */}
      <header className="bg-wwcc-dark border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <p
              className={`${serif.className} text-white text-3xl md:text-4xl font-semibold tracking-wide`}
            >
              Walla Walla Country Club
            </p>
            <p className="text-wwcc-cream/50 text-[11px] uppercase tracking-[0.25em] mt-1.5">
              Est. 1923 &middot; Member Experiences
            </p>
            <p className="text-wwcc-cream/70 text-sm mt-1">
              Curated by Walla Walla Travel
            </p>
          </div>
          <a
            href="tel:+15092008000"
            className="text-wwcc-cream/90 font-medium hover:text-white transition-colors text-sm md:text-base"
          >
            (509) 200-8000
          </a>
        </div>
      </header>

      {/* ───────────────────────── Hero Section ───────────────────────── */}
      <section className="bg-gradient-to-br from-wwcc-dark via-[#363320] to-[#3d3a2a] text-white">
        <div className="max-w-6xl mx-auto px-6 py-28 md:py-36">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-wwcc-sage font-medium mb-6">
              Exclusive Member Experiences
            </p>
            <h1
              className={`${serif.className} text-5xl md:text-7xl font-medium mb-8 leading-[1.1]`}
            >
              Wine, Golf &amp; Adventure — Starting at the Club
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-3 leading-relaxed max-w-2xl">
              Every experience features dining at the Walla Walla Country Club.
              Bring your family, friends, and out-of-town guests for unforgettable
              Walla Walla experiences.
            </p>
            <p className="text-base text-white/60 mb-12 max-w-2xl">
              Perfect for members, families, visiting guests, and groups.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#packages"
                className="inline-block bg-wwcc-cream text-wwcc-dark px-8 py-4 rounded font-medium hover:bg-white transition-colors text-center"
              >
                Explore Packages
              </a>
              <Link
                href="/book?source=wwcc"
                className="inline-block border border-white/40 text-white px-8 py-4 rounded font-medium hover:bg-white/10 transition-colors text-center"
              >
                Request a Custom Experience
              </Link>
              <Link
                href="/book?source=wwcc&type=group"
                className="inline-block border border-wwcc-sage/60 text-wwcc-sage px-8 py-4 rounded font-medium hover:bg-wwcc-sage/10 transition-colors text-center"
              >
                Plan a Group Outing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Trust Indicators ───────────────────────── */}
      <section className="bg-wwcc-cream border-b border-wwcc-sage/10">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="border-l-2 border-wwcc-sage pl-5">
              <p
                className={`${serif.className} text-xl font-semibold text-wwcc-dark mb-1`}
              >
                Private Tours
              </p>
              <p className="text-sm text-wwcc-text">Exclusively for your group</p>
            </div>
            <div className="border-l-2 border-wwcc-sage pl-5">
              <p
                className={`${serif.className} text-xl font-semibold text-wwcc-dark mb-1`}
              >
                Club Dining
              </p>
              <p className="text-sm text-wwcc-text">Featured with every package</p>
            </div>
            <div className="border-l-2 border-wwcc-sage pl-5">
              <p
                className={`${serif.className} text-xl font-semibold text-wwcc-dark mb-1`}
              >
                Locally Owned
              </p>
              <p className="text-sm text-wwcc-text">Walla Walla based</p>
            </div>
            <div className="border-l-2 border-wwcc-sage pl-5">
              <p
                className={`${serif.className} text-xl font-semibold text-wwcc-dark mb-1`}
              >
                Luxury Transportation
              </p>
              <p className="text-sm text-wwcc-text">Private Mercedes Sprinter</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Family & Friends Callout ───────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="border-l-4 border-wwcc-sage bg-white p-10 shadow-[12px_12px_0_#719453]">
            <p className="text-[11px] uppercase tracking-[0.25em] text-wwcc-sage font-medium mb-3">
              Share the Experience
            </p>
            <p
              className={`${serif.className} text-xl md:text-2xl text-wwcc-dark leading-relaxed`}
            >
              These experiences are designed for sharing — bring your spouse, kids, parents,
              college friends, or out-of-town visitors. The best memories are made together.
              The club is your launching pad for experiences the whole family can enjoy.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Wine Tour Packages ───────────────────────── */}
      <section id="packages" className="py-28 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.3em] text-wwcc-sage font-medium mb-3">
              Wine Tours
            </p>
            <h2
              className={`${serif.className} text-3xl md:text-4xl font-medium text-wwcc-dark`}
            >
              Wine Tour Packages
            </h2>
            <div className="w-16 h-[2px] bg-wwcc-sage mx-auto mt-5 mb-6" />
            <p className="text-base text-wwcc-text max-w-2xl mx-auto leading-relaxed">
              Every wine tour features a dining experience at the Walla Walla Country Club
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Card 1: Wine & Dine */}
            <div className="bg-white border border-gray-200 overflow-hidden flex flex-col shadow-[12px_12px_0_#719453] hover:shadow-[14px_14px_0_#719453] hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-8 flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h3
                    className={`${serif.className} text-2xl font-semibold text-wwcc-dark`}
                  >
                    Wine &amp; Dine
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-wwcc-sage font-medium mt-1 whitespace-nowrap ml-3">
                    Great for couples
                  </span>
                </div>
                <p className="text-sm text-wwcc-text/70 mb-6">~5 hours</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>2 wineries, hand-selected for your group</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Lunch arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="px-8 pb-8">
                <Link
                  href="/book?source=wwcc&package=wwcc-wine-dine"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Card 2: The Walla Walla Experience (Featured) */}
            <div className="bg-white border-2 border-wwcc-sage overflow-hidden flex flex-col relative shadow-[16px_16px_0_#719453] hover:shadow-[18px_18px_0_#719453] hover:-translate-y-0.5 transition-all duration-300">
              <div className="bg-wwcc-sage text-white text-[10px] font-medium px-4 py-2 uppercase tracking-[0.2em] text-center">
                Most Popular
              </div>
              <div className="p-8 flex-1">
                <h3
                  className={`${serif.className} text-2xl font-semibold text-wwcc-dark mb-1`}
                >
                  The Walla Walla Experience
                </h3>
                <p className="text-sm text-wwcc-text/70 mb-1">6 hours</p>
                <p className="text-[11px] uppercase tracking-widest text-wwcc-sage font-medium mb-6">
                  Ideal for visiting friends &amp; family
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>3 wineries with varietals focus</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Dinner reserved at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Bottled water &amp; snacks</span>
                  </li>
                </ul>
              </div>
              <div className="px-8 pb-8">
                <Link
                  href="/book?source=wwcc&package=wwcc-experience"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Card 3: Custom Wine & Dine */}
            <div className="bg-white border border-gray-200 overflow-hidden flex flex-col shadow-[12px_12px_0_#719453] hover:shadow-[14px_14px_0_#719453] hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-8 flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h3
                    className={`${serif.className} text-2xl font-semibold text-wwcc-dark`}
                  >
                    Custom Wine &amp; Dine
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-wwcc-sage font-medium mt-1 whitespace-nowrap ml-3">
                    Perfect for groups
                  </span>
                </div>
                <p className="text-sm text-wwcc-text/70 mb-6">Flexible duration</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Wineries tailored to your group&apos;s preferences</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Meal arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="px-8 pb-8">
                <Link
                  href="/book?source=wwcc&package=wwcc-custom"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Custom Experience
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Geology Tour Packages (Dark Section) ───────────────────────── */}
      <section className="py-28 md:py-32 bg-wwcc-dark">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.3em] text-wwcc-sage font-medium mb-3">
              Geology Tours
            </p>
            <h2
              className={`${serif.className} text-3xl md:text-4xl font-medium text-wwcc-cream`}
            >
              Explore the Story Beneath the Vines
            </h2>
            <div className="w-16 h-[2px] bg-wwcc-sage mx-auto mt-5 mb-6" />
            <p className="text-base text-wwcc-cream/70 max-w-2xl mx-auto leading-relaxed">
              Discover the volcanic and glacial forces that shaped Walla Walla&apos;s world-class
              terroir with renowned geologist Dr. Kevin Pogue
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            {/* Geology Tour + Club Lunch */}
            <div className="bg-wwcc-cream overflow-hidden flex flex-col shadow-[12px_12px_0_#719453] hover:shadow-[14px_14px_0_#719453] hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-8 flex-1">
                <h3
                  className={`${serif.className} text-2xl font-semibold text-wwcc-dark mb-1`}
                >
                  Geology Tour + Club Lunch
                </h3>
                <p className="text-[11px] uppercase tracking-widest text-wwcc-sage font-medium mb-6">
                  Fun for all ages
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Half-day guided tour with Dr. Kevin Pogue</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Explore the volcanic and glacial terroir of Walla Walla</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Lunch arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="px-8 pb-8">
                <Link
                  href="/book?source=wwcc&package=wwcc-geology"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Geology & Wine Combo + Club Dining */}
            <div className="bg-wwcc-cream overflow-hidden flex flex-col shadow-[12px_12px_0_#719453] hover:shadow-[14px_14px_0_#719453] hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-8 flex-1">
                <h3
                  className={`${serif.className} text-2xl font-semibold text-wwcc-dark mb-1`}
                >
                  Geology &amp; Wine Combo + Club Dining
                </h3>
                <p className="text-[11px] uppercase tracking-widest text-wwcc-sage font-medium mb-6">
                  Educational &amp; entertaining
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Full day combining geology education and wine tasting</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Visit 2 wineries with geological context</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Meal arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="px-8 pb-8">
                <Link
                  href="/book?source=wwcc&package=wwcc-geology-wine"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Golf Excursions ───────────────────────── */}
      <section className="py-28 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.3em] text-wwcc-sage font-medium mb-3">
              Golf
            </p>
            <h2
              className={`${serif.className} text-3xl md:text-4xl font-medium text-wwcc-dark`}
            >
              Golf Excursions
            </h2>
            <div className="w-16 h-[2px] bg-wwcc-sage mx-auto mt-5 mb-6" />
            <p className="text-base text-wwcc-text max-w-2xl mx-auto leading-relaxed">
              Play the region&apos;s best courses with wine country integration
              and curated dining experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Day Golf Excursion */}
            <div className="bg-white border border-gray-200 overflow-hidden flex flex-col shadow-[12px_12px_0_#719453] hover:shadow-[14px_14px_0_#719453] hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-8 flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h3
                    className={`${serif.className} text-2xl font-semibold text-wwcc-dark`}
                  >
                    Day Golf Excursion
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-wwcc-sage font-medium mt-1 whitespace-nowrap ml-3">
                    Bring your buddies
                  </span>
                </div>
                <p className="text-sm text-wwcc-text/70 mb-6">1 day</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Round at a regional course</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Afternoon wine tasting (2 wineries)</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Lunch or dinner arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="px-8 pb-8">
                <Link
                  href="/book?source=wwcc&package=wwcc-golf-day"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Weekend Golf & Wine Getaway (Featured) */}
            <div className="bg-white border-2 border-wwcc-sage overflow-hidden flex flex-col relative shadow-[16px_16px_0_#719453] hover:shadow-[18px_18px_0_#719453] hover:-translate-y-0.5 transition-all duration-300">
              <div className="bg-wwcc-sage text-white text-[10px] font-medium px-4 py-2 uppercase tracking-[0.2em] text-center">
                Most Popular
              </div>
              <div className="p-8 flex-1">
                <h3
                  className={`${serif.className} text-2xl font-semibold text-wwcc-dark mb-1`}
                >
                  Weekend Golf &amp; Wine Getaway
                </h3>
                <p className="text-sm text-wwcc-text/70 mb-1">2 days</p>
                <p className="text-[11px] uppercase tracking-widest text-wwcc-sage font-medium mb-6">
                  Perfect for visiting friends
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Day 1: Golf outing at a premier regional course + dinner</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Day 2: Wine tour (3 wineries) + lunch</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <p className="text-xs text-wwcc-text/60 italic">
                  Dining arrangements customized to your itinerary
                </p>
              </div>
              <div className="px-8 pb-8">
                <Link
                  href="/book?source=wwcc&package=wwcc-golf-weekend"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* The Ultimate Experience */}
            <div className="bg-white border border-gray-200 overflow-hidden flex flex-col shadow-[12px_12px_0_#719453] hover:shadow-[14px_14px_0_#719453] hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-8 flex-1">
                <h3
                  className={`${serif.className} text-2xl font-semibold text-wwcc-dark mb-1`}
                >
                  The Ultimate Experience
                </h3>
                <p className="text-sm text-wwcc-text/70 mb-1">3 days</p>
                <p className="text-[11px] uppercase tracking-widest text-wwcc-sage font-medium mb-6">
                  The complete immersion
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Golf, wine touring (2-3 wineries per day), geology</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Dining arranged throughout your experience</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text leading-relaxed">
                    <span className="text-wwcc-sage mr-3 mt-0.5 flex-shrink-0 text-[10px]">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="px-8 pb-8">
                <Link
                  href="/book?source=wwcc&package=wwcc-ultimate"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded font-medium hover:bg-[#3d3a2a] transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </div>

          {/* Golf callout box */}
          <div className="mt-12 border-l-4 border-wwcc-sage bg-white p-8 max-w-3xl mx-auto shadow-[8px_8px_0_#847b4a]">
            <p className="text-wwcc-text leading-relaxed">
              Outside play at the Walla Walla Country Club is also available — ask us about
              arranging a round on the club&apos;s course.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Country Club Dining Experience ───────────────────────── */}
      <section className="bg-wwcc-dark py-28 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-wwcc-sage font-medium mb-3">
            Dining
          </p>
          <h2
            className={`${serif.className} text-3xl md:text-4xl font-medium text-wwcc-cream mb-4`}
          >
            A Curated Dining Experience at the Club
          </h2>
          <div className="w-16 h-[2px] bg-wwcc-sage mx-auto mt-5 mb-8" />
          <p className="text-wwcc-cream/80 text-lg max-w-2xl mx-auto leading-relaxed mb-5">
            The Walla Walla Country Club restaurant offers a refined dining experience
            in a relaxed, welcoming atmosphere. From seasonal menus to locally sourced
            ingredients, every meal is crafted to complement your day in wine country.
          </p>
          <p className="text-wwcc-cream/60 max-w-2xl mx-auto leading-relaxed">
            Menus are tailored to your group&apos;s preferences and dietary needs, so
            every guest enjoys a memorable meal to round out the experience.
          </p>
        </div>
      </section>

      {/* ───────────────────────── How It Works ───────────────────────── */}
      <section className="py-28 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.3em] text-wwcc-sage font-medium mb-3">
              Getting Started
            </p>
            <h2
              className={`${serif.className} text-3xl md:text-4xl font-medium text-wwcc-dark`}
            >
              How It Works
            </h2>
            <div className="w-16 h-[2px] bg-wwcc-sage mx-auto mt-5" />
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <p
                className={`${serif.className} text-5xl font-light text-wwcc-sage mb-4`}
              >
                1
              </p>
              <h3
                className={`${serif.className} text-xl font-semibold text-wwcc-dark mb-3`}
              >
                Choose Your Experience
              </h3>
              <p className="text-sm text-wwcc-text leading-relaxed">
                Browse our packages or tell us exactly what you want — we build
                custom experiences every day.
              </p>
            </div>
            <div className="text-center">
              <p
                className={`${serif.className} text-5xl font-light text-wwcc-sage mb-4`}
              >
                2
              </p>
              <h3
                className={`${serif.className} text-xl font-semibold text-wwcc-dark mb-3`}
              >
                We Plan Every Detail
              </h3>
              <p className="text-sm text-wwcc-text leading-relaxed">
                Winery reservations, dining arrangements, and private Mercedes Sprinter
                transportation — all coordinated for you.
              </p>
            </div>
            <div className="text-center">
              <p
                className={`${serif.className} text-5xl font-light text-wwcc-sage mb-4`}
              >
                3
              </p>
              <h3
                className={`${serif.className} text-xl font-semibold text-wwcc-dark mb-3`}
              >
                Enjoy Your Day
              </h3>
              <p className="text-sm text-wwcc-text leading-relaxed">
                Sit back and experience the best of Walla Walla — great wine, stunning
                scenery, and a meal at the club to cap it off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Final CTA ───────────────────────── */}
      <section className="bg-gradient-to-br from-wwcc-dark via-[#363320] to-[#3d3a2a] py-28 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-wwcc-sage font-medium mb-3">
            Ready?
          </p>
          <h2
            className={`${serif.className} text-4xl md:text-5xl font-medium text-white mb-4`}
          >
            Invite Your Friends &amp; Family
          </h2>
          <div className="w-16 h-[2px] bg-wwcc-sage mx-auto mt-5 mb-8" />
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            Whether you know exactly what you want or need help building the perfect day,
            we are here to make it happen. These experiences are even better when shared.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book?source=wwcc"
              className="inline-block bg-wwcc-cream text-wwcc-dark px-8 py-4 rounded font-medium hover:bg-white transition-colors"
            >
              Request a Custom Experience
            </Link>
            <Link
              href="/book?source=wwcc&type=group"
              className="inline-block border border-wwcc-sage/60 text-wwcc-sage px-8 py-4 rounded font-medium hover:bg-wwcc-sage/10 transition-colors"
            >
              Plan a Group Outing
            </Link>
            <a
              href="tel:+15092008000"
              className="inline-block border border-white/30 text-white/90 px-8 py-4 rounded font-medium hover:bg-white/10 transition-colors"
            >
              Call Us: (509) 200-8000
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="bg-wwcc-dark border-t border-white/10 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <p
                className={`${serif.className} text-white text-2xl font-semibold mb-1`}
              >
                Walla Walla Country Club
              </p>
              <p className="text-wwcc-cream/40 text-[10px] uppercase tracking-[0.25em] mb-4">
                Est. 1923
              </p>
              <p className="text-wwcc-cream/70 text-sm mb-1">
                700 Country Club Dr, Walla Walla, WA 99362
              </p>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-wwcc-cream/50 text-[10px] uppercase tracking-[0.25em] mb-2">
                  Experiences curated by
                </p>
                <p className="text-white font-medium">Walla Walla Travel</p>
                <p className="text-wwcc-cream/60 text-sm mt-1">
                  A partnership between the Walla Walla Country Club and Walla Walla Travel
                </p>
              </div>
            </div>
            <div>
              <p className="text-wwcc-cream/50 text-[10px] uppercase tracking-[0.25em] mb-4">
                Contact
              </p>
              <p className="text-wwcc-cream/80 text-sm mb-2">
                <a href="tel:+15092008000" className="hover:text-white transition-colors">
                  (509) 200-8000
                </a>
              </p>
              <p className="text-wwcc-cream/80 text-sm">
                <a
                  href="mailto:info@wallawalla.travel"
                  className="hover:text-white transition-colors"
                >
                  info@wallawalla.travel
                </a>
              </p>
            </div>
            <div>
              <p className="text-wwcc-cream/50 text-[10px] uppercase tracking-[0.25em] mb-4">
                Legal
              </p>
              <div className="space-y-2">
                <Link
                  href="/privacy"
                  className="block text-wwcc-cream/70 text-sm hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="block text-wwcc-cream/70 text-sm hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/cancellation-policy"
                  className="block text-wwcc-cream/70 text-sm hover:text-white transition-colors"
                >
                  Cancellation Policy
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-wwcc-cream/40 text-sm">
              &copy; {new Date().getFullYear()} Walla Walla Travel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
