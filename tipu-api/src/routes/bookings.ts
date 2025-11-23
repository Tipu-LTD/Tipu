import { Router } from 'express'
import { authenticate, AuthRequest, requireRole } from '../middleware/auth'
import * as bookingService from '../services/bookingService'

const router = Router()

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const booking = await bookingService.createBooking({
      studentId: req.user!.uid,
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
    const bookings = await bookingService.getUserBookings(req.user!.uid, role as any)

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
      meetingLink: req.body.meetingLink,
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

export default router
