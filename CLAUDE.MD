# TIPU Academy - Implementation Guide

## 🎯 Project Overview

**TIPU Academy** (Māori: "to grow") is a premium online tutoring platform focused on homeschooling and school partnerships, offering GCSE and A-Level lessons in Maths, Physics, Computer Science, and Python, plus a unique Parent Support Program teaching parents to teach their children.

**Timeline:** 4 weeks to MVP launch
**Development Tool:** Lovable (AI-assisted development)
**Target Launch:** End of December 2024

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui components
- React Hook Form + Zod validation

**Backend:**
- Next.js API Routes
- Firebase Firestore (NoSQL database)
- Firebase Authentication
- Firebase Storage (recordings, resources)

**Payments:**
- Stripe Payment Intents
- Stripe Connect (tutor payouts)
- Stripe Customer Portal

**Real-time:**
- Firestore real-time listeners (chat, bookings)

**Email:**
- Resend or SendGrid (via Next.js API routes)

**Hosting:**
- Vercel (recommended) or Firebase Hosting

**Design Philosophy:**
- Minimalist, luxury-focused
- Mobile-responsive
- New Zealand landscape imagery (brand identity)

---

## 📁 Project Structure

```
tipu-academy/
├── src/
│   ├── components/
│   │   ├── dashboards/
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── TutorDashboard.tsx
│   │   │   ├── ParentDashboard.tsx
│   │   │   └── AdminDashboard.tsx
│   │   ├── booking/
│   │   │   ├── BookingFlow.tsx
│   │   │   ├── TutorSelector.tsx
│   │   │   ├── TimeSlotPicker.tsx
│   │   │   └── BookingConfirmation.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── admin/
│   │   │   ├── UserManagement.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   └── BookingsList.tsx
│   │   └── shared/
│   │       ├── Navbar.tsx
│   │       ├── Sidebar.tsx
│   │       └── LoadingSpinner.tsx
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts              # Firebase initialization
│   │   │   ├── auth.ts                # Auth helpers
│   │   │   ├── firestore.ts           # Database layer (abstracted)
│   │   │   └── storage.ts             # File upload helpers
│   │   ├── stripe/
│   │   │   ├── client.ts              # Stripe client config
│   │   │   └── webhooks.ts            # Webhook handlers
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useBookings.ts
│   │   │   ├── useChat.ts
│   │   │   └── usePayments.ts
│   │   └── api/                       # API abstraction layer
│   │       ├── bookings.ts
│   │       ├── users.ts
│   │       ├── payments.ts
│   │       └── messages.ts
│   ├── pages/
│   │   ├── index.tsx                  # Landing page
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── dashboard/
│   │   │   ├── student.tsx
│   │   │   ├── tutor.tsx
│   │   │   ├── parent.tsx
│   │   │   └── admin.tsx
│   │   ├── booking/
│   │   │   └── new.tsx
│   │   └── api/                       # Next.js API routes
│   │       ├── stripe/
│   │       │   ├── create-payment-intent.ts
│   │       │   └── webhook.ts
│   │       ├── bookings/
│   │       │   ├── create.ts
│   │       │   ├── accept.ts
│   │       │   └── decline.ts
│   │       └── notifications/
│   │           └── send-email.ts
│   ├── types/
│   │   ├── user.ts
│   │   ├── booking.ts
│   │   ├── chat.ts
│   │   └── payment.ts
│   └── utils/
│       ├── date.ts
│       ├── currency.ts
│       └── validation.ts
├── public/
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   └── firebase.json
├── docs/
│   ├── README.md                      # Main setup guide
│   ├── SETUP-FIREBASE.md              # Firebase configuration
│   ├── SETUP-STRIPE.md                # Stripe integration
│   ├── API-REFERENCE.md               # API functions reference
│   ├── DATABASE-SCHEMA.md             # Firestore collections
│   └── DEPLOYMENT.md                  # Production deployment
├── .env.example
├── .env.local                         # Git-ignored
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## 🗄️ Database Schema (Firestore)

### Collections Overview

1. **users** - All user profiles (students, tutors, parents, admins)
2. **bookings** - Tutoring session bookings
3. **conversations** - Chat conversations
4. **messages** - Chat messages (subcollection)
5. **resources** - Teaching materials, recordings, guides
6. **tutor_availability** - Tutor schedules
7. **schools** - School tracking
8. **syllabus_progress** - Student topic progress (Phase 2)

### Detailed Schemas

#### **users**
```typescript
{
  uid: string                          // Firebase Auth UID (document ID)
  email: string
  displayName: string
  role: 'student' | 'tutor' | 'parent' | 'admin'
  photoURL?: string
  createdAt: Timestamp
  updatedAt: Timestamp

  // Student-specific fields
  dateOfBirth?: Timestamp              // For 18+ chat eligibility
  parentId?: string                    // Link to parent user
  schoolId?: string                    // For school tracking
  enrolledSubjects?: string[]          // ['Maths', 'Physics']
  examBoards?: {                       // e.g., {maths: 'AQA', physics: 'Edexcel'}
    [subject: string]: string
  }

  // Tutor-specific fields
  bio?: string
  subjects?: string[]                  // Subjects they teach
  hourlyRates?: {                      // Custom rates per level
    GCSE: number                       // Default: 4500 (£45.00)
    'A-Level': number                  // Default: 6000 (£60.00)
  }
  isApproved?: boolean                 // Admin approval status
  dbsVerified?: boolean                // DBS check status

  // Parent-specific fields
  childrenIds?: string[]               // Array of student UIDs

  // Payment fields
  stripeCustomerId?: string            // Stripe Customer ID (parents/students)
  stripeConnectId?: string             // Stripe Connect ID (tutors)
}
```

#### **bookings**
```typescript
{
  id: string                           // Auto-generated document ID
  studentId: string                    // User UID
  tutorId: string                      // User UID
  subject: 'Maths' | 'Physics' | 'Computer Science' | 'Python'
  level: 'GCSE' | 'A-Level'
  scheduledAt: Timestamp               // Session date/time
  duration: number                     // Minutes (default: 60)
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined'
  price: number                        // Amount in pence (e.g., 4500 = £45.00)
  isPaid: boolean
  paymentIntentId?: string             // Stripe Payment Intent ID

  // Session details
  meetingLink?: string                 // Zoom/Google Meet URL (added by tutor on accept)
  recordingUrl?: string                // Firebase Storage URL

  // Lesson report (completed by tutor post-session)
  lessonReport?: {
    topicsCovered: string              // Text description
    homework?: string                  // Homework assigned
    notes?: string                     // Additional notes for student
    completedAt: Timestamp
  }

  // Decline tracking
  declineReason?: string               // If tutor declined

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### **conversations**
```typescript
{
  id: string                           // Auto-generated document ID
  participantIds: string[]             // [studentId/parentId, tutorId]
  lastMessage?: {
    text: string
    senderId: string
    timestamp: Timestamp
  }
  unreadCount?: {                      // Per-user unread counts
    [userId: string]: number
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### **messages** (subcollection of conversations)
```typescript
// Path: conversations/{conversationId}/messages/{messageId}
{
  id: string
  senderId: string                     // User UID
  text: string
  fileUrl?: string                     // Homework attachments
  timestamp: Timestamp
  read: boolean
}
```

#### **resources**
```typescript
{
  id: string
  title: string
  description?: string
  type: 'recording' | 'homework' | 'guide' | 'parent-material' | 'syllabus'
  subject: 'Maths' | 'Physics' | 'Computer Science' | 'Python' | 'General'
  level?: 'GCSE' | 'A-Level'
  examBoard?: string                   // 'AQA', 'Edexcel', 'OCR', etc.
  fileUrl: string                      // Firebase Storage URL
  uploadedBy: string                   // User UID (tutor or admin)
  isPublic: boolean                    // Public vs student-specific
  studentIds?: string[]                // If private, which students can access
  createdAt: Timestamp
}
```

#### **tutor_availability**
```typescript
{
  id: string                           // Document ID: tutorId
  tutorId: string
  slots: Array<{
    dayOfWeek: number                  // 0-6 (Sunday-Saturday)
    startTime: string                  // 'HH:mm' format (e.g., '09:00')
    endTime: string                    // 'HH:mm' format (e.g., '17:00')
  }>
  blockedDates?: Timestamp[]           // Holiday/unavailable dates
  updatedAt: Timestamp
}
```

#### **schools**
```typescript
{
  id: string
  name: string
  contactEmail?: string
  contactPhone?: string
  studentIds: string[]                 // Array of student UIDs
  createdAt: Timestamp
}
```

---

## 🔌 Core API Functions

### 1. Authentication API (`lib/api/users.ts`)

```typescript
/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  role: UserRole,
  additionalData: Partial<User>
): Promise<User>

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<User>

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<User>
): Promise<void>

