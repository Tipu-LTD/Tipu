# TIPU API - Implementation Guide

Complete guide for building the TIPU Academy standalone Express API with Swagger documentation.

---

## 🎯 Goal

Build a standalone Express/TypeScript API (like Commitly) that:
- Runs on `http://localhost:8090`
- Shows interactive Swagger UI documentation in browser
- Provides REST API endpoints for Lovable frontend
- Uses Firebase Admin SDK for Firestore & Auth
- Integrates with Stripe for payments

---

## 📁 Project Structure

```
tipu-api/
├── src/
│   ├── server.ts                     # Main Express server entry point
│   ├── config/
│   │   ├── firebase.ts               # Firebase Admin SDK initialization
│   │   ├── stripe.ts                 # Stripe SDK initialization
│   │   ├── logger.ts                 # Winston logger configuration
│   │   └── swagger.ts                # Swagger/OpenAPI specification
│   ├── middleware/
│   │   ├── auth.ts                   # Firebase JWT verification
│   │   ├── errorHandler.ts           # Global error handling
│   │   └── validateRequest.ts        # Zod schema validation
│   ├── routes/
│   │   ├── index.ts                  # Route aggregator
│   │   ├── health.ts                 # Health check endpoints
│   │   ├── auth.ts                   # Authentication routes
│   │   ├── bookings.ts               # Booking management routes
│   │   ├── payments.ts               # Payment routes (Stripe)
│   │   ├── users.ts                  # User profile routes
│   │   ├── messages.ts               # Chat/messaging routes
│   │   ├── tutors.ts                 # Tutor-specific routes
│   │   ├── resources.ts              # Resource management routes
│   │   └── admin.ts                  # Admin routes
│   ├── services/
│   │   ├── bookingService.ts         # Booking business logic
│   │   ├── paymentService.ts         # Payment processing logic
│   │   ├── userService.ts            # User management logic
│   │   ├── messageService.ts         # Chat service logic
│   │   ├── tutorService.ts           # Tutor service logic
│   │   ├── emailService.ts           # Email notification service
│   │   └── resourceService.ts        # Resource service logic
│   ├── types/
│   │   ├── express.d.ts              # Express type extensions
│   │   ├── user.ts                   # User types
│   │   ├── booking.ts                # Booking types
│   │   ├── payment.ts                # Payment types
│   │   └── message.ts                # Message types
│   └── utils/
│       ├── validation.ts             # Zod validation schemas
│       ├── errors.ts                 # Custom error classes
│       └── helpers.ts                # Utility functions
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 📦 Dependencies

### package.json

```json
{
  "name": "tipu-api",
  "version": "1.0.0",
  "description": "TIPU Academy API - Online tutoring platform backend",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.18.2",
    "firebase-admin": "^12.0.0",
    "stripe": "^14.7.0",
    "winston": "^3.11.0",
    "swagger-ui-express": "^5.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/cors": "^2.8.17",
    "@types/swagger-ui-express": "^4.1.6",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0"
  }
}
```

### Installation

```bash
npm install
```

---

## ⚙️ Configuration Files

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"],
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### .env.example

```env
# Server
PORT=8888
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Service (Resend)
RESEND_API_KEY=re_...

# App URL
APP_URL=http://localhost:3000
```

---

## 🔧 Core Implementation

### 1. Server Entry Point (`src/server.ts`)

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import dotenv from 'dotenv'
import { logger } from './config/logger'
import { initializeFirebase } from './config/firebase'
import routes from './routes'
import { errorHandler } from './middleware/errorHandler'
import { swaggerSpec } from './config/swagger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8090

// Initialize Firebase
initializeFirebase()

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Swagger documentation
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// API routes
app.use('/api', routes)

// Error handling
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 TIPU API running on port ${PORT}`)
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`)
  logger.info(`📚 Swagger docs: http://localhost:${PORT}`)
})

export default app
```

### 2. Firebase Configuration (`src/config/firebase.ts`)

```typescript
import admin from 'firebase-admin'
import { logger } from './logger'

