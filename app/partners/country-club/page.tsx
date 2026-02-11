import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exclusive Experiences for Members & Guests | Walla Walla Country Club',
  description:
    'Wine tours, geology adventures, and golf packages for Walla Walla Country Club members and guests. Every experience features dining at the club.',
};

export default function WWCCPartnerPage() {
  return (
    <div className="min-h-screen bg-wwcc-cream">
      {/* ───────────────────────── Header Bar ───────────────────────── */}
      <header className="bg-wwcc-dark">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-2xl tracking-wide uppercase">
              Walla Walla Country Club
            </p>
            <p className="text-wwcc-cream/60 text-xs uppercase tracking-widest mt-1">
              Est. 1923 &middot; Member Experiences
            </p>
            <p className="text-sm text-wwcc-cream/80 mt-1">
              Curated by Walla Walla Travel
            </p>
          </div>
          <a
            href="tel:+15092008000"
            className="text-wwcc-cream font-semibold hover:text-white transition-colors text-sm md:text-base"
          >
            (509) 200-8000
          </a>
        </div>
      </header>

      {/* ───────────────────────── Hero Section ───────────────────────── */}
      <section className="bg-gradient-to-br from-wwcc-dark to-[#3d3a2a] text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-wwcc-tan text-sm uppercase tracking-widest font-semibold mb-4">
              Exclusive Member Experiences
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Wine, Golf &amp; Adventure — Starting at the Club
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-4 leading-relaxed max-w-2xl">
              Every experience features dining at the Walla Walla Country Club.
              Bring your family, friends, and out-of-town guests for unforgettable
              Walla Walla experiences.
            </p>
            <p className="text-base text-white/70 mb-10 max-w-2xl">
              Perfect for members, families, visiting guests, and groups.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#packages"
                className="inline-block bg-wwcc-cream text-wwcc-dark px-8 py-3.5 rounded-lg font-medium hover:bg-white transition-colors text-center shadow-sm"
              >
                Explore Packages
              </a>
              <Link
                href="/book?source=wwcc"
                className="inline-block border-2 border-white/80 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-white/10 transition-colors text-center"
              >
                Request a Custom Experience
              </Link>
              <Link
                href="/book?source=wwcc&type=group"
                className="inline-block border-2 border-wwcc-tan text-wwcc-tan px-8 py-3.5 rounded-lg font-medium hover:bg-wwcc-tan/10 transition-colors text-center"
              >
                Plan a Group Outing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Trust Indicators ───────────────────────── */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="font-bold text-wwcc-tan text-xl mb-1">Private Tours</p>
              <p className="text-sm text-wwcc-text">Exclusively for your group</p>
            </div>
            <div>
              <p className="font-bold text-wwcc-tan text-xl mb-1">Club Dining</p>
              <p className="text-sm text-wwcc-text">Featured with every package</p>
            </div>
            <div>
              <p className="font-bold text-wwcc-tan text-xl mb-1">Locally Owned</p>
              <p className="text-sm text-wwcc-text">Walla Walla based</p>
            </div>
            <div>
              <p className="font-bold text-wwcc-tan text-xl mb-1">Luxury Transportation</p>
              <p className="text-sm text-wwcc-text">Private Mercedes Sprinter</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Family & Friends Callout ───────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="border-l-4 border-wwcc-tan bg-white p-8 shadow-[6px_6px_0_#719453]">
            <h2 className="uppercase tracking-widest text-sm font-semibold text-wwcc-sage mb-3">
              Share the Experience
            </h2>
            <p className="text-lg text-wwcc-dark leading-relaxed">
              These experiences are designed for sharing — bring your spouse, kids, parents,
              college friends, or out-of-town visitors. The best memories are made together.
              The club is your launching pad for experiences the whole family can enjoy.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Wine Tour Packages ───────────────────────── */}
      <section id="packages" className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="uppercase tracking-widest text-lg font-semibold text-wwcc-sage mb-4">
              Wine Tour Packages
            </h2>
            <p className="text-lg text-wwcc-text max-w-3xl mx-auto">
              Every wine tour features a dining experience at the Walla Walla Country Club
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Wine & Dine */}
            <div className="bg-white rounded-xl border-2 border-wwcc-tan overflow-hidden flex flex-col shadow-[6px_6px_0_#847b4a] hover:shadow-[8px_8px_0_#847b4a] hover:-translate-y-1 transition-all">
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-wwcc-dark">Wine &amp; Dine</h3>
                  <span className="text-xs bg-wwcc-cream text-wwcc-text px-2 py-1 rounded-full font-medium">
                    Great for couples
                  </span>
                </div>
                <p className="text-sm text-wwcc-text mb-4">~5 hours</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>2 wineries, hand-selected for your group</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Lunch arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href="/book?source=wwcc&package=wwcc-wine-dine"
                  className="block w-full text-center bg-wwcc-tan text-white py-3 rounded-lg font-medium hover:bg-[#756c41] transition-colors shadow-sm"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Card 2: The Walla Walla Experience (Featured) */}
            <div className="bg-white rounded-xl border-2 border-wwcc-sage overflow-hidden flex flex-col relative shadow-[8px_8px_0_#719453] hover:shadow-[10px_10px_0_#719453] hover:-translate-y-1 transition-all">
              <div className="absolute top-4 right-4 bg-wwcc-sage text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Most Popular
              </div>
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold text-wwcc-dark mb-2">
                  The Walla Walla Experience
                </h3>
                <p className="text-sm text-wwcc-text mb-1">6 hours</p>
                <p className="text-xs text-wwcc-sage font-medium mb-4">Ideal for visiting friends &amp; family</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>3 wineries with varietals focus</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Dinner reserved at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Bottled water &amp; snacks</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href="/book?source=wwcc&package=wwcc-experience"
                  className="block w-full text-center bg-wwcc-tan text-white py-3 rounded-lg font-medium hover:bg-[#756c41] transition-colors shadow-sm"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Card 3: Custom Wine & Dine */}
            <div className="bg-white rounded-xl border-2 border-wwcc-tan overflow-hidden flex flex-col shadow-[6px_6px_0_#847b4a] hover:shadow-[8px_8px_0_#847b4a] hover:-translate-y-1 transition-all">
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-wwcc-dark">Custom Wine &amp; Dine</h3>
                  <span className="text-xs bg-wwcc-cream text-wwcc-text px-2 py-1 rounded-full font-medium">
                    Perfect for groups
                  </span>
                </div>
                <p className="text-sm text-wwcc-text mb-4">Flexible duration</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Wineries tailored to your group&apos;s preferences</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Meal arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href="/book?source=wwcc&package=wwcc-custom"
                  className="block w-full text-center bg-wwcc-tan text-white py-3 rounded-lg font-medium hover:bg-[#756c41] transition-colors shadow-sm"
                >
                  Request a Custom Experience
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Geology Tour Packages ───────────────────────── */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="uppercase tracking-widest text-lg font-semibold text-wwcc-sage mb-4">
              Geology Tours
            </h2>
            <p className="text-lg text-wwcc-text max-w-3xl mx-auto">
              Explore the volcanic and glacial forces that shaped Walla Walla&apos;s world-class
              terroir with renowned geologist Dr. Kevin Pogue
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Geology Tour + Club Lunch */}
            <div className="bg-wwcc-cream rounded-xl border-2 border-wwcc-tan overflow-hidden flex flex-col shadow-[6px_6px_0_#719453] hover:shadow-[8px_8px_0_#719453] hover:-translate-y-1 transition-all">
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold text-wwcc-dark mb-2">
                  Geology Tour + Club Lunch
                </h3>
                <p className="text-xs text-wwcc-sage font-medium mb-4">Fun for all ages</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Half-day guided tour with Dr. Kevin Pogue</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Explore the volcanic and glacial terroir of Walla Walla</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Lunch arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href="/book?source=wwcc&package=wwcc-geology"
                  className="block w-full text-center bg-wwcc-tan text-white py-3 rounded-lg font-medium hover:bg-[#756c41] transition-colors shadow-sm"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Geology & Wine Combo + Club Dining */}
            <div className="bg-wwcc-cream rounded-xl border-2 border-wwcc-tan overflow-hidden flex flex-col shadow-[6px_6px_0_#719453] hover:shadow-[8px_8px_0_#719453] hover:-translate-y-1 transition-all">
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold text-wwcc-dark mb-2">
                  Geology &amp; Wine Combo + Club Dining
                </h3>
                <p className="text-xs text-wwcc-sage font-medium mb-4">Educational &amp; entertaining</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Full day combining geology education and wine tasting</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Visit 2 wineries with geological context</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Meal arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href="/book?source=wwcc&package=wwcc-geology-wine"
                  className="block w-full text-center bg-wwcc-tan text-white py-3 rounded-lg font-medium hover:bg-[#756c41] transition-colors shadow-sm"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Golf Excursions ───────────────────────── */}
      <section className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="uppercase tracking-widest text-lg font-semibold text-wwcc-sage mb-4">
              Golf Excursions
            </h2>
            <p className="text-lg text-wwcc-text max-w-3xl mx-auto">
              Play the region&apos;s best courses with wine country integration
              and curated dining experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Day Golf Excursion */}
            <div className="bg-white rounded-xl border-2 border-wwcc-tan overflow-hidden flex flex-col shadow-[6px_6px_0_#847b4a] hover:shadow-[8px_8px_0_#847b4a] hover:-translate-y-1 transition-all">
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-wwcc-dark">Day Golf Excursion</h3>
                  <span className="text-xs bg-wwcc-cream text-wwcc-text px-2 py-1 rounded-full font-medium">
                    Bring your golf buddies
                  </span>
                </div>
                <p className="text-sm text-wwcc-text mb-4">1 day</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Round at a regional course</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Afternoon wine tasting (2 wineries)</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Lunch or dinner arranged at the club</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href="/book?source=wwcc&package=wwcc-golf-day"
                  className="block w-full text-center bg-wwcc-tan text-white py-3 rounded-lg font-medium hover:bg-[#756c41] transition-colors shadow-sm"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* Weekend Golf & Wine Getaway (Featured) */}
            <div className="bg-white rounded-xl border-2 border-wwcc-sage overflow-hidden flex flex-col relative shadow-[8px_8px_0_#719453] hover:shadow-[10px_10px_0_#719453] hover:-translate-y-1 transition-all">
              <div className="absolute top-4 right-4 bg-wwcc-sage text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Most Popular
              </div>
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold text-wwcc-dark mb-2">
                  Weekend Golf &amp; Wine Getaway
                </h3>
                <p className="text-sm text-wwcc-text mb-1">2 days</p>
                <p className="text-xs text-wwcc-sage font-medium mb-4">Perfect for visiting friends</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Day 1: Golf outing at a premier regional course + dinner</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Day 2: Wine tour (3 wineries) + lunch</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
                <p className="text-xs text-wwcc-text/70 italic">
                  Dining arrangements customized to your itinerary
                </p>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href="/book?source=wwcc&package=wwcc-golf-weekend"
                  className="block w-full text-center bg-wwcc-tan text-white py-3 rounded-lg font-medium hover:bg-[#756c41] transition-colors shadow-sm"
                >
                  Request a Quote
                </Link>
              </div>
            </div>

            {/* The Ultimate Experience */}
            <div className="bg-white rounded-xl border-2 border-wwcc-tan overflow-hidden flex flex-col shadow-[6px_6px_0_#847b4a] hover:shadow-[8px_8px_0_#847b4a] hover:-translate-y-1 transition-all">
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold text-wwcc-dark mb-2">The Ultimate Experience</h3>
                <p className="text-sm text-wwcc-text mb-1">3 days</p>
                <p className="text-xs text-wwcc-sage font-medium mb-4">The complete Walla Walla immersion</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Golf, wine touring (2-3 wineries per day), geology</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Dining arranged throughout your experience</span>
                  </li>
                  <li className="flex items-start text-sm text-wwcc-text">
                    <span className="text-wwcc-sage mr-2 mt-0.5 flex-shrink-0">&#9670;</span>
                    <span>Private Mercedes Sprinter transportation</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Link
                  href="/book?source=wwcc&package=wwcc-ultimate"
                  className="block w-full text-center bg-wwcc-tan text-white py-3 rounded-lg font-medium hover:bg-[#756c41] transition-colors shadow-sm"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </div>

          {/* Golf callout box */}
          <div className="mt-10 bg-white rounded-xl border-l-4 border-wwcc-sage p-6 max-w-3xl mx-auto shadow-sm">
            <p className="text-wwcc-text leading-relaxed">
              Outside play at the Walla Walla Country Club is also available — ask us about
              arranging a round on the club&apos;s course.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Country Club Dining Experience ───────────────────────── */}
      <section className="bg-wwcc-dark py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="uppercase tracking-widest text-lg font-semibold text-wwcc-tan mb-6">
            A Curated Dining Experience at the Club
          </h2>
          <p className="text-wwcc-cream/90 text-lg max-w-3xl mx-auto leading-relaxed mb-4">
            The Walla Walla Country Club restaurant offers a refined dining experience
            in a relaxed, welcoming atmosphere. From seasonal menus to locally sourced
            ingredients, every meal is crafted to complement your day in wine country.
          </p>
          <p className="text-wwcc-cream/80 max-w-2xl mx-auto leading-relaxed">
            Menus are tailored to your group&apos;s preferences and dietary needs, so
            every guest enjoys a memorable meal to round out the experience.
          </p>
        </div>
      </section>

      {/* ───────────────────────── How It Works ───────────────────────── */}
      <section className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="uppercase tracking-widest text-lg font-semibold text-wwcc-sage mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-wwcc-sage text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-wwcc-dark mb-2">
                Choose Your Experience
              </h3>
              <p className="text-wwcc-text leading-relaxed">
                Browse our packages or tell us exactly what you want — we build
                custom experiences every day.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-wwcc-sage text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-wwcc-dark mb-2">
                We Plan Every Detail
              </h3>
              <p className="text-wwcc-text leading-relaxed">
                Winery reservations, dining arrangements, and private Mercedes Sprinter
                transportation — all coordinated for you.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-wwcc-sage text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-wwcc-dark mb-2">Enjoy Your Day</h3>
              <p className="text-wwcc-text leading-relaxed">
                Sit back and experience the best of Walla Walla — great wine, stunning
                scenery, and a meal at the club to cap it off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Final CTA ───────────────────────── */}
      <section className="bg-gradient-to-br from-wwcc-dark to-[#3d3a2a] py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="uppercase tracking-widest text-lg font-semibold text-wwcc-tan mb-4">
            Ready to Plan Your Experience?
          </h2>
          <p className="text-3xl md:text-4xl font-bold text-white mb-6">
            Invite Your Friends &amp; Family
          </p>
          <p className="text-white/85 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Whether you know exactly what you want or need help building the perfect day,
            we are here to make it happen. These experiences are even better when shared.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book?source=wwcc"
              className="inline-block bg-wwcc-cream text-wwcc-dark px-8 py-3.5 rounded-lg font-medium hover:bg-white transition-colors shadow-sm"
            >
              Request a Custom Experience
            </Link>
            <Link
              href="/book?source=wwcc&type=group"
              className="inline-block border-2 border-wwcc-tan text-wwcc-tan px-8 py-3.5 rounded-lg font-medium hover:bg-wwcc-tan/10 transition-colors"
            >
              Plan a Group Outing
            </Link>
            <a
              href="tel:+15092008000"
              className="inline-block border-2 border-white/80 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              Call Us: (509) 200-8000
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="bg-wwcc-dark py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <p className="text-white font-bold text-xl uppercase tracking-wide mb-1">
                Walla Walla Country Club
              </p>
              <p className="text-wwcc-cream/50 text-xs uppercase tracking-widest mb-3">
                Est. 1923
              </p>
              <p className="text-wwcc-cream/80 text-sm mb-1">
                700 Country Club Dr, Walla Walla, WA 99362
              </p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-wwcc-cream/60 text-xs uppercase tracking-widest mb-2">
                  Experiences curated by
                </p>
                <p className="text-white font-semibold">Walla Walla Travel</p>
                <p className="text-wwcc-cream/70 text-sm">
                  A partnership between the Walla Walla Country Club and Walla Walla Travel
                </p>
              </div>
            </div>
            <div>
              <p className="text-white font-bold mb-3 uppercase tracking-wider text-sm">Contact</p>
              <p className="text-wwcc-cream/80 text-sm mb-1">
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
              <p className="text-white font-bold mb-3 uppercase tracking-wider text-sm">Legal</p>
              <div className="space-y-1">
                <Link
                  href="/privacy"
                  className="block text-wwcc-cream/80 text-sm hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="block text-wwcc-cream/80 text-sm hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/cancellation-policy"
                  className="block text-wwcc-cream/80 text-sm hover:text-white transition-colors"
                >
                  Cancellation Policy
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 text-center">
            <p className="text-wwcc-cream/60 text-sm">
              &copy; {new Date().getFullYear()} Walla Walla Travel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
