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
import { createBookingSchema, lessonReportSchema,  declineBookingSchema, rescheduleBookingSchema } from '../schemas/booking.schema'
import { calculateAge } from '../utils/ageCheck'
import { stripe } from '../config/stripe'

const router = Router()

// Query parameter validation schema
const getBookingsQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'declined']).optional(),
})

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
        try {
          const birthDate = userData.dateOfBirth.toDate?.() || new Date(userData.dateOfBirth)
          const age = calculateAge(birthDate)

          if (isNaN(age) || age < 0) {
            return res.status(400).json({
              error: 'Invalid date of birth',
              code: 'INVALID_DATE_OF_BIRTH',
            })
          }

          if (age < 18) {
            return res.status(403).json({
              error: 'Students under 18 cannot book lessons directly',
              code: 'PARENT_BOOKING_REQUIRED',
              message: 'Please ask your parent to book lessons for you',
            })
          }
        } catch (error) {
          logger.error('Error calculating age:', error)
          return res.status(400).json({
            error: 'Invalid date of birth format',
            code: 'INVALID_DATE_OF_BIRTH',
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
    return next(error)
  }
})

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Validate query parameters (prevents NoSQL injection)
    const { status: statusFilter } = getBookingsQuerySchema.parse(req.query)

    const role = req.user!.role || 'student'
    console.log('GET /bookings - User:', req.user!.uid, 'Role:', role, 'Status filter:', statusFilter)

    let bookings = await bookingService.getUserBookings(req.user!.uid, role as any)
    console.log('Bookings retrieved from DB:', bookings.length)

    // Filter by status if provided
    if (statusFilter) {
      const beforeCount = bookings.length
      bookings = bookings.filter(b => b.status === statusFilter)
      console.log('Bookings after status filter:', bookings.length, '(filtered from', beforeCount, ')')
    }

    res.json({ bookings })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!
    const booking = await bookingService.getBookingById(req.params.id)

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Authorization check: user must be participant, parent, or admin
    const isParticipant =
      booking.studentId === user.uid ||
      booking.tutorId === user.uid

    let isParentOfStudent = false
    if (user.role === 'parent') {
      const { db } = await import('../config/firebase')
      const parentDoc = await db.collection('users').doc(user.uid).get()
      const parentData = parentDoc.data()
      isParentOfStudent = parentData?.childrenIds?.includes(booking.studentId) || false
    }

    const isAdmin = user.role === 'admin'

    if (!isParticipant && !isParentOfStudent && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    res.json(booking)
  } catch (error) {
    return next(error)
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
    return next(error)
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
    return next(error)
  }
})

