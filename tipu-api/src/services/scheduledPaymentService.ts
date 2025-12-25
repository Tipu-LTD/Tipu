import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { stripe } from '../config/stripe'
import { FieldValue } from 'firebase-admin/firestore'
import * as paymentService from './paymentService'
import * as notificationService from './notificationService'

/**
 * Process scheduled payments - handles both auth creation and capture
 * Called by cron job every 15 minutes
 */
export const processScheduledPayments = async (): Promise<{
  authsCreated: number
  captured: number
  successful: number
  failed: number
  errors: Array<{ bookingId: string; error: string }>
}> => {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))

  const stats = {
    authsCreated: 0,
    captured: 0,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ bookingId: string; error: string }>,
  }

  logger.info('🕐 [SCHEDULED PAYMENT] Starting processing', {
    timestamp: now.toISOString(),
  })

  try {
    // STEP 1: Create authorizations for bookings ≥7 days away (now at 7-day mark)
    const authBookings = await db
      .collection('bookings')
      .where('status', '==', 'accepted')
      .where('paymentAuthType', '==', 'deferred_auth')
      .where('requiresAuthCreation', '==', true)
      .where('scheduledAt', '<=', sevenDaysFromNow)
      .where('scheduledAt', '>', now)
      .limit(20)
      .get()

    logger.info(`📋 [SCHEDULED PAYMENT] Found ${authBookings.size} bookings needing authorization`)

    for (const doc of authBookings.docs) {
      const booking = doc.data()
      const bookingId = doc.id

      try {
        await createDeferredAuthorization(bookingId, booking)
        stats.authsCreated++
        stats.successful++
      } catch (error: any) {
        stats.failed++
        stats.errors.push({
          bookingId,
          error: error.message,
        })
        logger.error('❌ [SCHEDULED PAYMENT] Failed to create authorization', {
          bookingId,
          error: error.message,
        })
      }
    }

    // STEP 2: Capture authorizations for bookings at 24h mark
    const captureBookings = await db
      .collection('bookings')
      .where('status', '==', 'accepted')
      .where('isPaid', '==', false)
      .where('paymentScheduledFor', '<=', now)
      .where('paymentAttempted', '==', false)
      .limit(20)
      .get()

    logger.info(`💳 [SCHEDULED PAYMENT] Found ${captureBookings.size} authorizations to capture`)

    for (const doc of captureBookings.docs) {
      const booking = doc.data()
      const bookingId = doc.id

      try {
        // Check if this is immediate charge flow (no authorization needed)
        if (booking.paymentAuthType === 'immediate_charge') {
          await processImmediateCharge(bookingId, booking)
        } else {
          // Capture existing authorization
          await captureAuthorization(bookingId, booking)
        }
        stats.captured++
        stats.successful++
      } catch (error: any) {
        stats.failed++
        stats.errors.push({
          bookingId,
          error: error.message,
        })
        logger.error('❌ [SCHEDULED PAYMENT] Failed to capture payment', {
          bookingId,
          error: error.message,
        })
      }
    }

    logger.info('✅ [SCHEDULED PAYMENT] Completed processing', {
      ...stats,
      timestamp: new Date().toISOString(),
    })

    return stats
  } catch (error: any) {
    logger.error('💥 [SCHEDULED PAYMENT] Fatal error', {
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

/**
 * Create authorization for deferred auth bookings (7 days before lesson)
 */
async function createDeferredAuthorization(bookingId: string, booking: any): Promise<void> {
  const bookingRef = db.collection('bookings').doc(bookingId)

  logger.info('🔐 [AUTH CREATE] Creating deferred authorization', {
    bookingId,
    savedPaymentMethodId: booking.savedPaymentMethodId,
  })

  if (!booking.savedPaymentMethodId) {
    throw new Error('No saved payment method for deferred authorization')
  }

  // Get payer
  let payerId = booking.studentId
  const studentDoc = await db.collection('users').doc(booking.studentId).get()
  if (studentDoc.data()?.parentId) {
    payerId = studentDoc.data()!.parentId
  }

  const payerDoc = await db.collection('users').doc(payerId).get()
  const payer = payerDoc.data()

  if (!payer?.stripeCustomerId) {
    throw new Error('No Stripe customer ID for payer')
  }

  // Create Payment Intent with manual capture
  const paymentIntent = await stripe.paymentIntents.create({
    amount: booking.price,
    currency: 'gbp',
    customer: payer.stripeCustomerId,
    payment_method: booking.savedPaymentMethodId,
    capture_method: 'manual',
    off_session: true,
    confirm: true, // Confirm immediately to create authorization
    metadata: {
      bookingId,
      studentId: booking.studentId,
      tutorId: booking.tutorId,
      authorizationType: 'deferred_auth',
    },
  })

  const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))

  // Update booking
  await bookingRef.update({
    paymentIntentId: paymentIntent.id,
    paymentIntentCreatedAt: FieldValue.serverTimestamp(),
    authorizationExpiresAt: expiresAt,
    requiresAuthCreation: false, // Mark as done
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info('✅ [AUTH CREATE] Authorization created successfully', {
    bookingId,
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
  })
}

/**
 * Capture existing authorization (24h before lesson)
 */
async function captureAuthorization(bookingId: string, booking: any): Promise<void> {
  const bookingRef = db.collection('bookings').doc(bookingId)

  logger.info('💰 [CAPTURE] Capturing payment authorization', {
    bookingId,
    paymentIntentId: booking.paymentIntentId,
  })

  if (!booking.paymentIntentId) {
    throw new Error('No payment intent ID found for capture')
  }

  // Mark as attempted to prevent duplicate processing
  await bookingRef.update({
    paymentAttempted: true,
    paymentAttemptedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  try {
    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(booking.paymentIntentId)

    logger.info('✅ [CAPTURE] Payment captured successfully', {
      bookingId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    })

    // If capture succeeded, confirm booking
    if (paymentIntent.status === 'succeeded') {
      await paymentService.confirmPayment(bookingId, paymentIntent.id)

      logger.info('🎉 [CAPTURE] Booking confirmed after payment capture', {
        bookingId,
        paymentIntentId: paymentIntent.id,
      })
    }
  } catch (error: any) {
    // Capture failed
    const errorMessage = error.message || 'Unknown capture error'

    await bookingRef.update({
      paymentError: errorMessage,
      paymentRetryCount: FieldValue.increment(1),
      lastPaymentRetryAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    logger.error('❌ [CAPTURE] Payment capture failed', {
      bookingId,
      error: errorMessage,
      paymentIntentId: booking.paymentIntentId,
    })

    // Notify parent
    await notificationService.sendPaymentFailureNotification(bookingId, errorMessage)

    throw error
  }
}

/**
 * Process immediate charge for bookings <24h away (existing flow)
 */
async function processImmediateCharge(bookingId: string, booking: any): Promise<void> {
  const bookingRef = db.collection('bookings').doc(bookingId)

  logger.info('💳 [IMMEDIATE CHARGE] Processing payment for booking', {
    bookingId,
    studentId: booking.studentId,
    price: booking.price,
  })

  // Mark as attempted immediately to prevent duplicate processing
  await bookingRef.update({
    paymentAttempted: true,
    paymentAttemptedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  try {
    // Get student/parent user for Stripe customer ID
    const studentDoc = await db.collection('users').doc(booking.studentId).get()
    const student = studentDoc.data()

    // If student has parent, charge parent's card instead
    let payerUserId = booking.studentId
    if (student?.parentId) {
      payerUserId = student.parentId
    }

    const payerDoc = await db.collection('users').doc(payerUserId).get()
    const payer = payerDoc.data()

    if (!payer?.stripeCustomerId) {
      throw new Error('No Stripe customer ID found for payer')
    }

    // Get payment methods for customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: payer.stripeCustomerId,
      type: 'card',
    })

    if (paymentMethods.data.length === 0) {
      throw new Error('No payment method on file')
    }

    // Use the default payment method (first one)
    const paymentMethodId = paymentMethods.data[0].id

    // Create payment intent with off_session: true
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.price,
      currency: 'gbp',
      customer: payer.stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,  // CRITICAL: Allows charging without user present
      confirm: true,      // Auto-confirm the payment
      metadata: {
        bookingId,
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        scheduledPayment: 'true',
      },
    })

    logger.info('✅ [IMMEDIATE CHARGE] Payment intent created and confirmed', {
      bookingId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    })

    // If payment succeeded immediately, confirm booking
    if (paymentIntent.status === 'succeeded') {
      await paymentService.confirmPayment(bookingId, paymentIntent.id)

      logger.info('🎉 [IMMEDIATE CHARGE] Booking confirmed after successful payment', {
        bookingId,
        paymentIntentId: paymentIntent.id,
      })
    } else {
      // Payment requires additional action (3D Secure, etc.)
      await bookingRef.update({
        paymentIntentId: paymentIntent.id,
        paymentError: 'Payment requires additional authentication',
        updatedAt: FieldValue.serverTimestamp(),
      })

      logger.warn('⚠️ [IMMEDIATE CHARGE] Payment requires action', {
        bookingId,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      })

      await notificationService.sendPaymentFailureNotification(
        bookingId,
        'Payment requires additional authentication'
      )
    }
  } catch (error: any) {
    // Payment failed - log error and notify parent
    const errorMessage = error.message || 'Unknown payment error'

    await bookingRef.update({
      paymentError: errorMessage,
      paymentRetryCount: FieldValue.increment(1),
      lastPaymentRetryAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    logger.error('❌ [IMMEDIATE CHARGE] Payment failed for booking', {
      bookingId,
      error: errorMessage,
      studentId: booking.studentId,
      price: booking.price,
    })

    // Send failure notification to parent
    try {
      await notificationService.sendPaymentFailureNotification(bookingId, errorMessage)
    } catch (notifError: any) {
      logger.error('Failed to send payment failure notification', {
        bookingId,
        error: notifError.message,
      })
    }

    throw error
  }
}

/**
 * Retry failed payments (called separately or by cron)
 * Only retries bookings that haven't exceeded max retries (3)
 */
export const retryFailedPayments = async (): Promise<{
  retried: number
  successful: number
  failed: number
}> => {
  const now = new Date()
  const maxRetries = 3
  const stats = {
    retried: 0,
    successful: 0,
    failed: 0,
  }

  logger.info('🔄 [RETRY PAYMENT] Starting retry of failed payments')

  // Query bookings with payment errors and retry count < 3
  const snapshot = await db
    .collection('bookings')
    .where('status', '==', 'accepted')
    .where('isPaid', '==', false)
    .where('paymentAttempted', '==', true)
    .where('paymentError', '!=', null)
    .limit(20)
    .get()

  for (const doc of snapshot.docs) {
    const booking = doc.data()
    const retryCount = booking.paymentRetryCount || 0

    if (retryCount >= maxRetries) {
      logger.warn('⚠️ [RETRY PAYMENT] Max retries exceeded', {
        bookingId: doc.id,
        retryCount,
      })
      continue
    }

    // Wait at least 1 hour between retries
    const lastRetry = booking.lastPaymentRetryAt?.toDate?.() || new Date(0)
    const hoursSinceLastRetry = (now.getTime() - lastRetry.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLastRetry < 1) {
      logger.info('⏳ [RETRY PAYMENT] Too soon to retry', {
        bookingId: doc.id,
        hoursSinceLastRetry: hoursSinceLastRetry.toFixed(1),
      })
      continue
    }

    // Reset paymentAttempted to allow retry
    await doc.ref.update({
      paymentAttempted: false,
      updatedAt: FieldValue.serverTimestamp(),
    })

    stats.retried++

    logger.info('🔄 [RETRY PAYMENT] Queued booking for retry', {
      bookingId: doc.id,
      retryCount,
    })
  }

  logger.info('✅ [RETRY PAYMENT] Completed retry processing', stats)

  return stats
}
