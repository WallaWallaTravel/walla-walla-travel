/**
 * Dark Mode CSS for Email Templates
 *
 * Returns HTML meta tags and a <style> block for dark mode support.
 * Insert into the <head> of every email template.
 *
 * Supported by: Apple Mail, iOS Mail, Outlook.com (web), Yahoo Mail.
 * Gmail ignores @media queries but the color-scheme meta tag enables
 * its own auto-dark-mode transformations.
 *
 * @module lib/email/dark-mode-styles
 */

export function emailDarkModeStyles(): string {
  return `<meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #1f2937 !important; }
      .em-wrapper { background-color: #111827 !important; }
      .em-body { background-color: #1f2937 !important; }
      .em-body p, .em-body td, .em-body li, .em-body span { color: #e5e7eb !important; }
      .em-body h1, .em-body h2, .em-body h3 { color: #f9fafb !important; }
      .em-body a { color: #93c5fd !important; }
      .em-footer { background-color: #111827 !important; border-top-color: #374151 !important; }
      .em-footer p { color: #9ca3af !important; }
      .em-footer a { color: #9ca3af !important; }
      .em-card { background-color: #374151 !important; border-color: #4b5563 !important; }
      .em-cta { color: #ffffff !important; }
    }
  </style>`;
}
