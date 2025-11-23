# TIPU Academy API

Backend API for TIPU Academy online tutoring platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Firebase project created with Admin SDK credentials
- Stripe account (test mode for development)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure .env file with your Firebase and Stripe credentials
```

### Configuration

Edit `.env` file:

```env
PORT=8090
NODE_ENV=development

# Firebase Admin SDK (get from Firebase Console)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Service
RESEND_API_KEY=re_...

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Output:
```
🔥 Firebase initialized with credentials
🚀 TIPU API running on port 8090
📝 Environment: development
🔥 Firebase Project: tipu-academy
📚 Swagger docs: http://localhost:8090
```

### Access API Documentation

Open your browser and navigate to:
```
http://localhost:8090
```

You'll see the interactive Swagger UI where you can:
- View all API endpoints
- Test endpoints directly in the browser
- See request/response examples
- Authenticate with Firebase JWT tokens

---

## 📁 Project Structure

```
tipu-api/
├── src/
│   ├── config/
│   │   ├── firebase.ts       # Firebase Admin SDK initialization
│   │   ├── stripe.ts         # Stripe configuration
│   │   ├── logger.ts         # Winston logger
│   │   └── swagger.ts        # Swagger/OpenAPI spec
│   ├── middleware/
│   │   ├── auth.ts           # Firebase JWT authentication
│   │   └── errorHandler.ts  # Global error handling
│   ├── routes/
│   │   ├── index.ts          # Route aggregator
│   │   ├── health.ts         # Health check
│   │   ├── auth.ts           # Authentication routes
│   │   ├── bookings.ts       # Booking management
│   │   ├── payments.ts       # Stripe payments
│   │   ├── users.ts          # User management
│   │   └── messages.ts       # Chat/messaging
│   ├── services/
│   │   ├── bookingService.ts # Booking business logic
│   │   ├── paymentService.ts # Payment processing
│   │   ├── userService.ts    # User management
│   │   └── messageService.ts # Messaging logic
│   ├── types/
│   │   ├── user.ts
│   │   ├── booking.ts
│   │   ├── payment.ts
│   │   └── message.ts
│   └── server.ts             # Express server entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🔌 API Endpoints

### Health Check
- `GET /health` - Check API status

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `GET /api/v1/auth/me` - Get current user profile

### Bookings
- `POST /api/v1/bookings` - Create new booking
- `GET /api/v1/bookings` - Get user's bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `POST /api/v1/bookings/:id/accept` - Accept booking (tutor)
- `POST /api/v1/bookings/:id/decline` - Decline booking (tutor)
- `POST /api/v1/bookings/:id/lesson-report` - Submit lesson report

### Payments (Stripe)
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/webhook` - Stripe webhook handler
- `GET /api/v1/payments/history` - Get payment history
- `POST /api/v1/payments/connect-account` - Create Connect account (tutor)

### Users
- `GET /api/v1/users/:id` - Get user profile
- `PATCH /api/v1/users/:id` - Update user profile
- `GET /api/v1/users/tutors/all` - Get all tutors
- `GET /api/v1/users/tutors/subject/:subject` - Get tutors by subject

### Messages
- `GET /api/v1/messages/conversations` - Get user's conversations
- `POST /api/v1/messages/conversations` - Create conversation
- `GET /api/v1/messages/conversations/:id` - Get messages
- `POST /api/v1/messages/conversations/:id/messages` - Send message
- `POST /api/v1/messages/conversations/:id/read` - Mark as read

---

## 🔐 Authentication

All protected endpoints require Firebase JWT authentication.

### How to Authenticate

1. **Get Firebase JWT Token** from your frontend (after user logs in with Firebase Auth)

2. **Include token in Authorization header:**
```bash
curl -X GET http://localhost:8090/api/v1/auth/me \
  -H "Authorization: Bearer <your_firebase_jwt_token>"
```

3. **In Swagger UI:**
- Click "Authorize" button (top right)
- Enter: `Bearer <your_firebase_jwt_token>`
- Click "Authorize"

---

## 🧪 Testing with Swagger UI

### Step 1: Open Swagger UI
Navigate to `http://localhost:8090` in your browser

### Step 2: Authorize
1. Click "Authorize" button
2. Enter your Firebase JWT token
3. Click "Authorize"

### Step 3: Test Endpoints
1. Expand any endpoint (e.g., `POST /api/v1/bookings`)
2. Click "Try it out"
3. Fill in the request body
4. Click "Execute"
5. See the response below

---

## 🛠️ Development

### Scripts

```bash
# Development (hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Adding New Endpoints

1. **Create service function** in `src/services/`
2. **Create route** in `src/routes/`
3. **Add Swagger documentation** with JSDoc comments
4. **Export route** in `src/routes/index.ts`

Example:
```typescript
/**
 * @openapi
 * /v1/example:
 *   post:
 *     tags:
 *       - Example
 *     summary: Example endpoint
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/example', authenticate, async (req, res, next) => {
  try {
    // Your logic here
    res.json({ message: 'Success' })
  } catch (error) {
    next(error)
  }
})
```

---

## 📊 Database (Firestore)

### Collections

- **users** - User profiles (students, tutors, parents, admins)
- **bookings** - Tutoring session bookings
- **conversations** - Chat conversations
- **messages** - Chat messages (subcollection)
- **resources** - Teaching materials
- **tutor_availability** - Tutor schedules
- **schools** - School tracking

See `../docs/DATABASE-SCHEMA.md` for complete schema details.

---

## 🔄 Stripe Webhooks (Local Testing)

### Setup Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8090/api/v1/payments/webhook
```

Copy the webhook signing secret (`whsec_...`) to your `.env` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Webhook

```bash
stripe trigger payment_intent.succeeded
```

---

## 🚀 Production Deployment

### Build

```bash
npm run build
```

### Environment Variables

Set these in your production environment (e.g., Railway, Render, Heroku):

```env
NODE_ENV=production
PORT=8090
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=...
FRONTEND_URL=https://tipuacademy.com
```

### Run

```bash
npm start
```

---

## 📝 Logging

Logs are output to console in development. In production, logs are also saved to:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs

---

## 🆘 Troubleshooting

### Firebase Auth Error
```
❌ Firebase initialization failed
```
**Solution:** Check that all Firebase environment variables are set correctly in `.env`

### Stripe Webhook Error
```
Webhook signature verification failed
```
**Solution:** Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe CLI or dashboard

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::8090
```
**Solution:** Kill the process using port 8090 or change `PORT` in `.env`

---

## 📚 Documentation

- **API Implementation Guide:** `../API-IMPLEMENTATION.md`
- **Database Schema:** `../docs/DATABASE-SCHEMA.md`
- **Setup Guides:** `../docs/`
- **Swagger UI:** `http://localhost:8090` (when running)

---

## 👥 Team

**Development:** TIPU Academy Development Team

**License:** MIT

---

## 🎯 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure `.env` file
3. ✅ Run development server: `npm run dev`
4. ✅ Open Swagger UI: `http://localhost:8090`
5. ✅ Test endpoints
6. ✅ Connect to Lovable frontend

---

**Happy coding! 🚀**
