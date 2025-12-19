import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as paymentService from '../services/paymentService'
import { stripe, webhookSecret } from '../config/stripe'
import { logger } from '../config/logger'
import { Request, Response } from 'express'

const router = Router()

// In-memory cache for processed payment intents (prevents duplicate processing)
// In production, consider using Redis for distributed systems
const processedPayments = new Set<string>()

router.post('/create-intent', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { bookingId, amount, currency } = req.body

    const result = await paymentService.createPaymentIntent({
      bookingId,
      amount,
      currency,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.user!.uid)
    res.json({ payments })
  } catch (error) {
    next(error)
  }
})

router.post('/connect-account', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await paymentService.createConnectAccount(
      req.user!.uid,
      req.user!.email!
    )
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post(
  '/webhook',
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string

    let event

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      )
    } catch (err: any) {
      logger.error('Webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as any
          const paymentIntentId = paymentIntent.id
          const { bookingId } = paymentIntent.metadata

          // Check if payment already processed (idempotency)
          if (processedPayments.has(paymentIntentId)) {
            logger.info(`Payment ${paymentIntentId} already processed (idempotent), skipping`)
            return res.sendStatus(200)
          }

          // Process payment
          await paymentService.confirmPayment(bookingId, paymentIntentId)
          logger.info(`Payment succeeded for booking ${bookingId}`)

          // Mark as processed
          processedPayments.add(paymentIntentId)

          // Clean up after 24 hours to prevent memory growth
          setTimeout(() => {
            processedPayments.delete(paymentIntentId)
            logger.debug(`Removed processed payment ${paymentIntentId} from cache`)
          }, 24 * 60 * 60 * 1000)
          break

        case 'payment_intent.payment_failed':
          logger.error('Payment failed:', event.data.object)
          break

        default:
          logger.info(`Unhandled event type ${event.type}`)
      }

      return res.json({ received: true })
    } catch (error: any) {
      logger.error('Error handling webhook:', error)
      return res.status(500).json({ error: error.message })
    }
  }
)

export default router
