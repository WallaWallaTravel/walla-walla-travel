import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exclusive Experiences for Members & Guests | Walla Walla Country Club',
  description:
    'Wine tours, geology adventures, and golf packages for Walla Walla Country Club members and guests. Every experience features dining at the club.',
};

export default function WWCCPartnerPage() {
  return (
    <div className="min-h-screen bg-wwcc-cream font-lora">
      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="bg-wwcc-dark">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p
              className="font-display text-wwcc-cream"
              style={{ fontSize: '18px', letterSpacing: '0.03em', fontWeight: 400 }}
            >
              Walla Walla Country Club
            </p>
            <p
              className="text-wwcc-cream/50 uppercase mt-0.5"
              style={{ fontSize: '11px', letterSpacing: '0.05em' }}
            >
              Est. 1923 &middot; Curated by Walla Walla Travel
            </p>
          </div>
        </div>
      </header>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="bg-wwcc-dark">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <p
              className="text-wwcc-gold uppercase mb-4"
              style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
            >
              Exclusive Member Experiences
            </p>
            <h1
              className="font-display text-wwcc-cream mb-6"
              style={{ fontSize: '42px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
            >
              Wine, Golf &amp; Adventure — Starting at the Club
            </h1>
            <p
              className="text-wwcc-cream/75 mb-8 max-w-2xl"
              style={{ fontSize: '15px', lineHeight: 1.65 }}
            >
              Bring your family, friends, and out-of-town guests for unforgettable Walla Walla
              experiences. Every outing features dining at the Walla Walla Country Club.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#packages"
                className="inline-block border border-wwcc-cream/40 text-wwcc-cream px-8 py-4 rounded-lg hover:bg-wwcc-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors text-center"
                style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
              >
                Explore Packages
              </a>
              <Link
                href="/book?source=wwcc"
                className="inline-block bg-wwcc-gold text-wwcc-dark px-8 py-4 rounded-lg hover:bg-wwcc-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors text-center"
                style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
              >
                Request a Custom Experience
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Trust Bar ───────────────────────── */}
      <section className="bg-wwcc-feature border-t border-wwcc-dark/10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p
                className="text-wwcc-feature-text"
                style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}
              >
                Private Tours
              </p>
              <p className="text-wwcc-feature-text/70 mt-0.5" style={{ fontSize: '12px' }}>
                Exclusively for your group
              </p>
            </div>
            <div>
              <p
                className="text-wwcc-feature-text"
                style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}
              >
                Club Dining
              </p>
              <p className="text-wwcc-feature-text/70 mt-0.5" style={{ fontSize: '12px' }}>
                Featured with every package
              </p>
            </div>
            <div>
              <p
                className="text-wwcc-feature-text"
                style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}
              >
                Locally Owned
              </p>
              <p className="text-wwcc-feature-text/70 mt-0.5" style={{ fontSize: '12px' }}>
                Walla Walla based
              </p>
            </div>
            <div>
              <p
                className="text-wwcc-feature-text"
                style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}
              >
                Luxury Transportation
              </p>
              <p className="text-wwcc-feature-text/70 mt-0.5" style={{ fontSize: '12px' }}>
                Private Mercedes Sprinter
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Family Callout ───────────────────────── */}
      <section className="bg-wwcc-cream py-10 md:py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="border-l-4 border-wwcc-gold bg-wwcc-warm rounded-r-lg p-6 md:p-8 shadow-sm">
            <p
              className="text-wwcc-gold-dark uppercase mb-3"
              style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
            >
              Share the Experience
            </p>
            <p className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>
              These experiences are designed for sharing — bring your spouse, kids, parents,
              college friends, or out-of-town visitors. The club is your launching pad for
              experiences the whole family can enjoy.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Wine Tour Packages ───────────────────────── */}
      <section id="packages" className="py-12 md:py-16 bg-wwcc-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-10">
            <p
              className="text-wwcc-gold-dark uppercase mb-3"
              style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
            >
              Wine Tours
            </p>
            <h2
              className="font-display text-wwcc-dark"
              style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
            >
              Wine Tour Packages
            </h2>
            <p className="text-wwcc-dark/70 mt-3 max-w-xl mx-auto" style={{ fontSize: '15px', lineHeight: 1.65 }}>
              Every wine tour features a dining experience at the Walla Walla Country Club
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {/* Wine & Dine */}
            <div className="rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-wwcc-dark px-6 py-5">
                <h3
                  className="font-display text-wwcc-cream"
                  style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
                >
                  Wine &amp; Dine
                </h3>
                <p className="text-wwcc-cream/75 mt-1" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                  ~5 hours &middot; Great for couples
                </p>
              </div>
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>2 wineries, hand-selected for your group</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Lunch arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-wine-dine"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded-lg hover:bg-wwcc-dark-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
                  style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* The Walla Walla Experience (Featured) */}
            <div className="rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden ring-2 ring-wwcc-gold flex flex-col">
              <div className="bg-wwcc-dark px-6 py-5">
                <p
                  className="text-wwcc-gold uppercase mb-1"
                  style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
                >
                  Most Popular
                </p>
                <h3
                  className="font-display text-wwcc-cream"
                  style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
                >
                  The Walla Walla Experience
                </h3>
                <p className="text-wwcc-cream/75 mt-1" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                  6 hours &middot; Ideal for visiting friends &amp; family
                </p>
              </div>
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>3 wineries with varietals focus</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Dinner reserved at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Private Mercedes Sprinter transportation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Bottled water &amp; snacks</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-experience"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded-lg hover:bg-wwcc-dark-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
                  style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Custom Wine & Dine */}
            <div className="rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-wwcc-dark px-6 py-5">
                <h3
                  className="font-display text-wwcc-cream"
                  style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
                >
                  Custom Wine &amp; Dine
                </h3>
                <p className="text-wwcc-cream/75 mt-1" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                  Flexible duration &middot; Perfect for groups
                </p>
              </div>
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Wineries tailored to your group&apos;s preferences</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Meal arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-custom"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded-lg hover:bg-wwcc-dark-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
                  style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
                >
                  Request a Custom Experience
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Geology Tours ───────────────────────── */}
      <section className="py-12 md:py-16 bg-wwcc-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-10">
            <p
              className="text-wwcc-gold uppercase mb-3"
              style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
            >
              Geology Tours
            </p>
            <h2
              className="font-display text-wwcc-cream"
              style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
            >
              Explore the Story Beneath the Vines
            </h2>
            <p className="text-wwcc-cream/75 mt-3 max-w-xl mx-auto" style={{ fontSize: '15px', lineHeight: 1.65 }}>
              Discover the volcanic and glacial forces that shaped Walla Walla&apos;s world-class
              terroir with renowned geologist Dr. Kevin Pogue
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-10 max-w-4xl mx-auto">
            {/* Geology Tour + Club Lunch */}
            <div className="rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-wwcc-dark px-6 py-5 border-b border-wwcc-cream/10">
                <h3
                  className="font-display text-wwcc-cream"
                  style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
                >
                  Geology Tour + Club Lunch
                </h3>
                <p className="text-wwcc-cream/75 mt-1" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                  Half day &middot; Fun for all ages
                </p>
              </div>
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Guided tour with Dr. Kevin Pogue</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Explore the volcanic and glacial terroir</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Lunch arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-geology"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded-lg hover:bg-wwcc-dark-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
                  style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Geology & Wine Combo */}
            <div className="rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-wwcc-dark px-6 py-5 border-b border-wwcc-cream/10">
                <h3
                  className="font-display text-wwcc-cream"
                  style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
                >
                  Geology &amp; Wine Combo
                </h3>
                <p className="text-wwcc-cream/75 mt-1" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                  Full day &middot; Educational &amp; entertaining
                </p>
              </div>
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Geology education and wine tasting combined</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Visit 2 wineries with geological context</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Meal arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-geology-wine"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded-lg hover:bg-wwcc-dark-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
                  style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Golf Excursions ───────────────────────── */}
      <section className="py-12 md:py-16 bg-wwcc-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-10">
            <p
              className="text-wwcc-gold-dark uppercase mb-3"
              style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
            >
              Golf
            </p>
            <h2
              className="font-display text-wwcc-dark"
              style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
            >
              Golf Excursions
            </h2>
            <p className="text-wwcc-dark/70 mt-3 max-w-xl mx-auto" style={{ fontSize: '15px', lineHeight: 1.65 }}>
              Play the region&apos;s best courses with wine country integration
              and curated dining experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {/* Day Golf Excursion */}
            <div className="rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-wwcc-dark px-6 py-5">
                <h3
                  className="font-display text-wwcc-cream"
                  style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
                >
                  Day Golf Excursion
                </h3>
                <p className="text-wwcc-cream/75 mt-1" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                  1 day &middot; Bring your golf buddies
                </p>
              </div>
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Round at a regional course</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Afternoon wine tasting (2 wineries)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Lunch or dinner arranged at the club</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-golf-day"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded-lg hover:bg-wwcc-dark-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
                  style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Weekend Golf & Wine Getaway (Featured) */}
            <div className="rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden ring-2 ring-wwcc-gold flex flex-col">
              <div className="bg-wwcc-dark px-6 py-5">
                <p
                  className="text-wwcc-gold uppercase mb-1"
                  style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
                >
                  Most Popular
                </p>
                <h3
                  className="font-display text-wwcc-cream"
                  style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
                >
                  Weekend Golf &amp; Wine Getaway
                </h3>
                <p className="text-wwcc-cream/75 mt-1" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                  2 days &middot; Perfect for visiting friends
                </p>
              </div>
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <ul className="space-y-3 mb-4 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Day 1: Golf at a premier regional course + dinner</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Day 2: Wine tour (3 wineries) + lunch</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <p className="text-wwcc-dark/60 italic mb-6" style={{ fontSize: '14px' }}>
                  Dining arrangements customized to your itinerary
                </p>
                <Link
                  href="/book?source=wwcc&package=wwcc-golf-weekend"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded-lg hover:bg-wwcc-dark-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
                  style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* The Ultimate Experience */}
            <div className="rounded-xl bg-wwcc-warm border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-wwcc-dark px-6 py-5">
                <h3
                  className="font-display text-wwcc-cream"
                  style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
                >
                  The Ultimate Experience
                </h3>
                <p className="text-wwcc-cream/75 mt-1" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                  3 days &middot; The complete immersion
                </p>
              </div>
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Golf, wine touring (2-3 wineries per day), geology</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Dining arranged throughout your experience</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-wwcc-gold mt-2 flex-shrink-0" />
                    <span className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <Link
                  href="/book?source=wwcc&package=wwcc-ultimate"
                  className="block w-full text-center bg-wwcc-dark text-wwcc-cream py-3.5 rounded-lg hover:bg-wwcc-dark-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
                  style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 border-l-4 border-wwcc-gold bg-wwcc-warm rounded-r-lg p-6 max-w-2xl mx-auto shadow-sm">
            <p className="text-wwcc-dark" style={{ fontSize: '15px', lineHeight: 1.65 }}>
              Outside play at the Walla Walla Country Club is also available — ask us about
              arranging a round on the club&apos;s course.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Dining ───────────────────────── */}
      <section className="bg-wwcc-dark py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p
            className="text-wwcc-gold uppercase mb-3"
            style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
          >
            Dining
          </p>
          <h2
            className="font-display text-wwcc-cream mb-6"
            style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
          >
            A Curated Dining Experience at the Club
          </h2>
          <p className="text-wwcc-cream/75 mb-4" style={{ fontSize: '15px', lineHeight: 1.65 }}>
            The Walla Walla Country Club restaurant offers a refined dining experience
            in a relaxed, welcoming atmosphere. From seasonal menus to locally sourced
            ingredients, every meal is crafted to complement your day in wine country.
          </p>
          <p className="text-wwcc-cream/75" style={{ fontSize: '15px', lineHeight: 1.65 }}>
            Menus are tailored to your group&apos;s preferences and dietary needs, so
            every guest enjoys a memorable meal to round out the experience.
          </p>
        </div>
      </section>

      {/* ───────────────────────── How It Works ───────────────────────── */}
      <section className="py-12 md:py-16 bg-wwcc-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-10">
            <h2
              className="font-display text-wwcc-dark"
              style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
            >
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full bg-wwcc-dark text-wwcc-cream flex items-center justify-center mx-auto mb-4"
                style={{ fontSize: '18px', fontWeight: 600 }}
              >
                1
              </div>
              <h3
                className="font-display text-wwcc-dark mb-2"
                style={{ fontSize: '20px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
              >
                Choose Your Experience
              </h3>
              <p className="text-wwcc-dark/70" style={{ fontSize: '15px', lineHeight: 1.65 }}>
                Browse our packages or tell us exactly what you want — we build
                custom experiences every day.
              </p>
            </div>
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full bg-wwcc-dark text-wwcc-cream flex items-center justify-center mx-auto mb-4"
                style={{ fontSize: '18px', fontWeight: 600 }}
              >
                2
              </div>
              <h3
                className="font-display text-wwcc-dark mb-2"
                style={{ fontSize: '20px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
              >
                We Plan Every Detail
              </h3>
              <p className="text-wwcc-dark/70" style={{ fontSize: '15px', lineHeight: 1.65 }}>
                Winery reservations, dining arrangements, and private Mercedes Sprinter
                transportation — all coordinated for you.
              </p>
            </div>
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full bg-wwcc-dark text-wwcc-cream flex items-center justify-center mx-auto mb-4"
                style={{ fontSize: '18px', fontWeight: 600 }}
              >
                3
              </div>
              <h3
                className="font-display text-wwcc-dark mb-2"
                style={{ fontSize: '20px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
              >
                Enjoy Your Day
              </h3>
              <p className="text-wwcc-dark/70" style={{ fontSize: '15px', lineHeight: 1.65 }}>
                Sit back and experience the best of Walla Walla — great wine, stunning
                scenery, and a meal at the club to cap it off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Final CTA ───────────────────────── */}
      <section className="bg-wwcc-dark py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="font-display text-wwcc-cream mb-4"
            style={{ fontSize: '32px', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
          >
            Invite Your Friends &amp; Family
          </h2>
          <p className="text-wwcc-cream/75 max-w-xl mx-auto mb-8" style={{ fontSize: '15px', lineHeight: 1.65 }}>
            Whether you know exactly what you want or need help building the perfect day,
            we are here to make it happen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book?source=wwcc"
              className="inline-block bg-wwcc-gold text-wwcc-dark px-8 py-4 rounded-lg hover:bg-wwcc-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
              style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
            >
              Request a Custom Experience
            </Link>
            <Link
              href="/book?source=wwcc&type=group"
              className="inline-block border border-wwcc-cream/40 text-wwcc-cream px-8 py-4 rounded-lg hover:bg-wwcc-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
              style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
            >
              Plan a Group Outing
            </Link>
            <a
              href="tel:+15092008000"
              className="inline-block border border-wwcc-cream/40 text-wwcc-cream px-8 py-4 rounded-lg hover:bg-wwcc-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
              style={{ fontSize: '13px', letterSpacing: '0.04em', fontWeight: 500 }}
            >
              (509) 200-8000
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="bg-wwcc-dark border-t border-wwcc-cream/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div>
              <p
                className="font-display text-wwcc-cream mb-1"
                style={{ fontSize: '18px', letterSpacing: '0.03em', fontWeight: 400 }}
              >
                Walla Walla Country Club
              </p>
              <p
                className="text-wwcc-cream/60 mb-3"
                style={{ fontSize: '11px', letterSpacing: '0.05em' }}
              >
                Est. 1923
              </p>
              <p className="text-wwcc-cream/70" style={{ fontSize: '14px', lineHeight: 1.65 }}>
                700 Country Club Dr, Walla Walla, WA 99362
              </p>
              <div className="mt-4 pt-4 border-t border-wwcc-cream/10">
                <p className="text-wwcc-cream/60 mb-1" style={{ fontSize: '11px' }}>Experiences curated by</p>
                <p className="text-wwcc-cream" style={{ fontSize: '14px', fontWeight: 500 }}>Walla Walla Travel</p>
              </div>
            </div>
            <div>
              <p
                className="text-wwcc-cream/60 uppercase mb-3"
                style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
              >
                Contact
              </p>
              <p className="text-wwcc-cream/70 mb-1.5" style={{ fontSize: '14px' }}>
                <a href="tel:+15092008000" className="hover:text-wwcc-cream focus-visible:underline focus-visible:outline-none transition-colors">
                  (509) 200-8000
                </a>
              </p>
              <p className="text-wwcc-cream/70" style={{ fontSize: '14px' }}>
                <a href="mailto:info@wallawalla.travel" className="hover:text-wwcc-cream focus-visible:underline focus-visible:outline-none transition-colors">
                  info@wallawalla.travel
                </a>
              </p>
            </div>
            <div>
              <p
                className="text-wwcc-cream/60 uppercase mb-3"
                style={{ fontSize: '12px', letterSpacing: '0.15em', fontWeight: 500 }}
              >
                Legal
              </p>
              <div className="space-y-1.5">
                <Link href="/privacy" className="block text-wwcc-cream/70 hover:text-wwcc-cream focus-visible:underline focus-visible:outline-none transition-colors" style={{ fontSize: '14px' }}>
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block text-wwcc-cream/70 hover:text-wwcc-cream focus-visible:underline focus-visible:outline-none transition-colors" style={{ fontSize: '14px' }}>
                  Terms of Service
                </Link>
                <Link href="/cancellation-policy" className="block text-wwcc-cream/70 hover:text-wwcc-cream focus-visible:underline focus-visible:outline-none transition-colors" style={{ fontSize: '14px' }}>
                  Cancellation Policy
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-wwcc-cream/10 pt-6 text-center">
            <p className="text-wwcc-cream/50" style={{ fontSize: '13px' }}>
              &copy; {new Date().getFullYear()} Walla Walla Travel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
