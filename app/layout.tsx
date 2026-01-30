import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ConditionalNavigation, ConditionalNavSpacer } from "@/components/navigation/ConditionalNav";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";
import { AnnouncementBannerWrapper } from "@/components/ui/AnnouncementBannerWrapper";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

// GA4 Measurement ID - set in environment variables
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://wallawalla.travel'),
  title: {
    default: 'Walla Walla Travel | Wine Country Tours & Experiences',
    template: '%s | Walla Walla Travel',
  },
  description: 'Your guide to Walla Walla Valley wine country. Discover wineries, book tours, and plan your perfect wine tasting experience in Washington State.',
  keywords: ['Walla Walla', 'wine tours', 'wine tasting', 'wineries', 'Washington wine', 'wine country'],
  authors: [{ name: 'Walla Walla Travel' }],
  creator: 'Walla Walla Travel',
  publisher: 'Walla Walla Travel',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://wallawalla.travel',
    siteName: 'Walla Walla Travel',
    title: 'Walla Walla Travel | Wine Country Tours & Experiences',
    description: 'Your guide to Walla Walla Valley wine country. Discover wineries, book tours, and plan your perfect wine tasting experience.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Walla Walla Wine Country',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Walla Walla Travel | Wine Country Tours',
    description: 'Your guide to Walla Walla Valley wine country.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Walla Walla Travel',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#8B1538',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <OrganizationJsonLd />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Skip link for accessibility - keyboard users can bypass navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#8B1538] focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <ErrorBoundary name="RootLayout">
          <ServiceWorkerProvider>
            <AnnouncementBannerWrapper position="top" />
            <main id="main-content">
              {children}
            </main>
            <OfflineSyncIndicator />
            <ConditionalNavSpacer />
            <ConditionalNavigation />
          </ServiceWorkerProvider>
        </ErrorBoundary>

        {/* Google Analytics 4 */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_title: document.title,
                  page_location: window.location.href,
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
