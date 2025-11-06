import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav, BottomNavSpacer } from "@/components/ui/bottom-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Driver Portal",
  description: "Driver login and workflow system",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Driver Portal"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <BottomNavSpacer />
        <BottomNav
          items={[
            {
              label: 'Home',
              icon: '🏠',
              href: '/driver-portal/unified-dashboard'
            },
            {
              label: 'Schedule',
              icon: '📅',
              href: '/calendar'
            },
            {
              label: 'Bookings',
              icon: '📝',
              href: '/bookings/new'
            },
            {
              label: 'Test',
              icon: '🧪',
              href: '/test-mobile'
            }
          ]}
        />
      </body>
    </html>
  );
}
