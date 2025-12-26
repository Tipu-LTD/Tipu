import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as paymentService from '../services/paymentService'
import { stripe, webhookSecret } from '../config/stripe'
import { logger } from '../config/logger'
import { Request, Response } from 'express'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { createPaymentIntentSchema } from '../schemas/payment.schema'

const router = Router()

// Payment idempotency is now handled using Firestore transactions
// in the webhook handler below (processed_payments collection)

router.post('/create-intent', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Validate input
    const { bookingId, amount, currency } = createPaymentIntentSchema.parse(req.body)

    const result = await paymentService.createPaymentIntent({
      bookingId,
      amount,
      currency,
    })

    res.json(result)
  } catch (error) {
    return next(error)
  }
})

router.get('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.user!.uid)
    res.json({ payments })
  } catch (error) {
    return next(error)
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
    return next(error)
  }
})

// Create payment authorization (manual capture)
// Authorizes funds immediately but doesn't charge until capture
router.post('/authorize', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { bookingId } = req.body

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID required' })
    }

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get()
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const booking = bookingDoc.data()

    // Authorization check (parent or student 18+)
    const userId = req.user!.uid
    const userRole = req.user!.role

    let isAuthorized = false

    if (userRole === 'admin') {
      isAuthorized = true
    } else if (userRole === 'parent') {
      const studentDoc = await db.collection('users').doc(booking!.studentId).get()
      isAuthorized = studentDoc.data()?.parentId === userId
    } else if (userRole === 'student' && booking!.studentId === userId) {
      const studentDoc = await db.collection('users').doc(userId).get()
      const dob = studentDoc.data()?.dateOfBirth?.toDate()
      if (dob) {
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        isAuthorized = age >= 18
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to authorize payment for this booking' })
    }

    // Get payer (parent or adult student)
    let payerId = booking!.studentId
    const studentDoc = await db.collection('users').doc(booking!.studentId).get()
    if (studentDoc.data()?.parentId) {
      payerId = studentDoc.data()!.parentId
    }

    const payerDoc = await db.collection('users').doc(payerId).get()
    const payer = payerDoc.data()

    if (!payer) {
      return res.status(404).json({ error: 'Payer not found' })
    }

    // Get or create Stripe customer
    let stripeCustomerId = payer.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: payer.email,
        name: payer.displayName,
        metadata: {
          firebaseUid: payerId,
          role: payer.role
        }
      })
      stripeCustomerId = customer.id

      // Save to Firestore
      await db.collection('users').doc(payerId).update({
        stripeCustomerId,
        updatedAt: FieldValue.serverTimestamp()
      })
    }

    // Create Payment Intent with manual capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking!.price,
      currency: 'gbp',
      customer: stripeCustomerId,
      capture_method: 'manual', // CRITICAL: Hold funds, don't charge yet
      metadata: {
        bookingId,
        studentId: booking!.studentId,
        tutorId: booking!.tutorId,
        authorizationType: booking!.paymentAuthType || 'immediate_auth'
      },
      payment_method_types: ['card'],
    })

    // Calculate expiration (7 days from now)
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))

    // Update booking with authorization details
    await db.collection('bookings').doc(bookingId).update({
      paymentIntentId: paymentIntent.id,
      paymentIntentCreatedAt: FieldValue.serverTimestamp(),
      authorizationExpiresAt: expiresAt,
      updatedAt: FieldValue.serverTimestamp()
    })

    logger.info('Payment authorization created', {
      bookingId,
      paymentIntentId: paymentIntent.id,
      expiresAt: expiresAt.toISOString(),
      amount: booking!.price
    })

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      expiresAt: expiresAt.toISOString()
    })
  } catch (error) {
    return next(error)
  }
})

