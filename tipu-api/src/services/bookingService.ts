import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { Booking, CreateBookingInput, AcceptBookingInput, DeclineBookingInput, SubmitLessonReportInput } from '../types/booking'
import { ApiError } from '../middleware/errorHandler'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

/**
 * Create a new booking request
 */
export const createBooking = async (input: CreateBookingInput): Promise<Booking> => {
  const bookingRef = db.collection('bookings').doc()

  // Calculate time until lesson
  const scheduledAt = input.scheduledAt
  const now = new Date()
  const hoursUntilLesson = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  const daysUntilLesson = hoursUntilLesson / 24

  // Determine payment authorization type and schedule
  let paymentAuthType: 'immediate_auth' | 'deferred_auth' | 'immediate_charge'
  let paymentScheduledFor: Date | null
  let requiresAuthCreation = false

  if (hoursUntilLesson < 24) {
    // <24h: Charge immediately after tutor acceptance (existing immediate flow)
    paymentAuthType = 'immediate_charge'
    paymentScheduledFor = null
  } else if (daysUntilLesson < 7) {
    // <7 days: Authorize immediately at booking time, capture 24h before lesson
    paymentAuthType = 'immediate_auth'
    paymentScheduledFor = new Date(scheduledAt.getTime() - (24 * 60 * 60 * 1000))
  } else {
    // ≥7 days: Save card now, create authorization 7 days before, capture 24h before
    paymentAuthType = 'deferred_auth'
    paymentScheduledFor = new Date(scheduledAt.getTime() - (24 * 60 * 60 * 1000))
    requiresAuthCreation = true  // Flag for cron job to create auth at 7-day mark
  }

  const booking: Booking = {
    id: bookingRef.id,
    studentId: input.studentId,
    tutorId: input.tutorId,
    subject: input.subject,
    level: input.level,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),  // Convert Date to Timestamp
    duration: input.duration || 60,
    status: 'pending',
    price: input.price,
    isPaid: false,

    // Payment authorization tracking
    paymentAuthType,
    ...(paymentScheduledFor && { paymentScheduledFor: Timestamp.fromDate(paymentScheduledFor) }),  // Only include if exists
    requiresAuthCreation,
    paymentAttempted: false,
    paymentRetryCount: 0,

    createdAt: FieldValue.serverTimestamp() as any,  // Only use serverTimestamp for record metadata
    updatedAt: FieldValue.serverTimestamp() as any,
  }

  // Save to Firestore
  await bookingRef.set(booking)

  logger.info(`Booking created with ${paymentAuthType} payment flow`, {
    bookingId: bookingRef.id,
    studentId: input.studentId,
    tutorId: input.tutorId,
    scheduledAt: input.scheduledAt.toISOString(),
    hoursUntilLesson: hoursUntilLesson.toFixed(1),
    daysUntilLesson: daysUntilLesson.toFixed(1),
    paymentAuthType,
    paymentScheduledFor: paymentScheduledFor?.toISOString() || 'null',
  })

  return {
    ...booking,
    scheduledAt: input.scheduledAt as any,
    paymentScheduledFor: paymentScheduledFor as any,
  }
}

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId: string): Promise<Booking> => {
  const bookingDoc = await db.collection('bookings').doc(bookingId).get()

  if (!bookingDoc.exists) {
    throw new ApiError('Booking not found', 404)
  }

  return bookingDoc.data() as Booking
}

/**
 * Get bookings for a user (student, tutor, or parent)
 */
