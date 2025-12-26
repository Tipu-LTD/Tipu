import { Router, Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'
import * as scheduledPaymentService from '../services/scheduledPaymentService'

const router = Router()

// Cron secret for security (prevents unauthorized cron calls)
const CRON_SECRET = process.env.CRON_SECRET || 'development-secret'

/**
 * Middleware to verify cron secret
 */
function verifyCronSecret(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (token !== CRON_SECRET) {
    logger.warn('🚫 [CRON] Unauthorized cron request', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

/**
 * POST /api/v1/cron/process-payments
 * Process scheduled payments for bookings
 * Called by Railway cron every 15 minutes
 */
router.post('/process-payments', verifyCronSecret, async (req: Request, res: Response) => {
  logger.info('📨 [CRON] Received process-payments request', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
  })

  try {
    const result = await scheduledPaymentService.processScheduledPayments()

    logger.info('✅ [CRON] Payment processing completed', result)

    return res.status(200).json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    logger.error('❌ [CRON] Payment processing failed', {
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * POST /api/v1/cron/retry-failed-payments
 * Retry failed payments (called less frequently, e.g., hourly)
 */
router.post('/retry-failed-payments', verifyCronSecret, async (req: Request, res: Response) => {
  logger.info('📨 [CRON] Received retry-failed-payments request')

  try {
    const result = await scheduledPaymentService.retryFailedPayments()

    logger.info('✅ [CRON] Retry processing completed', result)

    return res.status(200).json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    logger.error('❌ [CRON] Retry failed payments error', {
      error: error.message,
    })

    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

export default router
