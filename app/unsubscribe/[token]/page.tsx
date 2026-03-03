/**
 * Unsubscribe Page
 *
 * Server component that processes unsubscribe requests via token-based URL.
 * No auth required — the token itself is the credential.
 *
 * States:
 *   - Token not found → "Invalid or expired link"
 *   - Already unsubscribed → "You're already unsubscribed"
 *   - Valid → Sets unsubscribed_at, shows confirmation
 */

import { emailPreferencesService } from '@/lib/services/email-preferences.service';

export const metadata = {
  title: 'Unsubscribe — Walla Walla Travel',
  robots: 'noindex, nofollow',
};

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await emailPreferencesService.unsubscribe(token);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #8B1538 0%, #722F37 100%)',
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          <h1 style={{
            color: '#ffffff',
            margin: 0,
            fontSize: '22px',
            fontWeight: 'bold',
          }}>
            Walla Walla Travel
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            margin: '8px 0 0 0',
            fontSize: '14px',
          }}>
            Email Preferences
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '36px 28px', textAlign: 'center' }}>
          {!result.success ? (
            <>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '24px',
              }}>
                &#10060;
              </div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 12px 0',
              }}>
                Invalid or Expired Link
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                lineHeight: '1.6',
                margin: 0,
              }}>
                This unsubscribe link is no longer valid. If you continue to
                receive unwanted emails, please contact us at{' '}
                <a
                  href="mailto:info@wallawalla.travel"
                  style={{ color: '#8B1538', textDecoration: 'none' }}
                >
                  info@wallawalla.travel
                </a>.
              </p>
            </>
          ) : result.already_unsubscribed ? (
            <>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '24px',
              }}>
                &#9989;
              </div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 12px 0',
              }}>
                Already Unsubscribed
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                lineHeight: '1.6',
                margin: 0,
              }}>
                You&apos;re already unsubscribed from marketing emails.
                You won&apos;t receive any further promotional messages from us.
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '24px',
              }}>
                &#9989;
              </div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 12px 0',
              }}>
                You&apos;ve Been Unsubscribed
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                lineHeight: '1.6',
                margin: 0,
              }}>
                You&apos;ve been successfully unsubscribed from marketing emails.
                You&apos;ll still receive important transactional emails like booking
                confirmations and payment receipts.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '20px 24px',
          textAlign: 'center',
          borderTop: '1px solid #e5e7eb',
        }}>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: '#6b7280',
          }}>
            Walla Walla Travel &bull; wallawalla.travel
          </p>
        </div>
      </div>
    </div>
  );
}