export const getUserBookings = async (
  userId: string,
  role: 'student' | 'tutor' | 'parent'
): Promise<Booking[]> => {
  // Handle parent role - fetch bookings for all children
  if (role === 'parent') {
    // Fetch parent user to get childrenIds
    const userDoc = await db.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      throw new ApiError('User not found', 404)
    }

    const userData = userDoc.data()
    const childrenIds = userData?.childrenIds || []

    // If no children, return empty array
    if (childrenIds.length === 0) {
      logger.info(`Parent ${userId} has no children, returning empty bookings`)
      return []
    }

    // Query bookings for all children
    // Note: Firestore 'in' query supports max 10 values
    const snapshot = await db
      .collection('bookings')
      .where('studentId', 'in', childrenIds)
      .orderBy('scheduledAt', 'desc')
      .get()

    logger.info(`Fetched ${snapshot.size} bookings for parent ${userId} (${childrenIds.length} children)`)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as Booking))
  }

  // Handle student and tutor roles
  const field = role === 'student' ? 'studentId' : 'tutorId'
  const snapshot = await db
    .collection('bookings')
    .where(field, '==', userId)
    .orderBy('scheduledAt', 'desc')
    .get()

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  } as Booking))
}

/**
 * Accept a booking request
 * Sets status to 'accepted' - student must complete payment to confirm
 * Meeting link will be added after payment via Teams integration
 */
export const acceptBooking = async (input: AcceptBookingInput): Promise<void> => {
  const bookingRef = db.collection('bookings').doc(input.bookingId)
  const booking = await bookingRef.get()

  if (!booking.exists) {
    throw new ApiError('Booking not found', 404)
  }

  const bookingData = booking.data() as Booking

  if (bookingData.tutorId !== input.tutorId) {
    throw new ApiError('Unauthorized', 403)
  }

  if (bookingData.status !== 'pending') {
    throw new ApiError('Booking is not in pending status', 400)
  }

  await bookingRef.update({
    status: 'accepted',
    // No meetingLink yet - will be added after payment
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info('Booking accepted (awaiting payment)', {
    bookingId: input.bookingId,
    tutorId: input.tutorId,
  })
}

/**
 * Decline a booking request
 */
export const declineBooking = async (input: DeclineBookingInput): Promise<void> => {
  const bookingRef = db.collection('bookings').doc(input.bookingId)
  const booking = await bookingRef.get()

  if (!booking.exists) {
    throw new ApiError('Booking not found', 404)
  }

  const bookingData = booking.data() as Booking

  if (bookingData.tutorId !== input.tutorId) {
    throw new ApiError('Unauthorized', 403)
  }

  if (bookingData.status !== 'pending') {
    throw new ApiError('Booking is not in pending status', 400)
  }

  await bookingRef.update({
    status: 'declined',
    declineReason: input.reason,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`Booking declined: ${input.bookingId}`, {
    tutorId: input.tutorId,
    reason: input.reason,
  })
}

/**
 * Submit lesson report
 * Only the assigned tutor can submit a lesson report
 */
export const submitLessonReport = async (
  input: SubmitLessonReportInput
): Promise<void> => {
  const bookingRef = db.collection('bookings').doc(input.bookingId)
  const bookingDoc = await bookingRef.get()

  if (!bookingDoc.exists) {
    throw new ApiError('Booking not found', 404)
  }

  const booking = bookingDoc.data() as Booking

  // Authorization check: Only the assigned tutor can submit lesson report
  if (booking.tutorId !== input.tutorId) {
    throw new ApiError('Only the assigned tutor can submit a lesson report', 403)
  }

  // Can only submit report for confirmed bookings
  if (booking.status !== 'confirmed') {
    throw new ApiError('Cannot submit report for unconfirmed booking', 400)
  }

  await bookingRef.update({
    lessonReport: {
      topicsCovered: input.topicsCovered,
      homework: input.homework,
      notes: input.notes,
      completedAt: FieldValue.serverTimestamp(),
    },
    status: 'completed',
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`Lesson report submitted: ${input.bookingId} by tutor: ${input.tutorId}`)
}

/**
 * Get all bookings (admin only)
 */
export const getAllBookings = async (): Promise<Booking[]> => {
  const snapshot = await db
    .collection('bookings')
    .orderBy('scheduledAt', 'desc')
    .get()

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  } as Booking))
}
