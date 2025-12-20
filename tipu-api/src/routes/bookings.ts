import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as bookingService from '../services/bookingService'
import * as paymentService from '../services/paymentService'
import * as teamsService from '../services/teamsService'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { ApiError } from '../middleware/errorHandler'
import { logger } from '../config/logger'
import { z } from 'zod'
import { createBookingSchema, lessonReportSchema, acceptBookingSchema, declineBookingSchema } from '../schemas/booking.schema'
import { calculateAge } from '../utils/ageCheck'
import { stripe } from '../config/stripe'

const router = Router()

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Validate input
    const validatedInput = createBookingSchema.parse(req.body)

    const user = req.user!
    let studentId = user.uid // Default to current user

    // ✅ CHECK AGE FOR STUDENT BOOKINGS
    if (user.role === 'student') {
      const userDoc = await db.collection('users').doc(user.uid).get()
      const userData = userDoc.data()

      if (userData?.dateOfBirth) {
        const age = calculateAge(userData.dateOfBirth.toDate())

        if (age < 18) {
          return res.status(403).json({
            error: 'Students under 18 cannot book lessons directly',
            code: 'PARENT_BOOKING_REQUIRED',
            message: 'Please ask your parent to book lessons for you',
          })
        }
      }
    }

    // If parent role and studentId provided in request, validate and use it
    if (user.role === 'parent' && validatedInput.studentId) {
      // Fetch parent's children to validate
      const userDoc = await db.collection('users').doc(user.uid).get()
      const childrenIds = userDoc.data()?.childrenIds || []

      if (!childrenIds.includes(validatedInput.studentId)) {
        throw new ApiError('You can only create bookings for your registered children', 403)
      }

      studentId = validatedInput.studentId
    }
    // If student role, always use their own ID (ignore any provided studentId)
    // This prevents students from creating bookings for other students

    const booking = await bookingService.createBooking({
      studentId,
      tutorId: validatedInput.tutorId,
      subject: validatedInput.subject,
      level: validatedInput.level,
      scheduledAt: new Date(validatedInput.scheduledAt),
      price: validatedInput.price,
      duration: validatedInput.duration,
    })

    res.status(201).json(booking)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }
    next(error)
  }
})

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const role = req.user!.role || 'student'
    console.log('GET /bookings - User:', req.user!.uid, 'Role:', role, 'Status filter:', req.query.status)

    let bookings = await bookingService.getUserBookings(req.user!.uid, role as any)
    console.log('Bookings retrieved from DB:', bookings.length)

    // Filter by status if provided
    const statusFilter = req.query.status as string | undefined
    if (statusFilter) {
      const beforeCount = bookings.length
      bookings = bookings.filter(b => b.status === statusFilter)
      console.log('Bookings after status filter:', bookings.length, '(filtered from', beforeCount, ')')
    }

    res.json({ bookings })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id)
    res.json(booking)
  } catch (error) {
    next(error)
  }
})

router.post('/:id/accept', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await bookingService.acceptBooking({
      bookingId: req.params.id,
      tutorId: req.user!.uid,
      // No meetingLink - will be added after payment via Teams integration
    })

    res.json({ message: 'Booking accepted successfully' })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/decline', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Validate input
    const validatedInput = declineBookingSchema.parse(req.body)

    await bookingService.declineBooking({
      bookingId: req.params.id,
      tutorId: req.user!.uid,
      reason: validatedInput.reason,
    })

    res.json({ message: 'Booking declined' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }
    next(error)
  }
})

