import { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQJsonLd } from '@/components/seo/FAQJsonLd';
import { FAQSection } from '@/components/FAQSection';

export const metadata: Metadata = {
  title: 'Walla Walla Wine Country Facts & Statistics',
  description:
    'Official statistics about Walla Walla wine country: 120+ wineries, 400,000+ annual visitors, 3,000 vineyard acres. The essential reference for Washington wine data.',
  keywords: [
    'Walla Walla wine statistics',
    'Walla Walla wineries count',
    'Walla Walla tourism data',
    'Washington wine facts',
    'wine country statistics',
  ],
  openGraph: {
    title: 'Walla Walla Wine Country Facts & Statistics',
    description: 'Essential data and statistics about Washington\'s premier wine region.',
    type: 'article',
    url: 'https://wallawalla.travel/about/walla-walla-wine-facts',
  },
  alternates: {
    canonical: 'https://wallawalla.travel/about/walla-walla-wine-facts',
  },
};

const faqs = [
  {
    question: 'How many wineries are in Walla Walla?',
    answer:
      'Walla Walla Valley has over 120 wineries, making it one of the most concentrated wine regions in the United States. Most are within a 30-mile radius of downtown Walla Walla.',
  },
  {
    question: 'How many visitors come to Walla Walla wine country each year?',
    answer:
      'Approximately 400,000 wine tourists visit Walla Walla annually, contributing significantly to the local economy. The region has been named America\'s Best Wine Region multiple times.',
  },
  {
    question: 'What grapes grow best in Walla Walla?',
    answer:
      'Walla Walla excels with Cabernet Sauvignon, Syrah, and Merlot. The region also produces excellent Bordeaux blends, Tempranillo, and white varieties like Chardonnay and Viognier.',
  },
  {
    question: 'How old is the Walla Walla wine industry?',
    answer:
      'The modern Walla Walla wine industry began in 1977 with the founding of Leonetti Cellar. The Walla Walla Valley AVA was established in 1984, making it one of Washington\'s original appellations.',
  },
];

