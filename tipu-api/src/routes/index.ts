import { Router } from 'express'
import healthRoutes from './health'
import authRoutes from './auth'
import bookingRoutes from './bookings'
import paymentRoutes from './payments'
import userRoutes from './users'
import messageRoutes from './messages'

const router = Router()

// Mount routes
router.use('/health', healthRoutes)
router.use('/v1/auth', authRoutes)
router.use('/v1/bookings', bookingRoutes)
router.use('/v1/payments', paymentRoutes)
router.use('/v1/users', userRoutes)
router.use('/v1/messages', messageRoutes)

export default router
