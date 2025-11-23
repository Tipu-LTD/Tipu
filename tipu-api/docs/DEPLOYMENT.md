# Deployment Guide

Complete guide for deploying TIPU Academy to production.

---

## 📋 Pre-Deployment Checklist

### Code & Testing
- [ ] All features tested locally
- [ ] No console errors or warnings
- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] Linting passed (`npm run lint`)
- [ ] Production build successful (`npm run build`)

### Firebase Setup
- [ ] Firebase project created (production)
- [ ] Firestore database created
- [ ] Storage bucket created
- [ ] Security rules deployed
- [ ] Indexes created (from firestore.indexes.json)

### Stripe Setup
- [ ] Stripe account activated (live mode)
- [ ] Live API keys obtained
- [ ] Production webhook endpoint configured
- [ ] Webhook signing secret saved
- [ ] Stripe Connect enabled (for tutor payouts)

### Environment Variables
- [ ] All production env variables ready
- [ ] Firebase config (production)
- [ ] Stripe keys (live mode)
- [ ] Email service API key
- [ ] Domain/URL configured

### Domain & Hosting
- [ ] Domain purchased (e.g., tipuacademy.com)
- [ ] SSL certificate ready (handled by Vercel)
- [ ] DNS configured

---

## 🚀 Deployment Options

We recommend **Vercel** for Next.js deployment.

---

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the authentication flow.

### Step 3: Link Project

In your project directory:

```bash
vercel link
```

Select or create a new Vercel project.

### Step 4: Add Environment Variables

#### Via Vercel Dashboard:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add all variables from `.env.example`
5. Set environment to **Production**

#### Via CLI:

```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# Enter value when prompted

# Repeat for all variables
```

**Required Variables:**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
```

### Step 5: Deploy

```bash
vercel --prod
```

Vercel will:
1. Build your Next.js app
2. Upload to their CDN
3. Provide a production URL (e.g., tipu-academy.vercel.app)

### Step 6: Configure Custom Domain

1. In Vercel Dashboard, go to **Settings → Domains**
2. Add your custom domain (e.g., tipuacademy.com)
3. Follow DNS configuration instructions
4. Vercel will automatically provision SSL certificate

---

## Option 2: Deploy to Firebase Hosting

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login

```bash
firebase login
```

### Step 3: Initialize Hosting

```bash
firebase init hosting
```

Select:
- Use existing project: Choose your Firebase project
- Public directory: `out` (for Next.js static export)
- Single-page app: `No`
- GitHub integration: Optional

### Step 4: Update next.config.js

Add static export configuration:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
```

**Note:** This disables Next.js server features (API routes, ISR). You'll need to deploy API routes to Firebase Cloud Functions separately.

### Step 5: Build and Deploy

```bash
npm run build
firebase deploy --only hosting
```

Your site will be live at: `https://your-project.web.app`

### Step 6: Configure Custom Domain

In Firebase Console:
1. Go to **Hosting → Add custom domain**
2. Enter your domain
3. Follow DNS verification steps

---

## 🔧 Environment Configuration

### Production Environment Variables

Create these in Vercel Dashboard or hosting provider:

```env
# Firebase (Production)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tipu-academy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tipu-academy-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tipu-academy-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Stripe (Production - LIVE KEYS)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Service (Resend)
RESEND_API_KEY=re_...

# App URL
NEXT_PUBLIC_APP_URL=https://tipuacademy.com
```

**Important:**
- Use **live** Stripe keys (not test keys)
- Double-check all values
- Never commit these to Git

---

## 🔐 Security Hardening

### 1. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

Verify rules in Firebase Console → Firestore → Rules.

### 2. Deploy Storage Security Rules

```bash
firebase deploy --only storage:rules
```

### 3. Enable Firebase App Check (Optional but Recommended)

Prevents abuse of your Firebase resources:

1. In Firebase Console, go to **App Check**
2. Enable App Check
3. Register your web app
4. Choose reCAPTCHA v3 provider
5. Add reCAPTCHA site key to environment variables

### 4. Configure CORS for Storage

In Firebase Storage Rules, add allowed origins:

```javascript
// Allow requests from your domain
request.headers['origin'] == 'https://tipuacademy.com'
```

### 5. Rate Limiting (Vercel)

Vercel automatically provides DDoS protection and rate limiting.

For additional protection, add middleware in Next.js:

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add security headers
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}
```

---

## 📊 Monitoring & Analytics

### 1. Set Up Error Tracking (Sentry)

**Install Sentry:**
```bash
npm install @sentry/nextjs
```

**Initialize:**
```bash
npx @sentry/wizard -i nextjs
```

Add Sentry DSN to environment variables:
```env
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### 2. Set Up Analytics (Google Analytics)

**Install:**
```bash
npm install @next/third-parties
```

**Add to app/layout.tsx:**
```typescript
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <GoogleAnalytics gaId="G-XXXXXXXXXX" />
      </body>
    </html>
  )
}
```

### 3. Firebase Performance Monitoring

In `src/lib/firebase/config.ts`:
```typescript
import { getPerformance } from 'firebase/performance'

const perf = getPerformance(app)
```

