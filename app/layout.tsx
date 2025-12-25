import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalNavigation, ConditionalNavSpacer } from "@/components/navigation/ConditionalNav";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Walla Walla Travel - Operations",
  description: "Walla Walla Travel booking and operations system",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#8B1538", // Wine red
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Walla Walla Travel"
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerProvider>
          {children}
          <OfflineSyncIndicator />
          <ConditionalNavSpacer />
          <ConditionalNavigation />
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