export default function WallaWallaWineFactsPage() {
  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'About', url: 'https://wallawalla.travel/about' },
    { name: 'Wine Facts', url: 'https://wallawalla.travel/about/walla-walla-wine-facts' },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={faqs} pageUrl="https://wallawalla.travel/about/walla-walla-wine-facts" />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <nav className="mb-6">
              <Link href="/about" className="text-white/70 hover:text-white text-sm">
                ← Back to About
              </Link>
            </nav>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Walla Walla Wine Country Facts
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Essential statistics and facts about one of America&apos;s premier wine destinations.
              Data sourced from the Walla Walla Valley Wine Alliance and regional tourism reports.
            </p>
            <p className="text-sm text-white/70 mt-4">
              Last updated: January 2026
            </p>
          </div>
        </div>

        {/* Key Stats Banner */}
        <div className="max-w-6xl mx-auto px-4 -mt-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-4xl md:text-5xl font-bold text-[#8B1538]">120+</p>
                <p className="text-gray-600 mt-1">Wineries</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-bold text-[#8B1538]">400K+</p>
                <p className="text-gray-600 mt-1">Annual Visitors</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-bold text-[#8B1538]">3,000</p>
                <p className="text-gray-600 mt-1">Vineyard Acres</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-bold text-[#8B1538]">$260M</p>
                <p className="text-gray-600 mt-1">Annual Tourism Impact</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Wine Production */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>🍇</span>
                  Wine Production Statistics
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Total Wineries</td>
                        <td className="px-6 py-4 font-semibold text-right">120+</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Planted Vineyard Acreage</td>
                        <td className="px-6 py-4 font-semibold text-right">3,000+ acres</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Grape Varieties Grown</td>
                        <td className="px-6 py-4 font-semibold text-right">40+</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">AVA Established</td>
                        <td className="px-6 py-4 font-semibold text-right">1984</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">First Winery Founded</td>
                        <td className="px-6 py-4 font-semibold text-right">1977 (Leonetti Cellar)</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Washington State Ranking</td>
                        <td className="px-6 py-4 font-semibold text-right">2nd largest AVA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Top Grape Varieties */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>🍷</span>
                  Top Grape Varieties
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: 'Cabernet Sauvignon', description: 'Bold, age-worthy reds with dark fruit and firm tannins', rank: 1 },
                    { name: 'Syrah', description: 'Peppery, complex wines in both bold and elegant styles', rank: 2 },
                    { name: 'Merlot', description: 'Soft, approachable reds with plum and cherry notes', rank: 3 },
                    { name: 'Cabernet Franc', description: 'Aromatic reds with herbal notes and silky texture', rank: 4 },
                    { name: 'Chardonnay', description: 'Premium whites from both oaked and unoaked styles', rank: 5 },
                    { name: 'Viognier', description: 'Aromatic whites with stone fruit and floral notes', rank: 6 },
                  ].map((grape) => (
                    <div key={grape.name} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-[#8B1538]/10 text-[#8B1538] rounded-full flex items-center justify-center font-bold text-sm">
                          {grape.rank}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">{grape.name}</p>
                          <p className="text-sm text-gray-600">{grape.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Tourism Statistics */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>📊</span>
                  Tourism Statistics
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Annual Wine Tourists</td>
                        <td className="px-6 py-4 font-semibold text-right">528,000</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Annual Visitor Spending</td>
                        <td className="px-6 py-4 font-semibold text-right">$260 million</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Peak Season</td>
                        <td className="px-6 py-4 font-semibold text-right">May - October</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Harvest Season</td>
                        <td className="px-6 py-4 font-semibold text-right">August - October</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Average Tasting Fee</td>
                        <td className="px-6 py-4 font-semibold text-right">$15 - $30</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Visitor Profile</td>
                        <td className="px-6 py-4 font-semibold text-right">Higher-end, travel-inclined</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Climate & Geography */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>🌡️</span>
                  Climate & Geography
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Elevation</td>
                        <td className="px-6 py-4 font-semibold text-right">800 - 1,800 feet</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Summer High Temps</td>
                        <td className="px-6 py-4 font-semibold text-right">85°F - 95°F</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Growing Degree Days</td>
                        <td className="px-6 py-4 font-semibold text-right">2,800 - 3,200</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Annual Rainfall</td>
                        <td className="px-6 py-4 font-semibold text-right">12 - 15 inches</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Daylight (Summer)</td>
                        <td className="px-6 py-4 font-semibold text-right">Up to 17 hours</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">Primary Soil Types</td>
                        <td className="px-6 py-4 font-semibold text-right">Loess, Basalt, Alluvial</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Historical Timeline */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>📜</span>
                  Historical Timeline
                </h2>
                <div className="space-y-4">
                  {[
                    { year: '1977', event: 'Leonetti Cellar founded, the first commercial winery' },
                    { year: '1981', event: 'Woodward Canyon Winery established' },
                    { year: '1984', event: 'Walla Walla Valley AVA officially designated' },
                    { year: '2001', event: 'The Rocks District of Milton-Freewater gains recognition' },
                    { year: '2015', event: 'The Rocks District AVA established' },
                    { year: '2020', event: 'Over 120 wineries operating in the valley' },
                    { year: '2024', event: 'Wine tourism rebounds to record levels' },
                  ].map((item) => (
                    <div key={item.year} className="flex items-start gap-4 bg-white rounded-xl border border-gray-200 p-4">
                      <span className="px-3 py-1 bg-[#8B1538] text-white rounded-lg font-bold text-sm">
                        {item.year}
                      </span>
                      <p className="text-gray-700">{item.event}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ Section */}
              <FAQSection
                faqs={faqs}
                className="mt-12 pt-8 border-t border-gray-200"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Experience the Valley
                </h3>
                <p className="text-gray-600 mb-6">
                  Ready to explore Walla Walla wine country? Start planning your visit.
                </p>

                <Link
                  href="/wineries"
                  className="block w-full bg-[#8B1538] text-white text-center py-3 rounded-xl font-semibold hover:bg-[#722F37] transition-colors mb-3"
                >
                  Browse Wineries
                </Link>

                <Link
                  href="/itineraries"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  View Itineraries
                </Link>
              </div>

              {/* Source Attribution */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Data Sources
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Statistics compiled from official sources including:
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8B1538]">•</span>
                    Walla Walla Valley Wine Alliance
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8B1538]">•</span>
                    Washington State Wine Commission
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8B1538]">•</span>
                    Visit Walla Walla
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8B1538]">•</span>
                    Regional tourism reports
                  </li>
                </ul>
                <p className="text-xs text-gray-500 mt-4">
                  Last verified: January 2026
                </p>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Related Guides
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/guides/best-time-to-visit"
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-900">Best Time to Visit</span>
                    <span className="block text-sm text-gray-500">Seasonal planning guide</span>
                  </Link>
                  <Link
                    href="/guides/wine-101"
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-900">Wine 101</span>
                    <span className="block text-sm text-gray-500">Beginner&apos;s guide</span>
                  </Link>
                  <Link
                    href="/neighborhoods"
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-900">Wine Districts</span>
                    <span className="block text-sm text-gray-500">Explore by neighborhood</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
