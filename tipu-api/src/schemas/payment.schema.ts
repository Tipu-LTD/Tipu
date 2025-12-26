import { z } from 'zod'

/**
 * Create payment intent schema
 * Validates payment creation requests
 */
export const createPaymentIntentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID required'),
  amount: z.number()
    .int('Amount must be an integer')
    .positive('Amount must be positive')
    .min(100, 'Amount must be at least £1.00 (100 pence)')
    .max(100000, 'Amount must not exceed £1000.00 (100000 pence)'),
  currency: z.enum(['gbp']).default('gbp'),
})

/**
 * Create Stripe Connect account schema (for tutors)
 */
export const createConnectAccountSchema = z.object({
  // Optional fields for pre-filling the onboarding form
  email: z.string().email().optional(),
  country: z.string().length(2).optional(), // ISO 3166-1 alpha-2 country code
})

/**
 * Stripe webhook event schema
 * Note: Actual validation is done by Stripe signature verification
 * This is just for basic type checking
 */
export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(), // Stripe event object (varies by type)
  }),
})
