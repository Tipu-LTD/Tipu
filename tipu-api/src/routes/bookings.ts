import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as bookingService from '../services/bookingService'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { ApiError } from '../middleware/errorHandler'

const router = Router()

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!
    let studentId = user.uid // Default to current user

    // If parent role and studentId provided in request, validate and use it
    if (user.role === 'parent' && req.body.studentId) {
      // Fetch parent's children to validate
      const userDoc = await db.collection('users').doc(user.uid).get()
      const childrenIds = userDoc.data()?.childrenIds || []

      if (!childrenIds.includes(req.body.studentId)) {
        throw new ApiError('You can only create bookings for your registered children', 403)
      }

      studentId = req.body.studentId
    }
    // If student role, always use their own ID (ignore any provided studentId)
    // This prevents students from creating bookings for other students

    const booking = await bookingService.createBooking({
      studentId,
      tutorId: req.body.tutorId,
      subject: req.body.subject,
      level: req.body.level,
      scheduledAt: new Date(req.body.scheduledAt),
      price: req.body.price,
      duration: req.body.duration,
    })

    res.status(201).json(booking)
  } catch (error) {
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
    await bookingService.declineBooking({
      bookingId: req.params.id,
      tutorId: req.user!.uid,
      reason: req.body.reason,
    })

    res.json({ message: 'Booking declined' })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/lesson-report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await bookingService.submitLessonReport({
      bookingId: req.params.id,
      topicsCovered: req.body.topicsCovered,
      homework: req.body.homework,
      notes: req.body.notes,
    })

    res.json({ message: 'Lesson report submitted successfully' })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id/confirm-payment', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const bookingRef = db.collection('bookings').doc(req.params.id)
    const bookingDoc = await bookingRef.get()

    if (!bookingDoc.exists) {
      throw new ApiError('Booking not found', 404)
    }

    // Update booking to confirmed status
    await bookingRef.update({
      status: 'confirmed',
      isPaid: true,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(`Booking confirmed after payment: ${req.params.id}`)
    res.json({ message: 'Booking confirmed successfully' })
  } catch (error) {
    next(error)
  }
})

export default router
