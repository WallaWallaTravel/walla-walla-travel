import type { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact Us | Walla Walla Travel',
  description: 'Get in touch with Walla Walla Travel for wine tour planning, custom itineraries, and trip inquiries.',
  alternates: {
    canonical: 'https://wallawalla.travel/contact',
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
