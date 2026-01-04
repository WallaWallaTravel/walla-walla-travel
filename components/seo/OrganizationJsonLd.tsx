/**
 * Organization and WebSite JSON-LD Schema for AI Discoverability
 *
 * These schemas help AI systems understand:
 * - What the business is (Organization)
 * - How to search the site (WebSite with SearchAction)
 * - Business credentials and contact info
 */

export function OrganizationJsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://wallawalla.travel/#organization",
    "name": "Walla Walla Travel",
    "url": "https://wallawalla.travel",
    "logo": {
      "@type": "ImageObject",
      "url": "https://wallawalla.travel/logo.png",
      "width": 512,
      "height": 512
    },
    "description": "The authoritative guide to Walla Walla wine country. Verified winery information, insider tips from locals, and personalized trip planning for Washington's premier wine region.",
    "slogan": "Your guide to Walla Walla wine country",
    "foundingDate": "2023",
    "areaServed": [
      {
        "@type": "Place",
        "name": "Walla Walla Valley AVA",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 46.0646,
          "longitude": -118.3430
        }
      },
      {
        "@type": "AdministrativeArea",
        "name": "Washington State"
      }
    ],
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "email": "info@wallawalla.travel",
        "telephone": "+1-509-200-8000",
        "availableLanguage": "English",
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "17:00"
        }
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Walla Walla",
      "addressRegion": "WA",
      "addressCountry": "US"
    },
    "sameAs": [
      // Add social media URLs when available
    ],
    "knowsAbout": [
      "Walla Walla Valley wine",
      "Wine tasting experiences",
      "Washington State wineries",
      "Wine tour planning",
      "Local wine country expertise"
    ],
    "parentOrganization": {
      "@type": "Organization",
      "name": "Northwest Touring LLC",
      "description": "Licensed motor carrier providing wine tours in Washington State",
      "identifier": {
        "@type": "PropertyValue",
        "name": "USDOT",
        "value": "3603851"
      }
    }
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://wallawalla.travel/#website",
    "name": "Walla Walla Travel",
    "url": "https://wallawalla.travel",
    "description": "Your comprehensive guide to Walla Walla wine country. Explore 120+ wineries, read insider tips, and plan your perfect wine tasting trip.",
    "publisher": {
      "@id": "https://wallawalla.travel/#organization"
    },
    "inLanguage": "en-US",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://wallawalla.travel/wineries?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
    </>
  );
}