export const initializeFirebase = () => {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    })

    logger.info('🔥 Firebase initialized with credentials')
    logger.info(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`)
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error)
    process.exit(1)
  }
}

export const db = admin.firestore()
export const auth = admin.auth()
```

### 3. Stripe Configuration (`src/config/stripe.ts`)

```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})
```

### 4. Logger Configuration (`src/config/logger.ts`)

```typescript
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tipu-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})
```

### 5. Swagger Configuration (`src/config/swagger.ts`)

```typescript
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TIPU Academy API',
    version: '1.0.0',
    description: 'Online tutoring platform API with Firebase and Stripe integration',
    contact: {
      name: 'TIPU Academy Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:8090',
      description: 'Development server',
    },
    {
      url: 'https://api.tipuacademy.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Firebase JWT token',
      },
    },
  },
  security: [{ bearerAuth: [] }],
}
```

### 6. Authentication Middleware (`src/middleware/auth.ts`)

```typescript
import { Request, Response, NextFunction } from 'express'
import { auth } from '../config/firebase'
import { logger } from '../config/logger'

export interface AuthRequest extends Request {
  user?: {
    uid: string
    email?: string
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    }

    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

### 7. Error Handler (`src/middleware/errorHandler.ts`)

```typescript
import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
  })

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
}
```

---

## 🛣️ API Routes

### Route Index (`src/routes/index.ts`)

```typescript
import { Router } from 'express'
import healthRoutes from './health'
import authRoutes from './auth'
import bookingRoutes from './bookings'
import paymentRoutes from './payments'
import userRoutes from './users'
import messageRoutes from './messages'
import tutorRoutes from './tutors'
import resourceRoutes from './resources'
import adminRoutes from './admin'

const router = Router()

router.use('/health', healthRoutes)
router.use('/v1/auth', authRoutes)
router.use('/v1/bookings', bookingRoutes)
router.use('/v1/payments', paymentRoutes)
router.use('/v1/users', userRoutes)
router.use('/v1/messages', messageRoutes)
router.use('/v1/tutors', tutorRoutes)
router.use('/v1/resources', resourceRoutes)
router.use('/v1/admin', adminRoutes)

export default router
```

### Health Routes (`src/routes/health.ts`)

```typescript
import { Router } from 'express'

const router = Router()

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export default router
```

### Booking Routes (`src/routes/bookings.ts`)

```typescript
import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as bookingService from '../services/bookingService'

const router = Router()

