import { Router } from 'express'
import healthRoutes from './health'
import authRoutes from './auth'
import bookingRoutes from './bookings'
import paymentRoutes from './payments'
import userRoutes from './users'
import messageRoutes from './messages'
import availabilityRoutes from './availability'
import tutorRoutes from './tutors'
import resourceRoutes from './resources'

const router = Router()

// Mount routes
router.use('/health', healthRoutes)
router.use('/v1/auth', authRoutes)
router.use('/v1/bookings', bookingRoutes)
router.use('/v1/payments', paymentRoutes)
router.use('/v1/users', userRoutes)
router.use('/v1/messages', messageRoutes)
router.use('/v1/availability', availabilityRoutes)
router.use('/v1/tutors', tutorRoutes)
router.use('/v1/resources', resourceRoutes)

export default router