/**
 * Check if user is 18+ (for chat eligibility)
 */
export async function checkAge18Plus(uid: string): Promise<boolean>
```

### 2. Booking API (`lib/api/bookings.ts`)

```typescript
/**
 * Create a new booking request
 */
export async function createBooking(data: {
  studentId: string
  tutorId: string
  subject: Subject
  level: Level
  scheduledAt: Date
  price: number
  duration?: number
}): Promise<Booking>

/**
 * Tutor accepts a booking request
 */
export async function acceptBooking(
  bookingId: string,
  tutorId: string,
  meetingLink: string
): Promise<void>

/**
 * Tutor declines a booking request
 * If declined, notify other tutors for that subject
 */
export async function declineBooking(
  bookingId: string,
  tutorId: string,
  reason: string
): Promise<void>

/**
 * Get bookings for a specific user (filtered by role)
 */
export async function getBookingsByUser(
  userId: string,
  role: UserRole
): Promise<Booking[]>

/**
 * Upload session recording to Firebase Storage
 */
export async function uploadSessionRecording(
  bookingId: string,
  file: File
): Promise<string>

/**
 * Submit lesson report (tutor completes post-session)
 */
export async function submitLessonReport(
  bookingId: string,
  report: LessonReport
): Promise<void>

/**
 * Mark booking as completed
 */
