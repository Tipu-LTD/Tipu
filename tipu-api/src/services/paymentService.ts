import { stripe } from '../config/stripe'
import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { CreatePaymentIntentInput, CreatePaymentIntentResponse } from '../types/payment'
import { ApiError } from '../middleware/errorHandler'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Create Stripe Payment Intent for a booking
 */
export const createPaymentIntent = async (
  input: CreatePaymentIntentInput
): Promise<CreatePaymentIntentResponse> => {
  // Get booking details
  const bookingDoc = await db.collection('bookings').doc(input.bookingId).get()

  if (!bookingDoc.exists) {
    throw new ApiError('Booking not found', 404)
  }

  const booking = bookingDoc.data()

  // Create Stripe Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: input.amount,
    currency: input.currency || 'gbp',
    metadata: {
      bookingId: input.bookingId,
      studentId: booking?.studentId,
      tutorId: booking?.tutorId,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  })

  logger.info(`Payment intent created: ${paymentIntent.id}`, {
    bookingId: input.bookingId,
    amount: input.amount,
  })

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  }
}

/**
 * Confirm payment and update booking
 * Called by Stripe webhook
 */
export const confirmPayment = async (
  bookingId: string,
  paymentIntentId: string
): Promise<void> => {
  const bookingRef = db.collection('bookings').doc(bookingId)

  await bookingRef.update({
    isPaid: true,
    paymentIntentId,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`Payment confirmed for booking: ${bookingId}`, {
    paymentIntentId,
  })
}

/**
 * Get payment history for a user
 */
export const getPaymentHistory = async (userId: string) => {
  const snapshot = await db
    .collection('bookings')
    .where('studentId', '==', userId)
    .where('isPaid', '==', true)
    .orderBy('updatedAt', 'desc')
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      bookingId: doc.id,
      amount: data.price,
      subject: data.subject,
      level: data.level,
      paidAt: data.updatedAt,
      tutorId: data.tutorId,
    }
  })
}

/**
 * Create Stripe Connect account for tutor
 */
export const createConnectAccount = async (tutorId: string, email: string) => {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    email,
    capabilities: {
      transfers: { requested: true },
    },
  })

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.FRONTEND_URL}/dashboard/tutor`,
    return_url: `${process.env.FRONTEND_URL}/dashboard/tutor?connect=success`,
    type: 'account_onboarding',
  })

  // Save Connect account ID to user profile
  await db.collection('users').doc(tutorId).update({
    stripeConnectId: account.id,
  })

  logger.info(`Stripe Connect account created for tutor: ${tutorId}`, {
    accountId: account.id,
  })

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  }
}
