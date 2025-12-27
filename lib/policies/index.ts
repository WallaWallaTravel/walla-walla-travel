/**
 * Policies Module - Single Source of Truth
 *
 * All legal terms, policies, and conditions for:
 * - NW Touring & Concierge (transportation provider)
 * - Walla Walla Travel (booking platform)
 * - Herding Cats Wine Tours (DBA of NW Touring)
 */

export * from './cancellation-policy';
export * from './nw-touring-terms';
export * from './policy-components';
export * from './nw-touring-components';

// Re-export types with aliases to avoid conflicts
export type { TermsSection as NWTouringTermsSection } from './nw-touring-full-terms';
export type { TermsSection as WWTTermsSection } from './wwt-terms';

// Re-export everything else from these modules except the conflicting TermsSection interface
export {
  NW_TOURING_FULL_TERMS,
  NW_TOURING_BOOKING_SECTIONS,
  NW_TOURING_COMPLETE_TERMS,
  getNWTouringSection,
  getNWTouringTermsSummary,
  getDepositAmount,
} from './nw-touring-full-terms';

export {
  WWT_TERMS,
  WWT_TERMS_SECTIONS,
  getTermsSection,
  getTermsSectionsText,
  getKeyTermsSummary,
} from './wwt-terms';

// Policy version tracking
export const POLICY_VERSIONS = {
  NW_TOURING_TERMS: '1.0',
  NW_TOURING_TERMS_DATE: '2025-12-25',
  NW_TOURING_FULL_TERMS: '1.0',
  NW_TOURING_FULL_TERMS_DATE: '2025-12-25',
  WWT_TERMS: '1.0',
  WWT_TERMS_DATE: '2025-12-25',
  CANCELLATION_POLICY: '1.0',
  CANCELLATION_POLICY_DATE: '2025-12-25',
} as const;