export async function completeBooking(bookingId: string): Promise<void>
```

### 3. Payment API (`lib/api/payments.ts`)

```typescript
/**
 * Create Stripe Payment Intent for a booking
 */
export async function createPaymentIntent(
  bookingId: string,
  amount: number
): Promise<{clientSecret: string, paymentIntentId: string}>

/**
 * Confirm payment and update booking status
 * Called by webhook after successful payment
 */
export async function confirmPayment(
  bookingId: string,
  paymentIntentId: string
): Promise<void>

/**
 * Get payment history for a user (parent/student)
 */
export async function getPaymentHistory(
  userId: string
): Promise<Payment[]>

/**
 * Create Stripe Connect account for tutor (for payouts)
 */
export async function createTutorConnectAccount(
  tutorId: string
): Promise<{accountId: string, onboardingUrl: string}>
```

### 4. Chat API (`lib/api/messages.ts`)

```typescript
/**
 * Get or create a conversation between users
 */
export async function getOrCreateConversation(
  participantIds: string[]
): Promise<Conversation>

/**
 * Send a message in a conversation
 * Enforces 18+ check for students
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  fileUrl?: string
): Promise<Message>

/**
 * Get all conversations for a user
 */
export async function getConversations(
  userId: string
): Promise<Conversation[]>

/**
 * Subscribe to real-time messages in a conversation
 */
export async function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe

