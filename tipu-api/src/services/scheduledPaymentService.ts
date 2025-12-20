import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { stripe } from '../config/stripe'
import { FieldValue } from 'firebase-admin/firestore'
import * as paymentService from './paymentService'
import * as notificationService from './notificationService'

/**
 * Process scheduled payments for bookings due in the next 24 hours
 * Called by cron job every 15 minutes
 */
export const processScheduledPayments = async (): Promise<{
  processed: number
  successful: number
  failed: number
  errors: Array<{ bookingId: string; error: string }>
}> => {
  const now = new Date()
  const stats = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ bookingId: string; error: string }>,
  }

  logger.info('🕐 [SCHEDULED PAYMENT] Starting scheduled payment processing', {
    timestamp: now.toISOString(),
  })

  try {
    // Query bookings where:
    // 1. Payment scheduled time has passed (paymentScheduledFor <= now)
    // 2. Payment not yet attempted (paymentAttempted = false)
    // 3. Status is 'accepted' (tutor accepted, awaiting payment)
    // 4. Not already paid (isPaid = false)
    const snapshot = await db
      .collection('bookings')
      .where('status', '==', 'accepted')
      .where('isPaid', '==', false)
      .where('paymentScheduledFor', '<=', now)
      .where('paymentAttempted', '==', false)
      .limit(50)  // Process max 50 per run to avoid timeouts
      .get()

    logger.info(`📋 [SCHEDULED PAYMENT] Found ${snapshot.size} bookings to process`)

    // Process each booking
    for (const doc of snapshot.docs) {
      const booking = doc.data()
      const bookingId = doc.id

      stats.processed++

      try {
        await processBookingPayment(bookingId, booking)
        stats.successful++
      } catch (error: any) {
        stats.failed++
        stats.errors.push({
          bookingId,
          error: error.message,
        })

        logger.error('❌ [SCHEDULED PAYMENT] Failed to process booking payment', {
          bookingId,
          error: error.message,
          stack: error.stack,
        })
      }
    }

    logger.info('✅ [SCHEDULED PAYMENT] Completed scheduled payment processing', {
      ...stats,
      timestamp: new Date().toISOString(),
    })

    return stats
  } catch (error: any) {
    logger.error('💥 [SCHEDULED PAYMENT] Fatal error in processScheduledPayments', {
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

/**
 * Process payment for a single booking
 */
async function processBookingPayment(bookingId: string, booking: any): Promise<void> {
  const bookingRef = db.collection('bookings').doc(bookingId)

  logger.info('💳 [SCHEDULED PAYMENT] Processing payment for booking', {
    bookingId,
    studentId: booking.studentId,
    price: booking.price,
    scheduledAt: booking.scheduledAt?.toDate?.()?.toISOString(),
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

    logger.info('✅ [SCHEDULED PAYMENT] Payment intent created and confirmed', {
      bookingId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    })

    // If payment succeeded immediately, confirm booking
    if (paymentIntent.status === 'succeeded') {
      await paymentService.confirmPayment(bookingId, paymentIntent.id)

      logger.info('🎉 [SCHEDULED PAYMENT] Booking confirmed after successful payment', {
        bookingId,
        paymentIntentId: paymentIntent.id,
      })
    } else {
      // Payment requires additional action (3D Secure, etc.)
      // Store payment intent for later confirmation
      await bookingRef.update({
        paymentIntentId: paymentIntent.id,
        paymentError: 'Payment requires additional authentication',
        updatedAt: FieldValue.serverTimestamp(),
      })

      logger.warn('⚠️ [SCHEDULED PAYMENT] Payment requires action', {
        bookingId,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      })

      // Send notification to parent to complete payment
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

    logger.error('❌ [SCHEDULED PAYMENT] Payment failed for booking', {
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
      // Don't fail the whole process if notification fails
    }

    throw error  // Re-throw to be caught by caller
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