router.post('/:id/approve-suggestion', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.uid
    const userRole = req.user!.role
    const bookingId = req.params.id

    const bookingDoc = await db.collection('bookings').doc(bookingId).get()

    if (!bookingDoc.exists) {
      throw new ApiError('Booking not found', 404)
    }

    const booking = bookingDoc.data()

    if (booking?.status !== 'tutor-suggested') {
      throw new ApiError('Booking is not awaiting approval', 400)
    }

    // Check who needs to approve based on requiresParentApproval field
    if (booking.requiresParentApproval) {
      // Student under 18 - parent must approve
      if (userRole !== 'parent' && userRole !== 'admin') {
        throw new ApiError('Only parents can approve lesson suggestions for students under 18', 403)
      }

      if (userRole === 'parent') {
        // Verify parent owns the student
        const studentDoc = await db.collection('users').doc(booking?.studentId).get()
        const student = studentDoc.data()

        if (student?.parentId !== userId) {
          throw new ApiError('Not authorized to approve this booking', 403)
        }
      }
    } else {
      // Student 18+ - student must approve themselves
      if (userRole !== 'student' && userRole !== 'admin') {
        throw new ApiError('Only the student can approve this lesson suggestion', 403)
      }

      if (userRole === 'student' && userId !== booking?.studentId) {
        throw new ApiError('Not authorized to approve this booking', 403)
      }
    }

    // Calculate hours until lesson
    const scheduledDate = booking.scheduledAt.toDate
      ? booking.scheduledAt.toDate()
      : new Date(booking.scheduledAt)
    const now = new Date()
    const hoursUntilLesson = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Calculate payment schedule (24h before lesson, or immediate if less than 24h)
    const paymentScheduledFor = hoursUntilLesson < 24
      ? null  // Immediate payment
      : new Date(scheduledDate.getTime() - (24 * 60 * 60 * 1000))  // 24h before

    // Update to pending (awaiting payment) with payment schedule
    await db.collection('bookings').doc(bookingId).update({
      status: 'pending',
      approvedBy: userId,
      approvedAt: FieldValue.serverTimestamp(),
      paymentScheduledFor: paymentScheduledFor,  // Schedule deferred payment
      paymentAttempted: false,                   // Reset payment tracking
      paymentError: null,
      paymentRetryCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
    })

    logger.info('Tutor suggestion approved, payment scheduled', {
      bookingId,
      approvedBy: userId,
      approverRole: userRole,
      requiresParentApproval: booking.requiresParentApproval,
      scheduledAt: scheduledDate.toISOString(),
      paymentScheduledFor: paymentScheduledFor?.toISOString() || 'immediate',
      hoursUntilLesson: hoursUntilLesson.toFixed(1)
    })

    res.json({ message: 'Lesson approved, proceed to payment' })
  } catch (error) {
    return next(error)
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
    return next(error)
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
    return next(error)
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
    const { paymentIntentId } = req.body
    const userId = req.user!.uid
    const userRole = req.user!.role

    // Validate payment intent ID is provided
    if (!paymentIntentId) {
      logger.error('❌ /confirm-payment called without paymentIntentId', {
        bookingId,
        userId,
        userRole,
        requestBody: JSON.stringify(req.body),
      })
      return res.status(400).json({
        error: 'Payment intent ID is required',
        code: 'MISSING_PAYMENT_INTENT_ID'
      })
    }

    // Validate payment intent ID format (Stripe IDs start with pi_)
    if (!paymentIntentId.startsWith('pi_')) {
      logger.error('❌ /confirm-payment called with invalid paymentIntentId format', {
        bookingId,
        paymentIntentId,
        userId,
        userRole,
      })
      return res.status(400).json({
        error: 'Invalid payment intent ID format',
        code: 'INVALID_PAYMENT_INTENT_ID',
        details: 'Payment intent ID must start with pi_'
      })
    }

    logger.info('📨 [ENDPOINT DEBUG] /confirm-payment endpoint called', {
      bookingId,
      paymentIntentId,
      userId,
      userRole,
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
    return next(error)
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
      // FIXED: Fetch childrenIds from PARENT doc, not parentId from student doc
      const parentDoc = await db.collection('users').doc(userId).get()
      const parentData = parentDoc.data()
      isParent = parentData?.childrenIds?.includes(booking.studentId) || false

      logger.info('👨‍👩‍👧 [ENDPOINT DEBUG] Parent check', {
        userRole,
        studentId: booking.studentId,
        parentChildrenIds: parentData?.childrenIds,
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
    return next(error)
  }
})

/**
 * POST /api/v1/bookings/:id/request-reschedule
 * Request to reschedule a booking (requires approval from other party)
 * Authorized: tutor, student (18+), parent of student, or admin
 */
router.post('/:id/request-reschedule', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.uid
    const userRole = req.user!.role
    const bookingId = req.params.id

    // Validate input with date validation
    const { newScheduledAt } = rescheduleBookingSchema.parse(req.body)

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
        try {
          const birthDate = studentData.dateOfBirth.toDate?.() || new Date(studentData.dateOfBirth)
          const age = calculateAge(birthDate)
          isAuthorized = !isNaN(age) && age >= 0 && age >= 18
        } catch (error) {
          logger.error('Error calculating age for authorization:', error)
          isAuthorized = false
        }
      }
    } else if (userRole === 'parent') {
      // FIXED: Fetch childrenIds from PARENT doc, not parentId from student doc
      const parentDoc = await db.collection('users').doc(userId).get()
      const parentData = parentDoc.data()
      isAuthorized = parentData?.childrenIds?.includes(booking?.studentId) || false
    }

    if (!isAuthorized) {
      throw new ApiError('Not authorized to reschedule this booking', 403)
    }

    // Calculate hours until lesson
    const scheduledDate = booking?.scheduledAt?.toDate
      ? booking.scheduledAt.toDate()
      : new Date(booking?.scheduledAt)
    const now = new Date()
    const hoursUntilLesson = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Tutors cannot reschedule within 24 hours
    if (userRole === 'tutor' && hoursUntilLesson < 24 && hoursUntilLesson > 0) {
      throw new ApiError(
        `Cannot reschedule within 24 hours of lesson. Only ${hoursUntilLesson.toFixed(1)} hours remaining. ` +
        `If you cannot make this lesson, please cancel it or contact the student/parent directly via WhatsApp.`,
        403
      )
    }

    // Can't reschedule completed, cancelled, or declined bookings
    if (['completed', 'cancelled', 'declined'].includes(booking?.status || '')) {
      throw new ApiError('Cannot reschedule completed, cancelled, or declined bookings', 400)
    }

    // Check if there's already a pending reschedule request
    if (booking?.rescheduleRequest?.status === 'pending') {
      throw new ApiError('There is already a pending reschedule request for this booking', 400)
    }

    // Create reschedule request
    const rescheduleRequest = {
      requestedBy: userId,
      requestedAt: FieldValue.serverTimestamp(),
      newScheduledAt: new Date(newScheduledAt),
      status: 'pending' as const
    }

    await db.collection('bookings').doc(bookingId).update({
      rescheduleRequest,
      updatedAt: FieldValue.serverTimestamp()
    })

    logger.info('Reschedule request created', {
      bookingId,
      requestedBy: userId,
      currentScheduledAt: booking?.scheduledAt?.toDate?.()?.toISOString(),
      proposedScheduledAt: newScheduledAt
    })

    res.json({
      message: 'Reschedule request sent. Awaiting approval from the other party.',
      rescheduleRequest
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * POST /api/v1/bookings/:id/approve-reschedule
 * Approve a pending reschedule request
 * Authorized: The OTHER party (not the requester)
 */
router.post('/:id/approve-reschedule', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.uid
    const userRole = req.user!.role
    const bookingId = req.params.id

    const bookingDoc = await db.collection('bookings').doc(bookingId).get()

    if (!bookingDoc.exists) {
      throw new ApiError('Booking not found', 404)
    }

    const booking = bookingDoc.data()

    // Must have a pending reschedule request
    if (!booking?.rescheduleRequest || booking.rescheduleRequest.status !== 'pending') {
      throw new ApiError('No pending reschedule request found', 400)
    }

    const rescheduleRequest = booking.rescheduleRequest

    // Cannot approve your own request
    if (rescheduleRequest.requestedBy === userId) {
      throw new ApiError('You cannot approve your own reschedule request', 403)
    }

    // Check authorization - must be the OTHER party
    let isAuthorized = false

    if (userRole === 'admin') {
      isAuthorized = true
    } else if (userRole === 'tutor' && booking.tutorId === userId) {
      isAuthorized = true
    } else if (userRole === 'student' && booking.studentId === userId) {
      // Check if student is 18+
      const studentDoc = await db.collection('users').doc(userId).get()
      const studentData = studentDoc.data()
      if (studentData?.dateOfBirth) {
        try {
          const birthDate = studentData.dateOfBirth.toDate?.() || new Date(studentData.dateOfBirth)
          const age = calculateAge(birthDate)
          isAuthorized = !isNaN(age) && age >= 0 && age >= 18
        } catch (error) {
          logger.error('Error calculating age for authorization:', error)
          isAuthorized = false
        }
      }
    } else if (userRole === 'parent') {
      // FIXED: Fetch childrenIds from PARENT doc, not parentId from student doc
      const parentDoc = await db.collection('users').doc(userId).get()
      const parentData = parentDoc.data()
      isAuthorized = parentData?.childrenIds?.includes(booking.studentId) || false
    }

    if (!isAuthorized) {
      throw new ApiError('Not authorized to approve this reschedule request', 403)
    }

    // Update booking with new scheduled time
    const newScheduledDate = rescheduleRequest.newScheduledAt.toDate()
    const now = new Date()
    const hoursUntilLesson = (newScheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    const updateData: any = {
      scheduledAt: rescheduleRequest.newScheduledAt,
      rescheduledBy: rescheduleRequest.requestedBy,
      rescheduledAt: FieldValue.serverTimestamp(),
      'rescheduleRequest.status': 'approved',
      'rescheduleRequest.respondedBy': userId,
      'rescheduleRequest.respondedAt': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }

    // Recalculate payment schedule if not yet paid
    if (!booking.isPaid) {
      const paymentScheduledFor = hoursUntilLesson < 24
        ? null
        : new Date(newScheduledDate.getTime() - (24 * 60 * 60 * 1000))

      updateData.paymentScheduledFor = paymentScheduledFor
      updateData.paymentAttempted = false
      updateData.paymentError = null
      updateData.paymentRetryCount = 0

      logger.info('Recalculated payment schedule for approved reschedule', {
        bookingId,
        newScheduledAt: newScheduledDate.toISOString(),
        paymentScheduledFor: paymentScheduledFor?.toISOString() || 'immediate',
        hoursUntilLesson: hoursUntilLesson.toFixed(1)
      })
    }

    await db.collection('bookings').doc(bookingId).update(updateData)

    // Regenerate Teams meeting link if booking is confirmed
    if (booking.status === 'confirmed' && booking.meetingLink) {
      try {
        logger.info('Regenerating Teams meeting link for approved reschedule', {
          bookingId,
          oldScheduledAt: booking.scheduledAt?.toDate?.()?.toISOString(),
          newScheduledAt: newScheduledDate.toISOString()
        })

        await teamsService.generateMeetingForBooking(bookingId)

        logger.info('Successfully regenerated meeting link for approved reschedule', {
          bookingId
        })
      } catch (error: any) {
        logger.error('Failed to regenerate meeting link for approved reschedule', {
          bookingId,
          error: error.message
        })
        // Don't fail the approval if meeting generation fails
      }
    }

    logger.info('Reschedule request approved', {
      bookingId,
      approvedBy: userId,
      newScheduledAt: newScheduledDate.toISOString()
    })

    res.json({
      message: 'Reschedule approved successfully',
      newScheduledAt: newScheduledDate
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * POST /api/v1/bookings/:id/decline-reschedule
 * Decline a pending reschedule request
 * Authorized: The OTHER party (not the requester)
 */
router.post('/:id/decline-reschedule', authenticate, async (req: AuthRequest, res, next) => {
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

    // Must have a pending reschedule request
    if (!booking?.rescheduleRequest || booking.rescheduleRequest.status !== 'pending') {
      throw new ApiError('No pending reschedule request found', 400)
    }

    const rescheduleRequest = booking.rescheduleRequest

    // Cannot decline your own request
    if (rescheduleRequest.requestedBy === userId) {
      throw new ApiError('You cannot decline your own reschedule request', 403)
    }

    // Check authorization - must be the OTHER party
    let isAuthorized = false

    if (userRole === 'admin') {
      isAuthorized = true
    } else if (userRole === 'tutor' && booking.tutorId === userId) {
      isAuthorized = true
    } else if (userRole === 'student' && booking.studentId === userId) {
      // Check if student is 18+
      const studentDoc = await db.collection('users').doc(userId).get()
      const studentData = studentDoc.data()
      if (studentData?.dateOfBirth) {
        try {
          const birthDate = studentData.dateOfBirth.toDate?.() || new Date(studentData.dateOfBirth)
          const age = calculateAge(birthDate)
          isAuthorized = !isNaN(age) && age >= 0 && age >= 18
        } catch (error) {
          logger.error('Error calculating age for authorization:', error)
          isAuthorized = false
        }
      }
    } else if (userRole === 'parent') {
      // FIXED: Fetch childrenIds from PARENT doc, not parentId from student doc
      const parentDoc = await db.collection('users').doc(userId).get()
      const parentData = parentDoc.data()
      isAuthorized = parentData?.childrenIds?.includes(booking.studentId) || false
    }

    if (!isAuthorized) {
      throw new ApiError('Not authorized to decline this reschedule request', 403)
    }

    // Update reschedule request status to declined
    await db.collection('bookings').doc(bookingId).update({
      'rescheduleRequest.status': 'declined',
      'rescheduleRequest.respondedBy': userId,
      'rescheduleRequest.respondedAt': FieldValue.serverTimestamp(),
      'rescheduleRequest.declineReason': reason || 'No reason provided',
      updatedAt: FieldValue.serverTimestamp()
    })

    logger.info('Reschedule request declined', {
      bookingId,
      declinedBy: userId,
      reason: reason || 'No reason provided'
    })

    res.json({ message: 'Reschedule request declined' })
  } catch (error) {
    return next(error)
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
        try {
          const birthDate = studentData.dateOfBirth.toDate?.() || new Date(studentData.dateOfBirth)
          const age = calculateAge(birthDate)
          isAuthorized = !isNaN(age) && age >= 0 && age >= 18
        } catch (error) {
          logger.error('Error calculating age for authorization:', error)
          isAuthorized = false
        }
      }
    } else if (userRole === 'parent') {
      // FIXED: Fetch childrenIds from PARENT doc, not parentId from student doc
      const parentDoc = await db.collection('users').doc(userId).get()
      const parentData = parentDoc.data()
      isAuthorized = parentData?.childrenIds?.includes(booking?.studentId) || false
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

    // Handle payment cancellation/refund
    let refundId = null
    let paymentCancellationSkipped = false

    if (booking?.paymentIntentId) {
      // Validate payment intent ID before attempting to cancel/refund
      const isValidPaymentIntentId = booking.paymentIntentId.startsWith('pi_')

      if (!isValidPaymentIntentId) {
        logger.warn('⚠️ [CANCEL] Booking has invalid payment intent ID, skipping Stripe cancellation', {
          bookingId,
          invalidPaymentIntentId: booking.paymentIntentId,
          isPaid: booking.isPaid,
          status: booking.status,
        })
        paymentCancellationSkipped = true

        // If booking is marked as paid with invalid ID, this is a data inconsistency
        if (booking.isPaid) {
          logger.error('🚨 [CANCEL] DATA INCONSISTENCY: Booking marked as paid with invalid payment intent ID', {
            bookingId,
            invalidPaymentIntentId: booking.paymentIntentId,
            studentId: booking.studentId,
            tutorId: booking.tutorId,
            price: booking.price,
            timestamp: new Date().toISOString(),
          })
          // TODO: Alert admin - possible payment not properly processed
        }
      } else {
        try {
          // Valid payment intent ID - attempt to cancel/refund via Stripe
          if (!booking?.paymentCapturedAt) {
            // Authorization exists but not captured → Cancel authorization (no charge, no fees)
            logger.info('🔓 [CANCEL] Releasing authorization (no charge)', {
              bookingId,
              paymentIntentId: booking.paymentIntentId,
            })

            await stripe.paymentIntents.cancel(booking.paymentIntentId)

            logger.info('✅ [CANCEL] Authorization released successfully - no charge to customer', {
              bookingId,
              paymentIntentId: booking.paymentIntentId,
            })
          } else {
            // Payment already captured → Process refund (standard Stripe fees apply)
            logger.info('💸 [CANCEL] Payment was captured, processing refund', {
              bookingId,
              paymentIntentId: booking.paymentIntentId,
            })

            const refund = await stripe.refunds.create({
              payment_intent: booking.paymentIntentId,
              reason: 'requested_by_customer',
              metadata: {
                bookingId,
                cancelledBy: userId,
              },
            })
            refundId = refund.id

            logger.info('✅ [CANCEL] Refund processed (Stripe fees: 40p total)', {
              bookingId,
              paymentIntentId: booking.paymentIntentId,
              refundId,
              amount: refund.amount,
            })
          }
        } catch (error: any) {
          logger.error('❌ [CANCEL] Failed to cancel payment/authorization', {
            bookingId,
            error: error.message,
            errorType: error.type,
            errorCode: error.code,
            paymentIntentId: booking.paymentIntentId,
          })

          // Check if this is a "no such payment intent" error (invalid ID that passed format check)
          if (error.code === 'resource_missing' || error.type === 'invalid_request_error') {
            logger.warn('⚠️ [CANCEL] Payment intent not found in Stripe, treating as invalid ID', {
              bookingId,
              paymentIntentId: booking.paymentIntentId,
            })
            paymentCancellationSkipped = true
            // Continue with cancellation without throwing error
          } else {
            throw new ApiError('Failed to process payment cancellation. Please contact support.', 500)
          }
        }
      }
    }

    // If tutor cancelled, log prominently for admin review
    if (userRole === 'tutor') {
      const tutorDoc = await db.collection('users').doc(booking?.tutorId).get()
      const studentDoc = await db.collection('users').doc(booking?.studentId).get()

      const tutorName = tutorDoc.data()?.displayName || 'Unknown Tutor'
      const studentName = studentDoc.data()?.displayName || 'Unknown Student'

      logger.warn('⚠️ TUTOR CANCELLATION - ADMIN ACTION REQUIRED ⚠️', {
        bookingId,
        tutorId: booking?.tutorId,
        tutorName: tutorName,
        tutorEmail: req.user!.email,
        studentId: booking?.studentId,
        studentName: studentName,
        subject: booking?.subject,
        level: booking?.level,
        scheduledAt: scheduledAt.toISOString(),
        hoursUntilLesson: hoursUntilLesson.toFixed(1),
        reason: reason || 'No reason provided',
        refundProcessed: !!refundId,
        timestamp: new Date().toISOString()
      })

      // TODO: When SendGrid integrated, send email to admins
      // await emailService.sendTutorCancellationAlert({
      //   tutorName, studentName, subject: booking.subject, level: booking.level,
      //   scheduledAt, reason, bookingId
      // });
    }

    // Delete Teams meeting if it exists
    if (booking?.teamsMeetingId) {
      try {
        logger.info('🗑️ [CANCEL] Deleting Teams meeting', {
          bookingId,
          teamsMeetingId: booking.teamsMeetingId,
        })

        await teamsService.deleteTeamsMeeting(booking.teamsMeetingId)

        logger.info('✅ [CANCEL] Teams meeting deleted successfully', {
          bookingId,
          teamsMeetingId: booking.teamsMeetingId,
        })
      } catch (error: any) {
        // Log error but don't block cancellation
        logger.error('❌ [CANCEL] Failed to delete Teams meeting (continuing with cancellation)', {
          bookingId,
          teamsMeetingId: booking.teamsMeetingId,
          error: error.message,
          errorType: error.constructor.name,
        })
        // Continue with cancellation even if meeting deletion fails
      }
    }

    // Update booking
    const updateData: any = {
      status: 'cancelled',
      cancelledBy: userId,
      cancelledAt: FieldValue.serverTimestamp(),
      cancellationReason: reason || 'No reason provided',
      meetingLink: null, // Clear meeting link
      teamsMeetingId: null, // Clear Teams meeting ID
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Add refund tracking if refund was processed
    if (refundId) {
      updateData.refundId = refundId
      updateData.refundedAt = FieldValue.serverTimestamp()
    }

    // Track if payment cancellation was skipped due to invalid ID
    if (paymentCancellationSkipped) {
      updateData.paymentCancellationSkipped = true
      updateData.paymentCancellationSkipReason = 'Invalid or placeholder payment intent ID'
    }

    await db.collection('bookings').doc(bookingId).update(updateData)

    // Return appropriate message based on what happened
    let message = 'Booking cancelled successfully'
    if (paymentCancellationSkipped && booking?.isPaid) {
      message = 'Booking cancelled. Payment refund could not be processed automatically - please contact support.'
    } else if (refundId) {
      message = 'Booking cancelled and payment refunded successfully'
    } else if (paymentCancellationSkipped) {
      message = 'Booking cancelled successfully (no payment to refund)'
    }

    res.json({
      message,
      refunded: !!refundId,
      paymentCancellationSkipped,
    })
  } catch (error) {
    return next(error)
  }
})

export default router