/**
 * Mark messages as read
 */
export async function markAsRead(
  conversationId: string,
  userId: string
): Promise<void>
```

### 5. Tutor API (`lib/api/tutors.ts`)

```typescript
/**
 * Set tutor availability (weekly schedule)
 */
export async function setAvailability(
  tutorId: string,
  slots: TimeSlot[]
): Promise<void>

/**
 * Get available time slots for a tutor on a specific date
 */
export async function getAvailableSlots(
  tutorId: string,
  date: Date
): Promise<TimeSlot[]>

/**
 * Get all tutors who teach a specific subject
 */
export async function getTutorsBySubject(
  subject: Subject
): Promise<User[]>
```

### 6. Resources API (`lib/api/resources.ts`)

```typescript
/**
 * Upload a resource (recording, guide, homework)
 */
export async function uploadResource(
  file: File,
  metadata: ResourceMetadata
): Promise<Resource>

/**
 * Get resources accessible to a student
 */
export async function getResourcesByStudent(
  studentId: string
): Promise<Resource[]>

/**
 * Get parent teaching materials
 */
export async function getParentMaterials(): Promise<Resource[]>
```

### 7. Admin API (`lib/api/admin.ts`)

```typescript
/**
 * Get all users (optionally filtered by role)
 */
export async function getAllUsers(
  role?: UserRole
): Promise<User[]>

/**
 * Get revenue statistics for a date range
 */
export async function getRevenueStats(
  startDate: Date,
  endDate: Date
): Promise<RevenueStats>

/**
 * Get all bookings (admin view)
 */
export async function getAllBookings(): Promise<Booking[]>

/**
 * Get students belonging to a specific school
 */
export async function getSchoolStudents(
  schoolId: string
): Promise<User[]>
```

### 8. Notification API (Next.js API Routes)

```typescript
/**
 * Send booking request email to tutor
 * POST /api/notifications/send-email
 */
export async function sendBookingRequestEmail(
  tutorEmail: string,
  bookingDetails: BookingEmailData
): Promise<void>

/**
 * Send booking confirmation email to student
 */
export async function sendBookingConfirmationEmail(
  studentEmail: string,
  bookingDetails: BookingEmailData
): Promise<void>

/**
 * Send lesson reminder email (24hr before session)
 */
