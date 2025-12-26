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
 * Called by Stripe webhook OR frontend after payment
 * Also generates Teams meeting link after payment confirmation
 */
export const confirmPayment = async (
  bookingId: string,
  paymentIntentId: string
): Promise<void> => {
  logger.info('💳 [PAYMENT DEBUG] confirmPayment called', {
    bookingId,
    paymentIntentId,
    timestamp: new Date().toISOString(),
  })

  // Validate payment intent ID format before saving to database
  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    const error = new Error(`Invalid payment intent ID: ${paymentIntentId}`)
    logger.error('❌ [PAYMENT DEBUG] Invalid payment intent ID in confirmPayment', {
      bookingId,
      paymentIntentId,
      error: error.message,
    })
    throw new ApiError('Invalid payment intent ID format', 400)
  }

  const bookingRef = db.collection('bookings').doc(bookingId)

  // Verify booking exists and check for duplicate confirmations (idempotency)
  const bookingSnap = await bookingRef.get()
  if (!bookingSnap.exists) {
    throw new ApiError('Booking not found', 404)
  }

  const booking = bookingSnap.data()

  // Check if payment intent ID is already set (idempotency check)
  if (booking?.paymentIntentId && booking.paymentIntentId !== paymentIntentId) {
    logger.warn('⚠️ [PAYMENT DEBUG] Booking already has different payment intent ID', {
      bookingId,
      existingPaymentIntentId: booking.paymentIntentId,
      newPaymentIntentId: paymentIntentId,
    })
    // If the existing ID is the placeholder, allow overwrite
    if (booking.paymentIntentId === 'frontend-confirmation') {
      logger.info('✅ [PAYMENT DEBUG] Overwriting placeholder payment intent ID', {
        bookingId,
        oldPaymentIntentId: booking.paymentIntentId,
        newPaymentIntentId: paymentIntentId,
      })
    } else {
      // Real IDs should match - this might be a duplicate confirmation
      throw new ApiError(
        'Booking already confirmed with a different payment intent',
        409
      )
    }
  }

  // Update payment status
  logger.info('💾 [PAYMENT DEBUG] Updating booking with payment confirmation', {
    bookingId,
    updates: {
      isPaid: true,
      paymentIntentId,
      status: 'confirmed',
    },
  })

  await bookingRef.update({
    isPaid: true,
    paymentIntentId,
    paymentCapturedAt: FieldValue.serverTimestamp(),
    status: 'confirmed',
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info('✅ [PAYMENT DEBUG] Payment confirmed in database', {
    bookingId,
    paymentIntentId,
  })

  // Generate Teams meeting link after payment confirmation
  logger.info('🚀 [PAYMENT DEBUG] Starting Teams meeting generation', {
    bookingId,
  })

  try {
    const meetingResult = await teamsService.generateMeetingForBooking(bookingId)

    logger.info('🎉 [PAYMENT DEBUG] Teams meeting generated successfully', {
      bookingId,
      meetingId: meetingResult.meetingId,
      joinUrl: meetingResult.joinUrl,
      organizerEmail: meetingResult.organizerEmail,
    })
  } catch (error: any) {
    // Log detailed error information for debugging
    logger.error('💥 [PAYMENT DEBUG] Failed to create Teams meeting', {
      bookingId,
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack,
        statusCode: error.statusCode || error.status,
        code: error.code,
        fullError: JSON.stringify(error, null, 2),
      },
      timestamp: new Date().toISOString(),
    })

    // Log specific error types for easier debugging
    if (error.statusCode === 401) {
      logger.error('🔐 [PAYMENT DEBUG] Teams API authentication failed - check MICROSOFT_CLIENT_SECRET')
    }
    if (error.statusCode === 403) {
      logger.error('🚫 [PAYMENT DEBUG] Teams API permission denied - check Azure AD permissions')
    }
    if (error.statusCode === 404) {
      logger.error('👤 [PAYMENT DEBUG] Organizer account not found - check TEAMS_ORGANIZER_EMAIL')
    }

    logger.warn('⚠️ [PAYMENT DEBUG] Payment succeeded but Teams generation failed (graceful degradation)', {
      bookingId,
      message: 'Meeting can be generated manually via /generate-meeting endpoint',
    })

    // Payment succeeds even if Teams fails (graceful degradation)
    // Meeting can be generated manually via /generate-meeting endpoint
    // TODO: Could send notification to admin or add to retry queue
  }

  logger.info('✅ [PAYMENT DEBUG] confirmPayment completed', {
    bookingId,
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
