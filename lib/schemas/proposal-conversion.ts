import { z } from 'zod'

/**
 * Schema: Accept a trip proposal (client-facing)
 *
 * Used when a client views and accepts a proposal by providing
 * their signature and agreeing to terms.
 */
export const AcceptProposalSchema = z.object({
  signature: z.string().min(1, 'Signature is required'),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
})

export type AcceptProposalInput = z.infer<typeof AcceptProposalSchema>

/**
 * Schema: Create a Stripe PaymentIntent for proposal deposit
 *
 * Triggered after proposal is accepted, before payment is processed.
 * The proposalNumber is passed as a parameter, not in the body.
 */
export const CreatePaymentSchema = z.object({
  proposalNumber: z.string().min(1, 'Proposal number is required').startsWith('TP-', 'Invalid proposal number format'),
})

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>

/**
 * Schema: Confirm a payment after Stripe redirect
 *
 * After Stripe processes the payment and redirects back,
 * we confirm the payment intent and mark the deposit as paid.
 */
export const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  proposalNumber: z.string().min(1, 'Proposal number is required').startsWith('TP-', 'Invalid proposal number format'),
})

export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>
