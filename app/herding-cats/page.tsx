"use client";

/**
 * Herding Cats Wine Tours - Landing Page
 * Sophisticated, verbose, dry wit - The New Yorker of wine tours
 */

import Link from 'next/link';

export default function HerdingCatsLandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#6B1F3A] to-[#3A3633] text-[#F5F1E8] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 py-20 relative z-10">
          <div className="text-center">
            <div className="mb-6">
              <h1 className="text-5xl md:text-6xl font-serif mb-4 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                HERDING CATS
              </h1>
              <div className="text-xl md:text-2xl text-[#B8926A] italic mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Wine Tours
              </div>
            </div>
            <div className="w-32 h-1 bg-[#B8926A] mx-auto mb-8"></div>
            <p className="text-2xl md:text-3xl text-[#B8926A] italic tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              The Art of Collective Refinement
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#B8926A] opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#B8926A] opacity-5 rounded-full -ml-24 -mb-24"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        
        {/* Introduction */}
        <div className="prose prose-lg max-w-none mb-16">
          <p className="text-lg text-[#1A1614] leading-relaxed mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Much like orchestrating the singular focus of our feline namesakes, we expertly 
            navigate discerning palates through Walla Walla's most distinguished estates.
          </p>
          <p className="text-lg text-[#3A3633] leading-relaxed mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Each member of your party—like each vintage we encounter—possesses unique 
            characteristics demanding individual appreciation. Our sommelier-guides possess 
            both the patience of a master vintner and the quiet authority required to unify 
            diverse enthusiasms toward collective enlightenment.
          </p>
          <p className="text-lg text-[#3A3633] leading-relaxed italic" style={{ fontFamily: 'Georgia, serif' }}>
            The task may be Sisyphean, but the terroir is unparalleled.
          </p>
        </div>

        {/* Experiences */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif text-[#6B1F3A] mb-8 text-center" style={{ fontFamily: 'Georgia, serif' }}>
            Our Experiences
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* The Pedigree Experience */}
            <div className="bg-white border border-[#B8926A] p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-serif text-[#1A1614] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                The Pedigree Experience
              </h3>
              <p className="text-sm text-[#3A3633] mb-4">6 hours | 2-6 individuals</p>
              <p className="text-[#1A1614] leading-relaxed mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                A curated progression through establishments demonstrating documented commitment 
                to viticultural excellence. Suitable for those whose palates possess the discernment 
                of a show cat judge.
              </p>
              <p className="text-sm text-[#6B7280]" style={{ fontFamily: 'Georgia, serif' }}>
                From $520 (party of four, Sunday-Wednesday)
              </p>
            </div>

            {/* The Independent Spirit Tour */}
            <div className="bg-white border border-[#B8926A] p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-serif text-[#1A1614] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                The Independent Spirit Tour
              </h3>
              <p className="text-sm text-[#3A3633] mb-4">7-8 hours | 2-8 individuals</p>
              <p className="text-[#1A1614] leading-relaxed mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                For groups demonstrating strong individual preferences yet collective desire for 
                expertly guided exploration. Much like herding particularly headstrong felines, 
                this itinerary accommodates divergent interests while maintaining forward momentum.
              </p>
              <p className="text-sm text-[#6B7280]" style={{ fontFamily: 'Georgia, serif' }}>
                From $650 (party of four)
              </p>
            </div>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-[#F5F1E8] border-l-4 border-[#6B1F3A] p-8 mb-16">
          <h2 className="text-2xl font-serif text-[#1A1614] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            On Herding & Heritage
          </h2>
          <div className="space-y-4 text-[#3A3633]" style={{ fontFamily: 'Georgia, serif' }}>
            <p className="leading-relaxed">
              "Why 'Herding Cats'?" you inquire with justified skepticism.
            </p>
            <p className="leading-relaxed">
              Those familiar with the idiomatic expression understand: convincing independent-minded 
              individuals toward unified direction requires finesse, patience, and perhaps a touch 
              of foolhardy optimism.
            </p>
            <p className="leading-relaxed">
              After years observing group dynamics in viticultural settings, we've concluded: 
              attempting to impose uniformity upon diverse personalities proves both futile and 
              inadvisable. Instead, we employ a methodology borrowed from behavioral science and 
              large-scale feline management.
            </p>
            <p className="leading-relaxed italic">
              The impossible remains merely improbable with proper expertise.
            </p>
          </div>
        </div>

        {/* Qualifications */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif text-[#6B1F3A] mb-8 text-center" style={{ fontFamily: 'Georgia, serif' }}>
            What Distinguishes Herding Cats
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🍷</div>
              <h3 className="text-lg font-serif text-[#1A1614] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Sommelier Expertise
              </h3>
              <p className="text-sm text-[#3A3633]" style={{ fontFamily: 'Georgia, serif' }}>
                Advanced Sommelier certification—credentials typically reserved for career wine 
                professionals operating at industry's highest echelons.
              </p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">🐱</div>
              <h3 className="text-lg font-serif text-[#1A1614] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Group Dynamic Management
              </h3>
              <p className="text-sm text-[#3A3633]" style={{ fontFamily: 'Georgia, serif' }}>
                Refined techniques for navigating diverse personalities toward collective 
                enjoyment—skills applicable to both wine tours and international diplomacy.
              </p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">🏛️</div>
              <h3 className="text-lg font-serif text-[#1A1614] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Estate Relationships
              </h3>
              <p className="text-sm text-[#3A3633]" style={{ fontFamily: 'Georgia, serif' }}>
                Our reputation grants access to experiences unavailable through standard 
                channels—library vintages, private tastings, winemaker discussions.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-[#6B1F3A] to-[#3A3633] p-12 text-center text-white">
          <h2 className="text-3xl font-serif mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Reserve Your Experience
          </h2>
          <p className="text-[#B8926A] mb-8 max-w-2xl mx-auto" style={{ fontFamily: 'Georgia, serif' }}>
            Orchestrating independent-minded individuals toward collective wine country enlightenment 
            requires expertise. Fortunately, this constitutes our specialty.
          </p>
          <Link
            href="/book?brand=2"
            className="inline-block bg-[#B8926A] text-[#1A1614] px-12 py-4 text-lg font-serif hover:bg-[#8A9A7B] transition-colors shadow-lg"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Commence Coordination
          </Link>
          <p className="text-[#B8926A] text-sm mt-6 italic" style={{ fontFamily: 'Georgia, serif' }}>
            Or contact us directly: (509) 200-8000 • tours@hctours.com
          </p>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-[#6B7280] italic" style={{ fontFamily: 'Georgia, serif' }}>
          <p>
            P.S. Actual cats herded to date: zero. Metaphorical cats successfully navigated: 
            statistically significant sample size suggesting the impossible merely requires appropriate expertise.
          </p>
        </div>

      </div>

      {/* Bottom Footer */}
      <div className="bg-[#3A3633] text-[#F5F1E8] py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Herding Cats Wine Tours operates as part of the Walla Walla Travel family of brands
          </p>
          <p className="text-xs text-[#B8926A]">
            Licensed & Insured • Advanced Sommelier Certified • Walla Walla Valley, Washington
          </p>
        </div>
      </div>

    </div>
  );
}


