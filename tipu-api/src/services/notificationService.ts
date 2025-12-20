import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { FieldValue } from 'firebase-admin/firestore'
// import * as emailService from './emailService'  // TODO: Implement email service

/**
 * Send payment failure notification to parent/student
 */
export const sendPaymentFailureNotification = async (
  bookingId: string,
  error: string
): Promise<void> => {
  logger.info('📧 [NOTIFICATION] Sending payment failure notification', {
    bookingId,
    error,
  })

  const bookingDoc = await db.collection('bookings').doc(bookingId).get()
  const booking = bookingDoc.data()

  if (!booking) {
    logger.error('Booking not found for notification', { bookingId })
    return
  }

  // Get student and parent/payer info
  const studentDoc = await db.collection('users').doc(booking.studentId).get()
  const student = studentDoc.data()

  let payerUserId = booking.studentId
  if (student?.parentId) {
    payerUserId = student.parentId
  }

  const payerDoc = await db.collection('users').doc(payerUserId).get()
  const payer = payerDoc.data()

  if (!payer) {
    logger.error('Payer not found for notification', { payerUserId })
    return
  }

  // 1. IN-APP NOTIFICATION: Store in booking
  await db.collection('bookings').doc(bookingId).update({
    paymentFailureNotificationSent: true,
    paymentFailureNotification: {
      message: `Payment failed: ${error}. Please update your payment method.`,
      sentAt: FieldValue.serverTimestamp(),
      severity: 'error',
    },
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info('✅ [NOTIFICATION] In-app notification stored', { bookingId })

  // 2. EMAIL NOTIFICATION: Send email via SendGrid
  try {
    // TODO: Implement when emailService is ready
    // await emailService.sendPaymentFailureEmail({
    //   to: payer.email,
    //   bookingId,
    //   error,
    //   studentName: student?.displayName,
    //   scheduledAt: booking.scheduledAt?.toDate(),
    // })

    logger.info('✅ [NOTIFICATION] Email notification queued (email service not yet implemented)', {
      bookingId,
      recipientEmail: payer.email,
    })
  } catch (emailError: any) {
    logger.error('❌ [NOTIFICATION] Failed to send email', {
      bookingId,
      error: emailError.message,
    })
    // Don't throw - in-app notification already sent
  }
}

/**
 * Send payment due soon reminder (48 hours before)
 */
export const sendPaymentDueSoonReminder = async (bookingId: string): Promise<void> => {
  const bookingDoc = await db.collection('bookings').doc(bookingId).get()
  const booking = bookingDoc.data()

  if (!booking || booking.paymentReminderSent) {
    return  // Already sent or booking not found
  }

  // TODO: Implement email reminder
  // await emailService.sendPaymentDueSoonEmail(...)

  await db.collection('bookings').doc(bookingId).update({
    paymentReminderSent: true,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info('✅ [NOTIFICATION] Payment due soon reminder sent', { bookingId })
}
