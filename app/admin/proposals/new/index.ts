/**
 * Proposal Creation Module Exports
 *
 * @module app/admin/proposals/new
 * @description Exports for the proposal creation system.
 * Use these exports when building new components that interact with proposals.
 */

// Types
export type {
  ServiceItem,
  ProposalData,
  PricingStrategy,
  Winery,
  AdditionalService,
  PriceCalculation,
} from './types';

// Hooks
export { useProposalForm } from './hooks/useProposalForm';

// Components
export { WinerySelector } from './winery-selector';