---

## 🔄 Stripe Production Setup

### 1. Activate Live Mode

In Stripe Dashboard:
1. Complete business profile
2. Activate payments
3. Switch to **Live mode** (toggle in top right)

### 2. Get Live API Keys

1. Go to **Developers → API keys**
2. Copy **Publishable key** (pk_live_...)
3. Reveal and copy **Secret key** (sk_live_...)
4. Add to production environment variables

### 3. Configure Production Webhook

1. Go to **Developers → Webhooks**
2. Click "Add endpoint"
3. Endpoint URL: `https://tipuacademy.com/api/stripe/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy **Signing secret** (whsec_...)
7. Add to production environment variables

### 4. Test Webhook

Use Stripe CLI to test production webhook:
```bash
stripe trigger payment_intent.succeeded --api-key sk_live_...
```

---

## 📧 Email Service Production

### Resend Setup

1. Verify your domain in Resend dashboard
2. Add DNS records (SPF, DKIM, DMARC)
3. Get production API key
4. Add to environment variables
5. Test email delivery

---

## 🌐 DNS Configuration

### For Vercel Deployment

Add these DNS records to your domain registrar:

**A Record:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Verification:**
Wait 5-10 minutes, then verify in Vercel dashboard.

---

## 🚦 Go-Live Checklist

### Pre-Launch
- [ ] All production environment variables set
- [ ] Firebase security rules deployed
- [ ] Stripe webhooks configured
- [ ] Email service configured and tested
- [ ] Custom domain connected and SSL active
- [ ] Test all critical user flows in production
- [ ] Create initial admin account

### Critical Flows to Test
- [ ] User registration (student, tutor, parent)
- [ ] User login/logout
- [ ] Book a lesson (student → tutor → payment)
- [ ] Accept booking (tutor)
- [ ] Payment processing (test with real card)
- [ ] Chat functionality
- [ ] Upload resource
- [ ] Session recording upload
- [ ] Email notifications sending

### Post-Launch
- [ ] Monitor error logs (Sentry)
- [ ] Check analytics setup
- [ ] Verify webhook events processing
- [ ] Test on multiple devices/browsers
- [ ] Backup database

---

## 🔄 Continuous Deployment

### Set Up GitHub Integration (Vercel)

1. Connect your GitHub repository to Vercel
2. Enable automatic deployments
3. Configure deployment branches:
   - `main` → Production
   - `staging` → Preview

**Every push to `main` will automatically:**
1. Run build
2. Deploy to production
3. Notify you of deployment status

---

## 📱 Mobile Responsiveness

Before launch, test on:

- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)
- [ ] Desktop (Chrome, Firefox, Safari)

---

## 🐛 Troubleshooting Deployment Issues

### "Build failed"
- Check TypeScript errors: `npm run type-check`
- Check for missing dependencies
- Review build logs in Vercel dashboard

### "Environment variable not found"
- Verify all env vars are set in Vercel
- Ensure `NEXT_PUBLIC_` prefix for client-side vars
- Redeploy after adding variables

### "Firebase permission denied in production"
- Check security rules are deployed
- Verify user authentication
- Check Firestore indexes are created

### "Stripe webhook not working"
- Verify webhook URL is correct
- Check webhook signing secret matches
- Review webhook logs in Stripe dashboard

### "Images not loading"
- Check Firebase Storage rules
- Verify file URLs are public
- Check CORS configuration

---

## 📊 Performance Optimization

### Enable Caching

In `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

### Image Optimization

Use Next.js Image component:
```tsx
import Image from 'next/image'

<Image
  src="/path/to/image.jpg"
  width={500}
  height={300}
  alt="Description"
  priority // For above-the-fold images
/>
```

---

## 🔄 Rollback Strategy

If deployment breaks production:

### Vercel Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Firebase Rollback

```bash
firebase hosting:rollback
```

---

## 📚 Post-Deployment Tasks

### Week 1 After Launch
- [ ] Monitor error rates daily
- [ ] Check payment processing (successful & failed)
- [ ] Review user feedback
- [ ] Fix critical bugs
- [ ] Optimize slow queries

### Month 1 After Launch
- [ ] Analyze usage patterns
- [ ] Review Firebase costs
- [ ] Optimize database queries
- [ ] Add missing features from user requests
- [ ] Plan Phase 2 features

---

## 🆘 Emergency Contacts

**Vercel Support:** [vercel.com/support](https://vercel.com/support)

**Firebase Support:** [firebase.google.com/support](https://firebase.google.com/support)

**Stripe Support:** [support.stripe.com](https://support.stripe.com)

---

## 📚 Related Documentation

- [README.md](./README.md) - Setup guide
- [SETUP-FIREBASE.md](./SETUP-FIREBASE.md) - Firebase configuration
- [SETUP-STRIPE.md](./SETUP-STRIPE.md) - Stripe integration
- [CLAUDE.MD](../CLAUDE.MD) - Complete implementation guide

---

**Deployment complete! 🎉**

Monitor your production app closely in the first few days. Good luck with the launch!