export async function sendLessonReminderEmail(
  studentEmail: string,
  bookingDetails: BookingEmailData
): Promise<void>
```

---

## 🎨 UI Component Structure

### Student Dashboard Components
- **UpcomingLessons** - Card list with join buttons
- **RecordingsGrid** - Video thumbnails with playback
- **ProgressTracker** - Subject progress bars
- **ChatPanel** - Contact list + message window (18+ only)
- **ResourceLibrary** - Filterable resource grid
- **SyllabusChecklist** - Interactive topic list

### Tutor Dashboard Components
- **TutorStats** - Earnings, sessions count
- **BookingRequestList** - Accept/decline interface
- **SessionCalendar** - Week/month view
- **MessageCenter** - Student/parent conversations
- **AvailabilityEditor** - Drag-to-select time slots
- **ReportForm** - Post-session lesson report

### Parent Dashboard Components
- **ChildrenTabs** - Switch between children
- **UpcomingPayments** - Payment schedule
- **ProgressOverview** - All children's progress
- **ParentProgram** - Teaching guides library
- **AskTutorButton** - Quick message to tutor

### Admin Dashboard Components
- **KPICards** - Revenue, users, sessions
- **RevenueChart** - Line/bar charts
- **UserTable** - Sortable, filterable table
- **BookingsTable** - All bookings overview
- **SchoolManager** - School assignments

---

## 📅 4-Week Implementation Plan

### **Week 1: Foundation + Auth + Dashboard Shells**

**Days 1-2: Project Setup**
- Initialize Next.js project with TypeScript
- Configure Tailwind CSS + shadcn/ui
- Set up Firebase project (Auth, Firestore, Storage)
- Create environment variables
- Write README files (setup guides)

**Days 3-4: Authentication**
- Firebase Auth integration (email/password)
- Registration flow with role selection
- Login/logout functionality
- Protected route middleware
- User profile creation in Firestore

**Days 5-7: Dashboard Layouts**
- Create layout components (Navbar, Sidebar)
- Student dashboard shell
- Tutor dashboard shell
- Parent dashboard shell
- Admin dashboard shell
- Navigation and routing

**Deliverables:**
- ✅ Working authentication
- ✅ 4 dashboard shells with navigation
- ✅ Firebase configured
- ✅ Documentation complete

---

### **Week 2: Booking System + Stripe Payments**

**Days 8-10: Booking Flow**
- Tutor availability management (calendar UI)
- Booking creation flow (subject → tutor → time)
- TutorSelector component
- TimeSlotPicker component
- Booking request creation in Firestore
- Real-time booking updates (Firestore listeners)

**Days 11-12: Accept/Decline System**
- Tutor booking request list view
- Accept booking (add meeting link)
- Decline booking (notify other tutors)
- Real-time notifications

**Days 13-14: Stripe Integration**
- Stripe account setup (test mode)
- Payment Intent API route
- Checkout flow for bookings
- Stripe webhook handler (payment.succeeded)
- Payment confirmation → booking confirmed
- Payment history view

**Deliverables:**
- ✅ Complete booking flow (request → accept → confirm)
- ✅ Stripe payments working
- ✅ Real-time booking notifications
- ✅ Tutor availability calendar

---

### **Week 3: Chat + Video + Resources**

**Days 15-17: Real-time Chat**
- Conversation creation logic
- Message sending/receiving (Firestore real-time)
- Chat UI (ConversationList, ChatWindow)
- 18+ age verification for student chat
- Parent access to child chats (under 18)
- Unread message counters
- File attachments (homework)

**Days 18-19: Session Management**
- Meeting link input field (tutors)
- Session recording upload to Firebase Storage
- Video player component with access control
- Lesson report form (post-session)
- Homework assignment/submission

**Days 20-21: Resources**
- Resource upload (tutors/admins)
- Firebase Storage integration
- Resource library (filter by subject/level)
- Download functionality
- Parent teaching guides section

**Deliverables:**
- ✅ Real-time chat with safeguarding
- ✅ Session recording upload/playback
- ✅ Lesson reports
- ✅ Resource library

---

### **Week 4: Parent Program + Admin + Launch**

**Days 22-23: Parent Program**
- Weekly parent sessions schedule
- Teaching guides library
- "Ask a Tutor" messaging feature
- Parent learning materials upload

**Days 24-25: Admin Back-office**
- User management table (CRUD operations)
- Booking overview (all bookings, filters)
- Revenue dashboard (charts, stats)
- School tracking (assign students to schools)
- Export data functionality

**Days 26-27: Email Notifications + Polish**
- Resend/SendGrid setup
- Booking request emails to tutors
- Booking confirmation emails
- Lesson reminder emails (24hr before)
- Responsive design refinement
- Error handling and loading states

**Day 28: Final Testing + Deployment**
- Security audit (Firestore rules)
- Cross-browser testing
- Mobile responsiveness check
- Production environment setup (env variables)
- Deploy to Vercel/Firebase
- User acceptance testing
- Launch! 🚀

**Deliverables:**
- ✅ Parent program features
- ✅ Admin back-office functional
- ✅ Email notifications working
- ✅ Production deployment
- ✅ All features tested and working

---

## 🔐 Security Implementation

### Firestore Security Rules

**Key Principles:**
1. Users can only read/write their own data
2. Tutors can access bookings assigned to them
3. Parents can access their children's data
4. Admins have full access
5. Chat requires 18+ verification for students

See `firebase/firestore.rules` for complete implementation.

### API Route Security

**All API routes must:**
1. Verify Firebase Auth token
2. Check user role authorization
3. Validate input with Zod schemas
4. Handle errors gracefully
5. Log security-relevant events

**Example:**
```typescript
// pages/api/bookings/accept.ts
import { verifyAuth } from '@/lib/firebase/auth'