/**
 * @openapi
 * /v1/bookings:
 *   post:
 *     summary: Create new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking(req.user!.uid, req.body)
    res.status(201).json(booking)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /v1/bookings/{id}/accept:
 *   post:
 *     summary: Accept booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/accept', authenticate, async (req, res, next) => {
  try {
    await bookingService.acceptBooking(req.params.id, req.user!.uid, req.body.meetingLink)
    res.json({ message: 'Booking accepted' })
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /v1/bookings/{id}/decline:
 *   post:
 *     summary: Decline booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/decline', authenticate, async (req, res, next) => {
  try {
    await bookingService.declineBooking(req.params.id, req.user!.uid, req.body.reason)
    res.json({ message: 'Booking declined' })
  } catch (error) {
    next(error)
  }
})

export default router
```

---

## 🔨 Services Layer

### Booking Service (`src/services/bookingService.ts`)

```typescript
import { db } from '../config/firebase'
import { Booking } from '../types/booking'

export const createBooking = async (userId: string, data: any): Promise<Booking> => {
  const bookingRef = db.collection('bookings').doc()

  const booking: Booking = {
    id: bookingRef.id,
    studentId: userId,
    tutorId: data.tutorId,
    subject: data.subject,
    level: data.level,
    scheduledAt: new Date(data.scheduledAt),
    duration: data.duration || 60,
    status: 'pending',
    price: data.price,
    isPaid: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await bookingRef.set(booking)
  return booking
}

export const acceptBooking = async (
  bookingId: string,
  tutorId: string,
  meetingLink: string
) => {
  const bookingRef = db.collection('bookings').doc(bookingId)
  const booking = await bookingRef.get()

  if (!booking.exists) {
    throw new Error('Booking not found')
  }

  if (booking.data()?.tutorId !== tutorId) {
    throw new Error('Unauthorized')
  }

  await bookingRef.update({
    status: 'confirmed',
    meetingLink,
    updatedAt: new Date(),
  })
}

export const declineBooking = async (
  bookingId: string,
  tutorId: string,
  reason: string
) => {
  const bookingRef = db.collection('bookings').doc(bookingId)
  const booking = await bookingRef.get()

  if (!booking.exists) {
    throw new Error('Booking not found')
  }

  if (booking.data()?.tutorId !== tutorId) {
    throw new Error('Unauthorized')
  }

  await bookingRef.update({
    status: 'declined',
    declineReason: reason,
    updatedAt: new Date(),
  })
}
```

---

## 🚀 Running the API

### Development

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

### Production

```bash
npm run build
npm start
```

---

## 🌐 Accessing the API

### 1. **Swagger UI (Browser)**
Visit: `http://localhost:8090`

You'll see interactive documentation where you can:
- View all endpoints
- Test API calls directly
- See request/response examples
- Authenticate with Firebase JWT

### 2. **Direct API Calls**

**Example: Create Booking**
```bash
curl -X POST http://localhost:8090/api/v1/bookings \
  -H "Authorization: Bearer <firebase_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tutorId": "tutor123",
    "subject": "Maths",
    "level": "GCSE",
    "scheduledAt": "2024-12-25T10:00:00Z",
    "price": 4500
  }'
```

### 3. **From Lovable Frontend**

```typescript
const response = await fetch('http://localhost:8090/api/v1/bookings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tutorId: 'tutor123',
    subject: 'Maths',
    level: 'GCSE',
    scheduledAt: '2024-12-25T10:00:00Z',
    price: 4500,
  }),
})

const booking = await response.json()
```

---

## 📊 Complete Endpoint List

### Health
- `GET /health` - Health check

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - List user's bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `POST /api/v1/bookings/:id/accept` - Accept booking (tutor)
- `POST /api/v1/bookings/:id/decline` - Decline booking (tutor)
- `PATCH /api/v1/bookings/:id` - Update booking
- `POST /api/v1/bookings/:id/complete` - Mark complete
- `POST /api/v1/bookings/:id/lesson-report` - Submit lesson report

### Payments (Stripe)
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/webhook` - Stripe webhook
- `GET /api/v1/payments/history` - Payment history
- `POST /api/v1/payments/connect-account` - Create Connect account (tutor)

### Users
- `GET /api/v1/users/:id` - Get user profile
- `PATCH /api/v1/users/:id` - Update profile
- `GET /api/v1/users/:id/bookings` - User's bookings

### Messages (Chat)
- `GET /api/v1/messages/conversations` - List conversations
- `POST /api/v1/messages/conversations` - Create conversation
- `GET /api/v1/messages/conversations/:id` - Get messages
- `POST /api/v1/messages/conversations/:id/messages` - Send message
- `POST /api/v1/messages/conversations/:id/read` - Mark as read

### Tutors
- `GET /api/v1/tutors` - List all tutors
- `GET /api/v1/tutors/:id` - Get tutor details
- `GET /api/v1/tutors/subject/:subject` - Get tutors by subject
- `POST /api/v1/tutors/:id/availability` - Set availability
- `GET /api/v1/tutors/:id/availability` - Get availability

### Resources
- `GET /api/v1/resources` - List resources
- `POST /api/v1/resources` - Upload resource
- `GET /api/v1/resources/:id` - Get resource details
- `DELETE /api/v1/resources/:id` - Delete resource

### Admin
- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/bookings` - List all bookings
- `GET /api/v1/admin/revenue` - Revenue stats
- `GET /api/v1/admin/schools` - List schools
- `POST /api/v1/admin/schools` - Create school

---

## 🔐 Security Best Practices

1. **Firebase JWT Verification**: All protected routes require valid Firebase token
2. **CORS**: Configured to allow only frontend domain
3. **Helmet**: Security headers enabled
4. **Input Validation**: Zod schemas for all request bodies
5. **Error Handling**: No sensitive data in error responses
6. **Rate Limiting**: Add express-rate-limit for production

---

## 📝 Next Steps

1. ✅ Review this implementation guide
2. ✅ Run `npm install` to install dependencies
3. ✅ Configure `.env` file with Firebase & Stripe credentials
4. ✅ Run `npm run dev` to start server
5. ✅ Visit `http://localhost:8090` to see Swagger docs
6. ✅ Test endpoints in Swagger UI
7. ✅ Connect Lovable frontend to API

---

**Last Updated:** December 2024
**Version:** 1.0.0
