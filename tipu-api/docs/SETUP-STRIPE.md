# Stripe Integration Guide

This guide will walk you through integrating Stripe for payments in TIPU Academy, including Payment Intents for lesson bookings and Stripe Connect for tutor payouts.

---

## 📋 Prerequisites

- Stripe account (free to create)
- Node.js 18+ installed
- TIPU Academy development environment set up
- Stripe CLI installed (for webhook testing)

---

## 1️⃣ Create Stripe Account

### Step 1: Sign Up

1. Go to [stripe.com](https://stripe.com)
2. Click "Start now" or "Sign in"
3. Create account with email + password
4. Complete business profile (you can use test mode while developing)

### Step 2: Activate Test Mode

1. In Stripe Dashboard, ensure **"Test mode"** toggle is ON (top right)
2. All development should happen in test mode
3. Test mode uses separate API keys (starting with `pk_test_` and `sk_test_`)

---

## 2️⃣ Get API Keys

### Step 1: Navigate to API Keys

1. In Stripe Dashboard, go to **Developers → API keys**
2. You'll see two types of keys:
   - **Publishable key** (`pk_test_...`) - Safe to use in client-side code
   - **Secret key** (`sk_test_...`) - NEVER expose client-side, server-only

### Step 2: Copy Keys to Environment Variables

Add to your `.env.local` file:

```env
# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Abc...
STRIPE_SECRET_KEY=sk_test_51Abc...
```

**Important:**
- `NEXT_PUBLIC_` prefix makes publishable key available in browser
- Secret key has NO prefix (server-side only)

---

## 3️⃣ Install Stripe SDK

Install Stripe Node.js library:

```bash
npm install stripe @stripe/stripe-js
```

Current versions (as of Dec 2024):
- `stripe`: ^14.7.0 (server-side SDK)
- `@stripe/stripe-js`: ^2.3.0 (client-side SDK)

---

## 4️⃣ Initialize Stripe in Your App

### Server-Side (`src/lib/stripe/server.ts`)

```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})
```

### Client-Side (`src/lib/stripe/client.ts`)

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    )
  }
  return stripePromise
}
```

---

## 5️⃣ Set Up Payment Intents (Lesson Bookings)

### Workflow

1. **Student books a lesson** → Creates booking in Firestore
2. **Frontend requests Payment Intent** → API route creates Stripe Payment Intent
3. **Student completes payment** → Uses Stripe Elements to pay
4. **Webhook confirms payment** → Updates booking status to "confirmed"

### Step 1: Create Payment Intent API Route

Create `src/pages/api/stripe/create-payment-intent.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '@/lib/stripe/server'
import { verifyAuth } from '@/lib/firebase/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Verify authentication
    const user = await verifyAuth(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // 2. Get booking details
    const { bookingId, amount } = req.body

    // 3. Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in pence (e.g., 4500 = £45.00)
      currency: 'gbp',
      metadata: {
        bookingId,
        userId: user.uid,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // 4. Return client secret
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: any) {
    console.error('Stripe error:', error)
    res.status(500).json({ error: error.message })
  }
}
```

### Step 2: Frontend Payment Flow

Use Stripe Elements in your booking confirmation component:

```typescript
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm({ bookingId, amount }: { bookingId: string, amount: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)

    // 1. Create Payment Intent
    const res = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, amount }),
    })
    const { clientSecret } = await res.json()

    // 2. Confirm payment
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/booking/success?bookingId=${bookingId}`,
      },
    })

    if (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || loading}>
        Pay £{(amount / 100).toFixed(2)}
      </button>
    </form>
  )
}

export default function BookingPayment({ bookingId, amount }: any) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm bookingId={bookingId} amount={amount} />
    </Elements>
  )
}
```

---

## 6️⃣ Set Up Webhooks

Webhooks notify your server when payment events occur (e.g., payment succeeded, failed).

### Step 1: Create Webhook Handler

Create `src/pages/api/stripe/webhook.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import { stripe } from '@/lib/stripe/server'
import { db } from '@/lib/firebase/config'
import { doc, updateDoc } from 'firebase/firestore'

// Disable body parsing, need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']!

  let event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      const { bookingId } = paymentIntent.metadata

      // Update booking status to confirmed
      await updateDoc(doc(db, 'bookings', bookingId), {
        isPaid: true,
        status: 'confirmed',
        paymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      })

      console.log(`Payment succeeded for booking ${bookingId}`)
      break

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object
      console.error('Payment failed:', failedIntent.id)
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
}
```

