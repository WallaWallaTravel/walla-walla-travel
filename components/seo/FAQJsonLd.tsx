/**
 * FAQPage JSON-LD Schema for AI Discoverability
 *
 * Makes Q&A content extractable by AI systems like ChatGPT, Perplexity, and Google AI Overviews.
 * AI crawlers can now extract and cite specific answers from FAQ content.
 */

export interface FAQ {
  question: string;
  answer: string;
}

interface FAQJsonLdProps {
  faqs: FAQ[];
  pageUrl?: string;
}

export function FAQJsonLd({ faqs, pageUrl }: FAQJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(pageUrl && { "@id": pageUrl }),
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