// Create SetupIntent to save payment method for deferred authorization
// Used for lessons ≥7 days away - save card now, create auth later
router.post('/setup-intent', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { bookingId } = req.body

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID required' })
    }

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get()
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const booking = bookingDoc.data()

    // Authorization check (parent or student 18+)
    const userId = req.user!.uid
    const userRole = req.user!.role

    let isAuthorized = false

    if (userRole === 'admin') {
      isAuthorized = true
    } else if (userRole === 'parent') {
      const studentDoc = await db.collection('users').doc(booking!.studentId).get()
      isAuthorized = studentDoc.data()?.parentId === userId
    } else if (userRole === 'student' && booking!.studentId === userId) {
      const studentDoc = await db.collection('users').doc(userId).get()
      const dob = studentDoc.data()?.dateOfBirth?.toDate()
      if (dob) {
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        isAuthorized = age >= 18
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to set up payment for this booking' })
    }

    // Get payer (parent or adult student)
    let payerId = booking!.studentId
    const studentDoc = await db.collection('users').doc(booking!.studentId).get()
    if (studentDoc.data()?.parentId) {
      payerId = studentDoc.data()!.parentId
    }

    const payerDoc = await db.collection('users').doc(payerId).get()
    const payer = payerDoc.data()

    if (!payer) {
      return res.status(404).json({ error: 'Payer not found' })
    }

    // Get or create Stripe customer
    let stripeCustomerId = payer.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: payer.email,
        name: payer.displayName,
        metadata: {
          firebaseUid: payerId,
          role: payer.role
        }
      })
      stripeCustomerId = customer.id

      // Save to Firestore
      await db.collection('users').doc(payerId).update({
        stripeCustomerId,
        updatedAt: FieldValue.serverTimestamp()
      })
    }

    // Create SetupIntent to save card for future charging
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Allow future off-session charges
      metadata: {
        bookingId,
        purpose: 'deferred_auth',
        studentId: booking!.studentId,
        tutorId: booking!.tutorId
      }
    })

    logger.info('SetupIntent created for deferred authorization', {
      bookingId,
      setupIntentId: setupIntent.id,
      customerId: stripeCustomerId
    })

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    })
  } catch (error) {
    return next(error)
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

          // Atomic idempotency check using Firestore transaction
          const processedRef = db.collection('processed_payments').doc(paymentIntentId)

          try {
            let alreadyProcessed = false

            await db.runTransaction(async (transaction) => {
              const doc = await transaction.get(processedRef)

              if (doc.exists) {
                logger.info(`Payment ${paymentIntentId} already processed (idempotent), skipping`)
                alreadyProcessed = true
                return
              }

              // Mark as processed FIRST (atomic operation)
              transaction.set(processedRef, {
                paymentIntentId,
                bookingId,
                processedAt: FieldValue.serverTimestamp(),
                // TTL: Document will be auto-deleted after 30 days (configure in Firebase Console)
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              })
            })

            // If already processed, return early
            if (alreadyProcessed) {
              return res.sendStatus(200)
            }

            // Process payment (outside transaction to avoid timeout)
            await paymentService.confirmPayment(bookingId, paymentIntentId)
            logger.info(`Payment succeeded and confirmed for booking ${bookingId}`)

          } catch (error) {
            logger.error('Payment processing error:', error)
            // Note: Payment intent is marked as processed in Firestore, so retry won't double-charge
            throw error
          }
          break

        case 'payment_intent.payment_failed':
          logger.error('Payment failed:', event.data.object)
          break

        case 'payment_intent.amount_capturable_updated':
          // Authorization created successfully (manual capture)
          const pi = event.data.object as any
          const authBookingId = pi.metadata.bookingId

          if (pi.status === 'requires_capture') {
            logger.info('Payment authorized successfully', {
              paymentIntentId: pi.id,
              bookingId: authBookingId,
              amount: pi.amount,
              capturable: pi.amount_capturable
            })

            // Update booking to confirm authorization succeeded
            if (authBookingId) {
              await db.collection('bookings').doc(authBookingId).update({
                paymentIntentId: pi.id,
                paymentIntentCreatedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
              })
            }
          }
          break

        case 'setup_intent.succeeded':
          // Card saved for deferred authorization
          const si = event.data.object as any
          const setupBookingId = si.metadata.bookingId
          const paymentMethodId = si.payment_method as string

          logger.info('Card saved for deferred authorization', {
            setupIntentId: si.id,
            bookingId: setupBookingId,
            paymentMethodId
          })

          // Update booking with saved payment method
          if (setupBookingId) {
            await db.collection('bookings').doc(setupBookingId).update({
              savedPaymentMethodId: paymentMethodId,
              setupIntentId: si.id,
              updatedAt: FieldValue.serverTimestamp()
            })
          }
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