router.post('/:id/approve-suggestion', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const parentId = req.user!.uid
    const bookingId = req.params.id

    if (req.user!.role !== 'parent') {
      throw new ApiError('Only parents can approve lesson suggestions', 403)
    }

    const bookingDoc = await db.collection('bookings').doc(bookingId).get()

    if (!bookingDoc.exists) {
      throw new ApiError('Booking not found', 404)
    }

    const booking = bookingDoc.data()

    // Verify parent owns the student
    const studentDoc = await db.collection('users').doc(booking?.studentId).get()
    const student = studentDoc.data()

    if (student?.parentId !== parentId) {
      throw new ApiError('Not authorized to approve this booking', 403)
    }

    if (booking?.status !== 'tutor-suggested') {
      throw new ApiError('Booking is not awaiting approval', 400)
    }

    // Update to pending (awaiting payment)
    await db.collection('bookings').doc(bookingId).update({
      status: 'pending',
      approvedBy: parentId,
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.json({ message: 'Lesson approved, proceed to payment' })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/decline-suggestion', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const parentId = req.user!.uid
    const bookingId = req.params.id
    const { reason } = req.body

    if (req.user!.role !== 'parent') {
      throw new ApiError('Only parents can decline lesson suggestions', 403)
    }

    const bookingDoc = await db.collection('bookings').doc(bookingId).get()

    if (!bookingDoc.exists) {
      throw new ApiError('Booking not found', 404)
    }

    const booking = bookingDoc.data()

    // Verify parent owns the student
    const studentDoc = await db.collection('users').doc(booking?.studentId).get()
    const student = studentDoc.data()

    if (student?.parentId !== parentId) {
      throw new ApiError('Not authorized to decline this booking', 403)
    }

    if (booking?.status !== 'tutor-suggested') {
      throw new ApiError('Booking is not awaiting approval', 400)
    }

    // Update to declined
    await db.collection('bookings').doc(bookingId).update({
      status: 'declined',
      declineReason: reason || 'Declined by parent',
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.json({ message: 'Lesson suggestion declined' })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/lesson-report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Validate input
    const validatedInput = lessonReportSchema.parse(req.body)

    await bookingService.submitLessonReport({
      bookingId: req.params.id,
      tutorId: req.user!.uid,  // Pass authenticated user's ID for authorization
      topicsCovered: validatedInput.topicsCovered,
      homework: validatedInput.homework,
      notes: validatedInput.notes,
    })

    res.json({ message: 'Lesson report submitted successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }
    next(error)
  }
})

/**
 * PATCH /api/v1/bookings/:id/confirm-payment
 * Confirm payment and update booking status
 * Called by frontend after successful Stripe payment
 * This will also automatically generate Teams meeting link
 */
router.patch('/:id/confirm-payment', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const bookingId = req.params.id
    const paymentIntentId = req.body.paymentIntentId || 'frontend-confirmation'
    const userId = req.user!.uid
    const userRole = req.user!.role

    logger.info('📨 [ENDPOINT DEBUG] /confirm-payment endpoint called', {
      bookingId,
      paymentIntentId,
      userId,
      userRole,
      requestBody: JSON.stringify(req.body),
      timestamp: new Date().toISOString(),
    })

    logger.info('🔄 [ENDPOINT DEBUG] Calling paymentService.confirmPayment', {
      bookingId,
      paymentIntentId,
    })

    // Use paymentService to confirm payment
    // This will update booking status AND generate Teams meeting automatically
    await paymentService.confirmPayment(bookingId, paymentIntentId)

    logger.info('✅ [ENDPOINT DEBUG] Payment confirmation successful', {
      bookingId,
      paymentIntentId,
    })

    res.json({ message: 'Booking confirmed successfully' })
  } catch (error: any) {
    logger.error('❌ [ENDPOINT DEBUG] /confirm-payment endpoint error', {
      bookingId: req.params.id,
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack,
      },
    })
    next(error)
  }
})

/**
 * POST /api/v1/bookings/:id/generate-meeting
 * Manually generate Teams meeting link for a booking
 * Used when automatic generation fails or for bookings paid before Teams integration
 */
router.post('/:id/generate-meeting', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const bookingId = req.params.id
    const userId = req.user!.uid
    const userRole = req.user!.role

    logger.info('📨 [ENDPOINT DEBUG] /generate-meeting endpoint called', {
      bookingId,
      userId,
      userRole,
      timestamp: new Date().toISOString(),
    })

    // Get booking to verify permissions
    logger.info('🔍 [ENDPOINT DEBUG] Fetching booking for permission check', {
      bookingId,
    })

    const bookingDoc = await db.collection('bookings').doc(bookingId).get()

    if (!bookingDoc.exists) {
      logger.warn('⚠️ [ENDPOINT DEBUG] Booking not found', { bookingId })
      res.status(404).json({ error: 'Booking not found' })
      return
    }

    const booking = bookingDoc.data()

    logger.info('✅ [ENDPOINT DEBUG] Booking retrieved', {
      bookingId,
      studentId: booking?.studentId,
      tutorId: booking?.tutorId,
      status: booking?.status,
      isPaid: booking?.isPaid,
      hasMeetingLink: !!booking?.meetingLink,
    })

    // Verify user is either student, tutor, admin, or parent of student
    const isStudent = booking?.studentId === userId
    const isTutor = booking?.tutorId === userId
    const isAdmin = userRole === 'admin'

    // Check if user is the parent of the student
    let isParent = false
    if (userRole === 'parent' && booking?.studentId) {
      const studentDoc = await db.collection('users').doc(booking.studentId).get()
      const student = studentDoc.data()
      isParent = student?.parentId === userId

      logger.info('👨‍👩‍👧 [ENDPOINT DEBUG] Parent check', {
        userRole,
        studentId: booking.studentId,
        studentParentId: student?.parentId,
        isParent,
      })
    }

    logger.info('🔐 [ENDPOINT DEBUG] Permission check', {
      isStudent,
      isTutor,
      isAdmin,
      isParent,
      allowed: isStudent || isTutor || isAdmin || isParent,
    })

    if (!isStudent && !isTutor && !isAdmin && !isParent) {
      logger.warn('⚠️ [ENDPOINT DEBUG] Unauthorized access attempt', {
        userId,
        userRole,
        bookingId,
      })
      res.status(403).json({ error: 'Unauthorized' })
      return
    }

    // Verify booking is confirmed (paid)
    if (booking?.status !== 'confirmed') {
      logger.warn('⚠️ [ENDPOINT DEBUG] Booking not confirmed', {
        bookingId,
        status: booking?.status,
        isPaid: booking?.isPaid,
      })
      res.status(400).json({
        error: 'Booking must be confirmed (paid) before generating meeting link',
      })
      return
    }

    // Generate Teams meeting
    logger.info('🚀 [ENDPOINT DEBUG] Calling teamsService.generateMeetingForBooking', {
      bookingId,
    })

    const meetingResult = await teamsService.generateMeetingForBooking(bookingId)

    logger.info('🎉 [ENDPOINT DEBUG] Meeting generated successfully', {
      bookingId,
      meetingId: meetingResult.meetingId,
      joinUrl: meetingResult.joinUrl,
    })

    res.json({
      message: 'Teams meeting generated successfully',
      meetingLink: meetingResult.joinUrl,
      meetingId: meetingResult.meetingId,
    })
  } catch (error: any) {
    logger.error('❌ [ENDPOINT DEBUG] /generate-meeting endpoint error', {
      bookingId: req.params.id,
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack,
      },
    })
    next(error)
  }
})