export default async function handler(req, res) {
  // 1. Verify auth
  const user = await verifyAuth(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // 2. Check role
  if (user.role !== 'tutor') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // 3. Validate input
  const schema = z.object({
    bookingId: z.string(),
    meetingLink: z.string().url()
  })
  const { bookingId, meetingLink } = schema.parse(req.body)

  // 4. Execute logic
  await acceptBooking(bookingId, user.uid, meetingLink)

  return res.status(200).json({ success: true })
}
```

### Stripe Security

1. **Webhook signature verification** (prevent fake payment events)
2. **Never expose secret keys** client-side
3. **Use Payment Intents** (not legacy Charges API)
4. **Implement idempotency keys** for payment retries

---

## 🚀 Deployment

### Environment Variables

**Development (.env.local):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

RESEND_API_KEY=re_...
```

**Production (Vercel):**
- Same variables with production values
- Use Vercel environment variables UI
- Separate Stripe production keys

### Deployment Checklist

- [ ] Firebase project in production mode
- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Stripe live keys configured
- [ ] Stripe webhook endpoint configured
- [ ] Email service configured (Resend/SendGrid)
- [ ] Domain configured and SSL enabled
- [ ] Environment variables set in Vercel
- [ ] Error tracking enabled (Sentry)
- [ ] Analytics configured
- [ ] Test all critical flows in production

---

## 🎯 Success Metrics

**MVP Launch (End of Week 4):**
- ✅ All 4 dashboards fully functional
- ✅ End-to-end booking flow working
- ✅ Stripe payments operational (test mode → production)
- ✅ Real-time chat with safeguarding
- ✅ Session recording upload/playback
- ✅ Lesson reports functional
- ✅ Parent program materials accessible
- ✅ Admin back-office operational
- ✅ Email notifications sending
- ✅ Mobile-responsive design
- ✅ Production-ready security (Firestore rules)
- ✅ Deployed to production

**Post-Launch (Phase 2):**
- Advanced syllabus tracking (topic-by-topic progress)
- Automated lesson reminders (24hr before)
- SMS notifications (Twilio)
- Advanced analytics (student performance trends)
- Mobile app (React Native)
- Video integration (embedded live sessions)
- Referral system
- Multi-currency support

---

## 📚 Additional Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **Stripe Documentation:** https://stripe.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **shadcn/ui Components:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com/docs

---

## 🆘 Troubleshooting

### Common Issues

**Firebase Auth not working:**
- Check authorized domains in Firebase Console
- Verify API keys in .env.local
- Ensure Firebase SDK initialized correctly

**Stripe webhook not triggering:**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Verify webhook secret matches
- Check webhook signature validation

**Firestore permission denied:**
- Review security rules
- Check user authentication status
- Verify role-based access logic

**Real-time chat not updating:**
- Ensure Firestore real-time listeners are attached
- Check subscription cleanup (prevent memory leaks)
- Verify network connectivity

---

## 👥 Team & Roles

**Development:** Ethan (using Lovable for AI-assisted development)
**Business Owner:** [Owner name]
**Target Users:** Homeschooling families, schools, lower-income families (parent program)

---

## 📞 Support

For development questions, refer to:
- `docs/README.md` - Setup guide
- `docs/API-REFERENCE.md` - API documentation
- `docs/DATABASE-SCHEMA.md` - Database structure
- `docs/SETUP-FIREBASE.md` - Firebase configuration
- `docs/SETUP-STRIPE.md` - Stripe integration

---

**Last Updated:** December 2024
**Version:** 1.0.0 (MVP)
