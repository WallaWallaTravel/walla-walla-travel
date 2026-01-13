'use client';

import { Accordion } from './Accordion';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
  title?: string;
  className?: string;
}

/**
 * FAQ Section with single-open accordion behavior
 * Use this in server components where you need interactive FAQs
 */
export function FAQSection({
  faqs,
  title = 'Frequently Asked Questions',
  className = ''
}: FAQSectionProps) {
  return (
    <section className={className}>
      <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
        {title}
      </h2>
      <Accordion items={faqs} />
    </section>
  );
}