/**
 * POST /api/v1/bookings/:id/reschedule
 * Reschedule a booking to a new time
 * Authorized: tutor, student (18+), parent of student, or admin
 */
router.post('/:id/reschedule', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.uid
    const userRole = req.user!.role
    const bookingId = req.params.id
    const { newScheduledAt } = req.body

    if (!newScheduledAt) {
      throw new ApiError('New scheduled date/time is required', 400)
    }

    const bookingDoc = await db.collection('bookings').doc(bookingId).get()

    if (!bookingDoc.exists) {
      throw new ApiError('Booking not found', 404)
    }

    const booking = bookingDoc.data()

    // Check authorization
    let isAuthorized = false

    if (userRole === 'admin') {
      isAuthorized = true
    } else if (userRole === 'tutor' && booking?.tutorId === userId) {
      isAuthorized = true
    } else if (userRole === 'student' && booking?.studentId === userId) {
      // Check if student is 18+
      const studentDoc = await db.collection('users').doc(userId).get()
      const studentData = studentDoc.data()
      if (studentData?.dateOfBirth) {
        const age = calculateAge(studentData.dateOfBirth.toDate())
        isAuthorized = age >= 18
      }
    } else if (userRole === 'parent') {
      // Check if parent owns the student
      const studentDoc = await db.collection('users').doc(booking?.studentId).get()
      const student = studentDoc.data()
      isAuthorized = student?.parentId === userId
    }

    if (!isAuthorized) {
      throw new ApiError('Not authorized to reschedule this booking', 403)
    }

    // Can't reschedule completed or cancelled bookings
    if (['completed', 'cancelled'].includes(booking?.status || '')) {
      throw new ApiError('Cannot reschedule completed or cancelled bookings', 400)
    }

    // Recalculate payment scheduled time if not yet paid
    const newScheduledDate = new Date(newScheduledAt)
    const now = new Date()
    const hoursUntilLesson = (newScheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    const paymentScheduledFor = hoursUntilLesson < 24
      ? null
      : new Date(newScheduledDate.getTime() - (24 * 60 * 60 * 1000))

    // Update booking
    const updateData: any = {
      scheduledAt: new Date(newScheduledAt),
      rescheduledBy: userId,
      rescheduledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Reset payment attempt if not yet paid (allows payment to be retried at new scheduled time)
    if (!booking?.isPaid) {
      updateData.paymentScheduledFor = paymentScheduledFor
      updateData.paymentAttempted = false
      updateData.paymentError = null
      updateData.paymentRetryCount = 0

      logger.info('Recalculated payment schedule for rescheduled booking', {
        bookingId,
        newScheduledAt,
        paymentScheduledFor: paymentScheduledFor?.toISOString() || 'immediate',
        hoursUntilLesson: hoursUntilLesson.toFixed(1),
      })
    }

    await db.collection('bookings').doc(bookingId).update(updateData)

    // If booking is confirmed (has meeting link), regenerate it for the new time
    if (booking?.status === 'confirmed' && booking?.meetingLink) {
      try {
        logger.info('Regenerating Teams meeting link for rescheduled booking', {
          bookingId,
          oldScheduledAt: booking.scheduledAt?.toDate?.()?.toISOString(),
          newScheduledAt,
        })

        // This will create a new meeting and update the booking with the new link
        await teamsService.generateMeetingForBooking(bookingId)

        logger.info('Successfully regenerated meeting link for rescheduled booking', {
          bookingId,
        })
      } catch (error: any) {
        // Don't fail the reschedule if meeting generation fails
        // Just log the error and continue
        logger.error('Failed to regenerate meeting link for rescheduled booking', {
          bookingId,
          error: error.message,
        })
      }
    }

    res.json({ message: 'Booking rescheduled successfully' })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/v1/bookings/:id/cancel
 * Cancel a booking (with refund if paid)
 * Authorized: tutor, student (18+), parent of student, or admin
 */
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.uid
    const userRole = req.user!.role
    const bookingId = req.params.id
    const { reason } = req.body

    const bookingDoc = await db.collection('bookings').doc(bookingId).get()

    if (!bookingDoc.exists) {
      throw new ApiError('Booking not found', 404)
    }

    const booking = bookingDoc.data()

    // Check authorization
    let isAuthorized = false

    if (userRole === 'admin') {
      isAuthorized = true
    } else if (userRole === 'tutor' && booking?.tutorId === userId) {
      isAuthorized = true
    } else if (userRole === 'student' && booking?.studentId === userId) {
      // Check if student is 18+
      const studentDoc = await db.collection('users').doc(userId).get()
      const studentData = studentDoc.data()
      if (studentData?.dateOfBirth) {
        const age = calculateAge(studentData.dateOfBirth.toDate())
        isAuthorized = age >= 18
      }
    } else if (userRole === 'parent') {
      // Check if parent owns the student
      const studentDoc = await db.collection('users').doc(booking?.studentId).get()
      const student = studentDoc.data()
      isAuthorized = student?.parentId === userId
    }

    if (!isAuthorized) {
      throw new ApiError('Not authorized to cancel this booking', 403)
    }

    // Calculate hours until lesson
    const scheduledAt = booking?.scheduledAt?.toDate?.() || new Date()
    const hoursUntilLesson = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60)

    // Check if user is parent or student
    const isParentOrStudent = userRole === 'parent' || userRole === 'student'

    // Enforce 24-hour cancellation window for parents/students
    if (isParentOrStudent && hoursUntilLesson < 24 && hoursUntilLesson > 0) {
      throw new ApiError(
        `Cannot cancel within 24 hours of lesson. Only ${hoursUntilLesson.toFixed(1)} hours remaining. Please contact your tutor directly.`,
        403
      )
    }

    // Require cancellation reason from tutors
    if (userRole === 'tutor' && (!reason || reason.trim().length < 10)) {
      throw new ApiError('Tutors must provide a cancellation reason (minimum 10 characters)', 400)
    }

    // Can't cancel completed bookings
    if (booking?.status === 'completed') {
      throw new ApiError('Cannot cancel completed bookings', 400)
    }

    // Already cancelled
    if (booking?.status === 'cancelled') {
      throw new ApiError('Booking is already cancelled', 400)
    }

    // Process refund if paid
    let refundId = null
    if (booking?.isPaid && booking?.paymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.paymentIntentId,
          reason: 'requested_by_customer',
        })
        refundId = refund.id

        logger.info('Refund processed for cancelled booking', {
          bookingId,
          paymentIntentId: booking.paymentIntentId,
          refundId,
        })
      } catch (error: any) {
        logger.error('Failed to process refund for booking', {
          bookingId,
          error: error.message,
        })
        throw new ApiError('Failed to process refund. Please contact support.', 500)
      }
    }

    // Update booking
    await db.collection('bookings').doc(bookingId).update({
      status: 'cancelled',
      cancelledBy: userId,
      cancelledAt: FieldValue.serverTimestamp(),
      cancellationReason: reason || 'No reason provided',
      refundId,
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.json({
      message: 'Booking cancelled successfully',
      refunded: !!refundId,
    })
  } catch (error) {
    next(error)
  }
})

export default router
