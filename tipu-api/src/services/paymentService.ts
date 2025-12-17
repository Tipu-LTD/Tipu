import { stripe } from '../config/stripe'
import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { CreatePaymentIntentInput, CreatePaymentIntentResponse } from '../types/payment'
import { ApiError } from '../middleware/errorHandler'
import { FieldValue } from 'firebase-admin/firestore'
import * as teamsService from './teamsService'

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
    payment_method_types: ['card'],
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
 * Also generates Teams meeting link after payment confirmation
 */
export const confirmPayment = async (
  bookingId: string,
  paymentIntentId: string
): Promise<void> => {
  const bookingRef = db.collection('bookings').doc(bookingId)

  // Update payment status first
  await bookingRef.update({
    isPaid: true,
    paymentIntentId,
    status: 'confirmed',
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`Payment confirmed for booking: ${bookingId}`, {
    paymentIntentId,
  })

  // Generate Teams meeting link after payment confirmation
  try {
    const meetingResult = await teamsService.generateMeetingForBooking(bookingId)

    logger.info(`Teams meeting generated for booking: ${bookingId}`, {
      meetingId: meetingResult.meetingId,
      joinUrl: meetingResult.joinUrl,
    })
  } catch (error: any) {
    // Log detailed error information for debugging
    logger.error(`❌ Failed to create Teams meeting for booking ${bookingId}`, {
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode || error.status,
      code: error.code,
      bookingId,
      timestamp: new Date().toISOString()
    })

    // Log specific error types for easier debugging
    if (error.statusCode === 401) {
      logger.error('🔐 Teams API authentication failed - check MICROSOFT_CLIENT_SECRET')
    }
    if (error.statusCode === 403) {
      logger.error('🚫 Teams API permission denied - check Azure AD permissions')
    }
    if (error.statusCode === 404) {
      logger.error('👤 Organizer account not found - check TEAMS_ORGANIZER_EMAIL')
    }

    // Payment succeeds even if Teams fails (graceful degradation)
    // Meeting can be generated manually via /generate-meeting endpoint
    // TODO: Could send notification to admin or add to retry queue
  }
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