### Step 2: Install Stripe CLI (for local testing)

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
Download from [GitHub releases](https://github.com/stripe/stripe-cli/releases/latest)

**Linux:**
```bash
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

### Step 3: Login to Stripe CLI

```bash
stripe login
```

Follow the browser authentication flow.

### Step 4: Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

You'll see a webhook signing secret like `whsec_...`. Copy it to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Keep this terminal running** while testing locally!

### Step 5: Test Webhook

In another terminal, trigger a test payment:

```bash
stripe trigger payment_intent.succeeded
```

Check your app logs to see the webhook event processed.

---

## 7️⃣ Set Up Production Webhooks

### Step 1: Create Webhook Endpoint in Stripe Dashboard

1. Go to **Developers → Webhooks**
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.created`
5. Click "Add endpoint"

### Step 2: Get Webhook Signing Secret

1. Click on your newly created webhook
2. Reveal the "Signing secret" (starts with `whsec_`)
3. Add to production environment variables (Vercel/Firebase)

---

## 8️⃣ Stripe Connect (Tutor Payouts)

Stripe Connect allows you to pay tutors from the platform.

### Step 1: Enable Stripe Connect

1. In Stripe Dashboard, go to **Connect → Settings**
2. Enable Stripe Connect
3. Choose **"Custom"** platform type (for full control)

### Step 2: Create Connect Account for Tutor

Create an API route `src/pages/api/stripe/create-connect-account.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '@/lib/stripe/server'
import { verifyAuth } from '@/lib/firebase/auth'
import { db } from '@/lib/firebase/config'
import { doc, updateDoc } from 'firebase/firestore'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await verifyAuth(req)
    if (!user || user.role !== 'tutor') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Create Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
    })

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tutor`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tutor?connect=success`,
      type: 'account_onboarding',
    })

    // Save Connect account ID to user profile
    await updateDoc(doc(db, 'users', user.uid), {
      stripeConnectId: account.id,
    })

    res.status(200).json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    })
  } catch (error: any) {
    console.error('Stripe Connect error:', error)
    res.status(500).json({ error: error.message })
  }
}
```

### Step 3: Transfer Funds to Tutor

After a lesson is completed and paid:

```typescript
import { stripe } from '@/lib/stripe/server'

async function payTutor(bookingId: string) {
  // Get booking and tutor details
  const booking = await getBooking(bookingId)
  const tutor = await getUserProfile(booking.tutorId)

  if (!tutor.stripeConnectId) {
    throw new Error('Tutor has not set up payouts')
  }

  // Calculate tutor payout (e.g., 80% of booking price)
  const platformFee = booking.price * 0.20 // 20% platform fee
  const tutorPayout = booking.price - platformFee

  // Create transfer
  await stripe.transfers.create({
    amount: tutorPayout,
    currency: 'gbp',
    destination: tutor.stripeConnectId,
    metadata: {
      bookingId,
      tutorId: tutor.uid,
    },
  })
}
```

---

## 9️⃣ Test Cards

For testing payments in test mode, use these test card numbers:

**Successful payment:**
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Failed payment (decline):**
- Card number: `4000 0000 0000 0002`

**Requires 3D Secure:**
- Card number: `4000 0025 0000 3155`

Full list: [Stripe Test Cards](https://stripe.com/docs/testing#cards)

---

## 🔟 Customer Portal (Optional)

Allow parents to manage payment methods:

### Step 1: Create Portal Session

```typescript
import { stripe } from '@/lib/stripe/server'

async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/parent`,
  })

  return session.url
}
```

### Step 2: Redirect User

```tsx
<button
  onClick={async () => {
    const res = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
    })
    const { url } = await res.json()
    window.location.href = url
  }}
>
  Manage Payment Methods
</button>
```

---

## ✅ Verification Checklist

- [ ] Stripe account created
- [ ] Test mode enabled
- [ ] API keys copied to `.env.local`
- [ ] Stripe SDK installed
- [ ] Payment Intent API route created
- [ ] Webhook handler created
- [ ] Stripe CLI installed and logged in
- [ ] Local webhook forwarding working
- [ ] Test payment successful with test card
- [ ] Webhook processes `payment_intent.succeeded`
- [ ] Booking status updates after payment
- [ ] Production webhook endpoint configured (for launch)
- [ ] Stripe Connect enabled (for tutor payouts)

---

## 🆘 Troubleshooting

### "Invalid API Key provided"
- Check that `STRIPE_SECRET_KEY` is set correctly in `.env.local`
- Ensure you're using the test key (`sk_test_...`) in development
- Restart Next.js dev server after adding env variables

### "No signatures found matching the expected signature for payload"
- Webhook secret doesn't match
- Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copy the new secret
- Update `STRIPE_WEBHOOK_SECRET` in `.env.local`

### Webhook not triggering
- Ensure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Check that your API route is at `/api/stripe/webhook`
- Verify `bodyParser: false` in API route config

### Payment stuck in "processing"
- Check Stripe Dashboard → Payments to see payment status
- Check your webhook logs for errors
- Ensure webhook handler updates Firestore correctly

### "Your card was declined"
- Use a test card from [Stripe's test cards list](https://stripe.com/docs/testing#cards)
- `4242 4242 4242 4242` should always work

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Payment Intents API](https://stripe.com/docs/payments/payment-intents)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

---

## 🔄 Next Steps

After Stripe is configured:

1. ✅ Test the full booking → payment → confirmation flow
2. ✅ Set up production webhook endpoint before launch
3. ✅ Configure tutor payout schedule
4. ✅ Review [API-REFERENCE.md](./API-REFERENCE.md) for payment API usage
5. ✅ Complete [DEPLOYMENT.md](./DEPLOYMENT.md) for production launch

---

**Stripe integration complete! 💳**
