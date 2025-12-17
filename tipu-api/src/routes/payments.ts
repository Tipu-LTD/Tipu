import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as paymentService from '../services/paymentService'
import { stripe, webhookSecret } from '../config/stripe'
import { logger } from '../config/logger'
import { Request, Response } from 'express'

const router = Router()

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
          const { bookingId } = paymentIntent.metadata

          await paymentService.confirmPayment(bookingId, paymentIntent.id)
          logger.info(`Payment succeeded for booking ${bookingId}`)
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
