/**
 * Phone Number Utilities
 *
 * Centralized phone formatting, parsing, and validation.
 * Replaces duplicate implementations in validation-utils.ts, sms.ts, and lib/config/index.ts.
 */

export interface CountryCode {
  code: string;       // ISO 3166-1 alpha-2
  name: string;
  dialCode: string;   // e.g. '+1'
  flag: string;       // emoji flag
  digitLength: number; // expected digits after dial code
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', digitLength: 10 },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', digitLength: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', digitLength: 10 },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', digitLength: 9 },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', digitLength: 10 },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', digitLength: 11 },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', digitLength: 9 },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', digitLength: 10 },
];

/**
 * Remove all non-digit characters from a phone string.
 */
export function stripToDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Format a phone number for display.
 *
 * US/CA 10-digit numbers → (xxx) xxx-xxxx
 * 11-digit starting with 1 → (xxx) xxx-xxxx (strips the leading 1)
 * All others → returned as-is.
 */
export function formatPhoneDisplay(phone: string, countryCode: string = 'US'): string {
  if (!phone) return '';

  const digits = stripToDigits(phone);

  // US / CA formatting
  if (countryCode === 'US' || countryCode === 'CA') {
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === '1') {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
  }

  return phone;
}

/**
 * Convert a phone number to E.164 format for Twilio / SMS.
 *
 * @example toE164('(509) 200-8000')       → '+15092008000'
 * @example toE164('5092008000')            → '+15092008000'
 * @example toE164('+15092008000')          → '+15092008000'
 * @example toE164('2008000', '+44')        → '+442008000'
 */
export function toE164(phone: string, dialCode: string = '+1'): string {
  // Already E.164
  if (phone.startsWith('+') && stripToDigits(phone).length >= 10) {
    return `+${stripToDigits(phone)}`;
  }

  const digits = stripToDigits(phone);
  const dialDigits = stripToDigits(dialCode);

  // US/CA: 11 digits starting with 1 → already has country code
  if (dialDigits === '1' && digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // US/CA: 10 digits → prepend country code
  if (dialDigits === '1' && digits.length === 10) {
    return `+1${digits}`;
  }

  // Generic: prepend dial code digits
  return `+${dialDigits}${digits}`;
}

/**
 * Parse an E.164 number back to display format + country code.
 */
export function fromE164(e164: string): { display: string; countryCode: string } {
  if (!e164 || !e164.startsWith('+')) {
    return { display: e164 || '', countryCode: 'US' };
  }

  const digits = stripToDigits(e164);

  // Match against known country codes (longest dial code first to avoid +1 matching +44 etc.)
  const sorted = [...COUNTRY_CODES].sort(
    (a, b) => stripToDigits(b.dialCode).length - stripToDigits(a.dialCode).length
  );

  for (const country of sorted) {
    const dc = stripToDigits(country.dialCode);
    if (digits.startsWith(dc)) {
      const localDigits = digits.slice(dc.length);
      return {
        display: formatPhoneDisplay(localDigits, country.code),
        countryCode: country.code,
      };
    }
  }

  // Fallback: assume US
  return { display: formatPhoneDisplay(digits, 'US'), countryCode: 'US' };
}

/**
 * Validate a phone number for a given country.
 * Accepts 10 or 11 digits for US/CA (with or without leading 1).
 */
export function isValidPhone(phone: string, countryCode: string = 'US'): boolean {
  if (!phone) return false;

  const digits = stripToDigits(phone);
  if (digits.length === 0) return false;

  const country = COUNTRY_CODES.find((c) => c.code === countryCode);
  if (!country) {
    // Unknown country — just check we have a reasonable digit count
    return digits.length >= 7 && digits.length <= 15;
  }

  // US/CA: accept 10 digits or 11 digits starting with 1
  if (countryCode === 'US' || countryCode === 'CA') {
    return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
  }

  return digits.length === country.digitLength;
}
