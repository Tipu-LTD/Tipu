# TIPU Academy - Implementation Guide

## 🎯 Project Overview

**TIPU Academy** (Māori: "to grow") is a premium online tutoring platform focused on homeschooling and school partnerships, offering GCSE and A-Level lessons in Maths, Physics, Computer Science, and Python, plus a unique Parent Support Program teaching parents to teach their children.

**Timeline:** 4 weeks to MVP launch
**Development Tool:** Lovable (AI-assisted development)
**Target Launch:** End of December 2024

---

## 🏗️ Architecture

### Monorepo Structure
The project is organized as a monorepo with three main applications:
- **tipu-app** - React/Vite frontend (Lovable-generated)
- **tipu-api** - Express/TypeScript REST API backend
- **tipu-backoffice** - Admin panel (planned, not yet implemented)

### Tech Stack

**Frontend (tipu-app):**
- React 18 + TypeScript (strict mode)
- Vite (build tool & dev server)
- React Router v6 (client-side routing)
- TanStack Query (React Query) for data fetching & caching
- Tailwind CSS
- shadcn/ui components (50+ UI components)
- React Hook Form + Zod validation
- Firebase SDK (client-side auth)
- Stripe React SDK

**Backend (tipu-api):**
- Express.js + TypeScript
- Firebase Admin SDK (server-side)
- Firebase Firestore (NoSQL database)
- Firebase Authentication (JWT verification)
- Firebase Storage (recordings, resources)
- Stripe SDK (Payment Intents, Connect, Webhooks)
- Winston logger
- Swagger/OpenAPI documentation
- Helmet + CORS security
- Port: 8888

**Payments:**
- Stripe Payment Intents
- Stripe Connect (tutor payouts)
- Stripe Webhooks (payment confirmation)

**Data Fetching:**
- REST API with TanStack Query
- React Query polling for updates
- Firestore real-time listeners available but not actively used

**Email:**
- Resend or SendGrid (planned, not yet implemented)

**Hosting:**
- Frontend: Lovable (https://e85f917e-442a-4cd9-8b6c-ece9d8844a07.lovableproject.com)
- API: Not yet deployed to production (runs locally on port 8888)

**Design Philosophy:**
- Minimalist, luxury-focused
- Mobile-responsive
- New Zealand landscape imagery (brand identity)

---

## 📁 Project Structure

```
Tipu-Mono/                             # Monorepo root
├── tipu-app/                          # Frontend (Lovable)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── bookings/
│   │   │   │   ├── BookingCard.tsx
│   │   │   │   ├── BookingModal.tsx
│   │   │   │   └── PaymentForm.tsx
│   │   │   ├── landing/
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── HowItWorks.tsx
│   │   │   │   ├── SubjectCards.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── tutors/
│   │   │   │   ├── TutorCard.tsx
│   │   │   │   └── TutorFilters.tsx
│   │   │   └── ui/                    # 50+ shadcn components
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       └── ...
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx        # Firebase auth state
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/
│   │   │   ├── api/                   # API client layer
│   │   │   │   ├── client.ts          # Axios instance
│   │   │   │   ├── auth.ts
│   │   │   │   ├── bookings.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── payments.ts
│   │   │   │   └── messages.ts
│   │   │   ├── firebase/
│   │   │   │   ├── config.ts          # Firebase client config
│   │   │   │   ├── auth.ts
│   │   │   │   ├── firestore.ts
│   │   │   │   └── storage.ts
│   │   │   └── stripe/
│   │   │       └── client.ts
│   │   ├── pages/                     # React Router pages (18 total)
│   │   │   ├── Index.tsx              # Landing page
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Tutors.tsx             # Browse tutors
│   │   │   ├── TutorProfile.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── NotFound.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StudentDashboard.tsx
│   │   │   │   ├── TutorDashboard.tsx
│   │   │   │   ├── ParentDashboard.tsx
│   │   │   │   └── AdminDashboard.tsx
│   │   │   └── bookings/
│   │   │       ├── StudentBookings.tsx
│   │   │       ├── TutorRequests.tsx
│   │   │       ├── TutorSchedule.tsx
│   │   │       ├── BookingDetails.tsx
│   │   │       └── BookingConfirmation.tsx
│   │   ├── types/
│   │   │   ├── user.ts
│   │   │   ├── booking.ts
│   │   │   ├── message.ts
│   │   │   ├── payment.ts
│   │   │   └── api.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── currency.ts
│   │       └── validators.ts
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── tipu-api/                          # Backend (Express)
│   ├── src/
│   │   ├── config/
│   │   │   ├── firebase.ts            # Firebase Admin SDK
│   │   │   ├── stripe.ts              # Stripe config
│   │   │   ├── logger.ts              # Winston logger
│   │   │   └── swagger.ts             # OpenAPI setup
│   │   ├── middleware/
│   │   │   ├── auth.ts                # JWT verification
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts                # POST /api/v1/auth/*
│   │   │   ├── bookings.ts            # /api/v1/bookings/*
│   │   │   ├── payments.ts            # /api/v1/payments/*
│   │   │   ├── users.ts               # /api/v1/users/*
│   │   │   ├── messages.ts            # /api/v1/messages/*
│   │   │   └── health.ts              # GET /health
│   │   ├── services/                  # Business logic
│   │   │   ├── bookingService.ts
│   │   │   ├── paymentService.ts
│   │   │   ├── userService.ts
│   │   │   └── messageService.ts
│   │   ├── types/
│   │   │   ├── user.ts
│   │   │   ├── booking.ts
│   │   │   └── ...
│   │   └── server.ts                  # Express app entry
│   ├── firebase/
│   │   ├── firestore.rules            # Security rules
│   │   └── storage.rules
│   ├── docs/                          # Extensive documentation
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   ├── API.md
│   │   ├── DATABASE.md
│   │   └── DEPLOYMENT.md
│   ├── openapi.yaml                   # Complete API spec
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── tipu-backoffice/                   # Admin panel (empty, planned)
│
├── CLAUDE.md                          # This file
└── package.json                       # Root package.json
```

---

## ✅ Implementation Status

### **FULLY IMPLEMENTED** (~60-70% of MVP)

#### Core Features
- ✅ **Authentication & Authorization**
  - Firebase Auth (email/password)
  - JWT token verification
  - Protected routes with role-based access
  - User profile creation and updates

- ✅ **User Management**
  - Four user roles (student, tutor, parent, admin)
  - Age verification (18+) for chat
  - Tutor approval system
  - Default hourly rates (£45 GCSE, £60 A-Level)

- ✅ **Booking System** (Complete Lifecycle)
  - Create booking requests
  - Accept/decline bookings
  - Meeting link management
  - Lesson report submission
  - Status tracking (pending → confirmed → completed)
  - BookingCard, BookingModal, PaymentForm components
  - StudentBookings, TutorRequests, TutorSchedule pages

- ✅ **Payment Integration** (Stripe)
  - Payment Intent creation
  - Stripe webhooks (payment.succeeded)
  - Payment confirmation
  - Payment history
  - Stripe Connect for tutors (payouts)
  - Connect account creation & onboarding

- ✅ **Messaging/Chat System**
  - Create conversations
  - Send/receive messages (text + file attachments)
  - Unread count tracking
  - Last message preview
  - 18+ age check enforcement

- ✅ **Dashboard Pages** (All 4 Roles)
  - Student Dashboard (stats, upcoming lessons, quick actions)
  - Tutor Dashboard
  - Parent Dashboard
  - Admin Dashboard

- ✅ **Tutor Browsing**
  - Browse tutors page with filters
  - Search by name
  - Filter by subject
  - Sort by price
  - Only show approved tutors
  - Tutor profile pages

- ✅ **API Documentation**
  - Complete OpenAPI 3.0 spec (openapi.yaml)
  - Swagger UI at http://localhost:8888/api-docs
  - Interactive API testing

- ✅ **Security**
  - Firebase Admin SDK (server-side auth)
  - JWT verification on protected routes
  - Role-based access control
  - CORS + Helmet security headers
  - Firestore security rules file

### **PARTIALLY IMPLEMENTED**

- ⚠️ **Real-time Updates**
  - Backend uses standard REST queries (not real-time)
  - Frontend uses React Query polling pattern
  - Firestore real-time listeners available but not actively used
  - Gap: Could optimize with true real-time sync

- ⚠️ **Admin Features**
  - AdminDashboard exists
  - Basic user queries available
  - Missing: Revenue analytics, school management, user approval workflows

### **NOT YET IMPLEMENTED**

- ❌ **Tutor Availability Management**
  - No weekly schedule setting
  - No availability calendar
  - No time slot checking
  - Workaround: Bookings can be created for any time

- ❌ **Resources/Materials System**
  - No file upload/download for recordings
  - No teaching guides library
  - No resource pages/components
  - Database schema exists but unused

- ❌ **Email Notifications**
  - No automated emails (booking requests, confirmations, reminders)
  - Resend API key in .env.example but no implementation

- ❌ **Session Recording Upload**
  - recordingUrl field exists in booking schema
  - No Firebase Storage upload/download implementation
  - No video player component

- ❌ **Parent Program**
  - No teaching guides for parents
  - No parent-specific materials
  - No "Ask a Tutor" feature
  - No parent learning sessions

- ❌ **School Partnerships**
  - schools collection schema exists
  - No school assignment functionality
  - No bulk student tracking

- ❌ **Syllabus Progress Tracking** (Phase 2)
  - No topic-by-topic progress
  - syllabus_progress schema documented but not implemented

- ❌ **Backoffice/Admin Panel**
  - tipu-backoffice directory is empty
  - No separate admin application

### **API Endpoints Status**

**✅ Implemented:**
- `GET /health` - Health check
- `POST /api/v1/auth/register` - Register user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - Get user bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `POST /api/v1/bookings/:id/accept` - Accept booking
- `POST /api/v1/bookings/:id/decline` - Decline booking
- `POST /api/v1/bookings/:id/lesson-report` - Submit report
- `POST /api/v1/payments/create-intent` - Create payment
- `POST /api/v1/payments/webhook` - Stripe webhook
- `GET /api/v1/payments/history` - Payment history
- `POST /api/v1/payments/connect-account` - Tutor payout setup
- `GET /api/v1/users/:id` - Get user profile
- `PATCH /api/v1/users/:id` - Update profile
- `GET /api/v1/users/tutors/all` - Get all tutors
- `GET /api/v1/users/tutors/subject/:subject` - Get tutors by subject
- `GET /api/v1/messages/conversations` - Get conversations
- `POST /api/v1/messages/conversations` - Create conversation
- `GET /api/v1/messages/conversations/:id` - Get messages
- `POST /api/v1/messages/conversations/:id/messages` - Send message
- `POST /api/v1/messages/conversations/:id/read` - Mark as read

**❌ Not Implemented:**
- Tutor availability endpoints
- Resource management endpoints
- Admin analytics endpoints
- Email notification endpoints

---

## 🗄️ Database Schema (Firestore)

### Collections Overview

**✅ Active Collections (In Use):**
1. **users** - All user profiles (students, tutors, parents, admins)
2. **bookings** - Tutoring session bookings
3. **conversations** - Chat conversations
4. **messages** - Chat messages (subcollection of conversations)

**❌ Planned Collections (Schema Defined, Not Yet Implemented):**
5. **resources** - Teaching materials, recordings, guides
6. **tutor_availability** - Tutor schedules
7. **schools** - School tracking
8. **syllabus_progress** - Student topic progress (Phase 2)

### Detailed Schemas

#### **users** ✅ (Active)
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

#### **bookings** ✅ (Active)
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

#### **conversations** ✅ (Active)
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

#### **messages** ✅ (Active - subcollection of conversations)
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

#### **resources** ❌ (Planned - Not Yet Implemented)
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

#### **tutor_availability** ❌ (Planned - Not Yet Implemented)
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

#### **schools** ❌ (Planned - Not Yet Implemented)
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

## 🔌 Core API Endpoints

**Base URL:** `http://localhost:8888`
**API Documentation:** `http://localhost:8888/api-docs` (Swagger UI)
**OpenAPI Spec:** `tipu-api/openapi.yaml`

All protected endpoints require an `Authorization: Bearer <firebase-jwt-token>` header.

### 1. Authentication & Users API

**Backend Routes:** `tipu-api/src/routes/auth.ts`, `tipu-api/src/routes/users.ts`
**Frontend Client:** `tipu-app/src/lib/api/auth.ts`, `tipu-app/src/lib/api/users.ts`

```typescript
// ✅ IMPLEMENTED

// POST /api/v1/auth/register
// Register a new user with Firebase Auth and create Firestore profile
registerUser(email: string, password: string, role: UserRole, additionalData: Partial<User>): Promise<User>

// GET /api/v1/auth/me
// Get current authenticated user's profile
getCurrentUser(): Promise<User>

// GET /api/v1/users/:id
// Get user profile by UID
getUserProfile(userId: string): Promise<User>

// PATCH /api/v1/users/:id
// Update user profile (user can only update their own profile, or admin)
updateUserProfile(userId: string, updates: Partial<User>): Promise<User>

// GET /api/v1/users/tutors/all
// Get all approved tutors
getAllTutors(): Promise<User[]>

// GET /api/v1/users/tutors/subject/:subject
// Get approved tutors who teach a specific subject
getTutorsBySubject(subject: Subject): Promise<User[]>
```

### 2. Bookings API

**Backend Routes:** `tipu-api/src/routes/bookings.ts`
**Frontend Client:** `tipu-app/src/lib/api/bookings.ts`

```typescript
// ✅ IMPLEMENTED

// POST /api/v1/bookings
// Create a new booking request
createBooking(data: {
  studentId: string,
  tutorId: string,
  subject: Subject,
  level: Level,
  scheduledAt: Date,
  price: number,
  duration?: number
}): Promise<Booking>

// GET /api/v1/bookings
// Get bookings for current authenticated user (filtered by role)
getBookings(): Promise<Booking[]>

// GET /api/v1/bookings/:id
// Get booking details by ID
getBooking(bookingId: string): Promise<Booking>

// POST /api/v1/bookings/:id/accept
// Tutor accepts a booking request and provides meeting link
acceptBooking(bookingId: string, meetingLink: string): Promise<Booking>

// POST /api/v1/bookings/:id/decline
// Tutor declines a booking request with reason
declineBooking(bookingId: string, reason: string): Promise<Booking>

// POST /api/v1/bookings/:id/lesson-report
// Submit lesson report after session completion
submitLessonReport(bookingId: string, report: {
  topicsCovered: string,
  homework?: string,
  notes?: string
}): Promise<Booking>

// ❌ NOT IMPLEMENTED
// uploadSessionRecording() - No Firebase Storage integration yet
// completeBooking() - Status updated via lesson report or manual update
```

### 3. Payments API

**Backend Routes:** `tipu-api/src/routes/payments.ts`
**Frontend Client:** `tipu-app/src/lib/api/payments.ts`

```typescript
// ✅ IMPLEMENTED

// POST /api/v1/payments/create-intent
// Create Stripe Payment Intent for a booking
createPaymentIntent(bookingId: string, amount: number): Promise<{
  clientSecret: string,
  paymentIntentId: string
}>

// POST /api/v1/payments/webhook
// Stripe webhook handler (payment.succeeded event)
// Confirms payment and updates booking status
// Called by Stripe, not directly by frontend

// GET /api/v1/payments/history
// Get payment history for current authenticated user
getPaymentHistory(): Promise<Payment[]>

// POST /api/v1/payments/connect-account
// Create Stripe Connect account for tutor (for payouts)
createConnectAccount(tutorId: string): Promise<{
  accountId: string,
  onboardingUrl: string
}>
```

### 4. Messages API

**Backend Routes:** `tipu-api/src/routes/messages.ts`
**Frontend Client:** `tipu-app/src/lib/api/messages.ts`

```typescript
// ✅ IMPLEMENTED

// GET /api/v1/messages/conversations
// Get all conversations for current authenticated user
getConversations(): Promise<Conversation[]>

// POST /api/v1/messages/conversations
// Get or create a conversation between users
createConversation(participantIds: string[]): Promise<Conversation>

// GET /api/v1/messages/conversations/:id
// Get all messages in a conversation
getMessages(conversationId: string): Promise<Message[]>

// POST /api/v1/messages/conversations/:id/messages
// Send a message in a conversation (enforces 18+ check for students)
sendMessage(conversationId: string, text: string, fileUrl?: string): Promise<Message>

// POST /api/v1/messages/conversations/:id/read
// Mark messages as read in a conversation
markAsRead(conversationId: string): Promise<void>

// ❌ NOT IMPLEMENTED (Available but not actively used)
// subscribeToMessages() - Firestore real-time listeners exist but frontend uses polling
```

### 5. Tutor Availability API

```typescript
// ❌ NOT IMPLEMENTED

// Planned endpoints:
// POST /api/v1/tutors/:id/availability - Set tutor weekly schedule
// GET /api/v1/tutors/:id/availability - Get tutor availability
// GET /api/v1/tutors/:id/slots - Get available time slots for a date

// Note: getTutorsBySubject() is implemented under Users API
```

### 6. Resources API

```typescript
// ❌ NOT IMPLEMENTED

// Planned endpoints:
// POST /api/v1/resources - Upload a resource (recording, guide, homework)
// GET /api/v1/resources - Get resources accessible to user
// GET /api/v1/resources/:id - Get resource details
// DELETE /api/v1/resources/:id - Delete a resource
```

### 7. Admin API

```typescript
// ⚠️ PARTIALLY IMPLEMENTED

// Basic user queries available through Users API:
// GET /api/v1/users/tutors/all - Get all tutors
// GET /api/v1/users/:id - Get user profile
// PATCH /api/v1/users/:id - Update user profile

// ❌ NOT IMPLEMENTED:
// Revenue statistics endpoints
// School management endpoints
// Bulk operations
// Analytics dashboards
// User approval workflows
```

### 8. Email Notifications API

```typescript
// ❌ NOT IMPLEMENTED

// Planned functionality:
// - Booking request emails to tutors
// - Booking confirmation emails to students
// - Lesson reminder emails (24hr before session)
// - Payment receipts
// - Weekly digests

// Note: Resend API key in .env.example but no implementation
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

## 📅 4-Week Implementation Plan (with Actual Progress)

### **Week 1: Foundation + Auth + Dashboard Shells** ✅ COMPLETED

**Days 1-2: Project Setup**
- ✅ Initialize React + Vite project with TypeScript (via Lovable)
- ✅ Configure Tailwind CSS + shadcn/ui
- ✅ Set up Firebase project (Auth, Firestore, Storage)
- ✅ Create environment variables
- ✅ Write README files (setup guides in tipu-api/docs/)
- ✅ Set up Express backend with TypeScript

**Days 3-4: Authentication**
- ✅ Firebase Auth integration (email/password)
- ✅ Registration flow with role selection
- ✅ Login/logout functionality
- ✅ Protected route middleware (frontend + backend JWT)
- ✅ User profile creation in Firestore
- ✅ AuthContext for state management

**Days 5-7: Dashboard Layouts**
- ✅ Create layout components (Navbar, Sidebar, DashboardLayout)
- ✅ Student dashboard
- ✅ Tutor dashboard
- ✅ Parent dashboard
- ✅ Admin dashboard
- ✅ Navigation and routing (React Router)

**Deliverables:**
- ✅ Working authentication
- ✅ 4 dashboard shells with navigation
- ✅ Firebase configured
- ✅ Documentation complete

---

### **Week 2: Booking System + Stripe Payments** ⚠️ MOSTLY COMPLETED

**Days 8-10: Booking Flow**
- ❌ Tutor availability management (calendar UI) - NOT IMPLEMENTED
- ✅ Booking creation flow (subject → tutor → time)
- ✅ Tutor browsing and selection
- ❌ TimeSlotPicker component - NOT NEEDED (no availability system)
- ✅ Booking request creation in Firestore
- ⚠️ Booking updates (using React Query polling, not real-time listeners)

**Days 11-12: Accept/Decline System**
- ✅ Tutor booking request list view (TutorRequests page)
- ✅ Accept booking (add meeting link)
- ✅ Decline booking with reason
- ⚠️ Notifications (in-app only, no email notifications)

**Days 13-14: Stripe Integration**
- ✅ Stripe account setup (test mode)
- ✅ Payment Intent API endpoint
- ✅ Checkout flow for bookings (PaymentForm component)
- ✅ Stripe webhook handler (payment.succeeded)
- ✅ Payment confirmation → booking confirmed
- ✅ Payment history view
- ✅ Stripe Connect for tutors (payout setup)

**Deliverables:**
- ✅ Complete booking flow (request → accept → confirm)
- ✅ Stripe payments working (test mode)
- ⚠️ Booking updates via polling (not real-time)
- ❌ Tutor availability calendar - NOT IMPLEMENTED

---

### **Week 3: Chat + Video + Resources** ⚠️ PARTIALLY COMPLETED

**Days 15-17: Chat System**
- ✅ Conversation creation logic
- ✅ Message sending/receiving (REST API with polling)
- ⚠️ Chat UI components exist but basic
- ✅ 18+ age verification for student chat
- ⚠️ Parent access to child chats (logic exists, UI unclear)
- ✅ Unread message counters
- ✅ File attachments support (fileUrl field)

**Days 18-19: Session Management**
- ✅ Meeting link input field (tutors)
- ❌ Session recording upload to Firebase Storage - NOT IMPLEMENTED
- ❌ Video player component - NOT IMPLEMENTED
- ✅ Lesson report form (post-session)
- ⚠️ Homework assignment (can be added in lesson report notes)

**Days 20-21: Resources**
- ❌ Resource upload (tutors/admins) - NOT IMPLEMENTED
- ❌ Firebase Storage integration - NOT IMPLEMENTED
- ❌ Resource library - NOT IMPLEMENTED
- ❌ Download functionality - NOT IMPLEMENTED
- ❌ Parent teaching guides section - NOT IMPLEMENTED

**Deliverables:**
- ⚠️ Chat with safeguarding (using polling, not real-time)
- ❌ Session recording upload/playback - NOT IMPLEMENTED
- ✅ Lesson reports functional
- ❌ Resource library - NOT IMPLEMENTED

---

### **Week 4: Parent Program + Admin + Launch** ⚠️ PARTIALLY COMPLETED

**Days 22-23: Parent Program**
- ❌ Weekly parent sessions schedule - NOT IMPLEMENTED
- ❌ Teaching guides library - NOT IMPLEMENTED
- ❌ "Ask a Tutor" messaging feature - NOT IMPLEMENTED (regular chat available)
- ❌ Parent learning materials upload - NOT IMPLEMENTED

**Days 24-25: Admin Back-office**
- ⚠️ User management (can view users, basic updates)
- ⚠️ Booking overview (admin can view bookings)
- ❌ Revenue dashboard (charts, stats) - NOT IMPLEMENTED
- ❌ School tracking - NOT IMPLEMENTED
- ❌ Export data functionality - NOT IMPLEMENTED

**Days 26-27: Email Notifications + Polish**
- ⚠️ Resend API key configured but NO implementation
- ❌ Booking request emails - NOT IMPLEMENTED
- ❌ Booking confirmation emails - NOT IMPLEMENTED
- ❌ Lesson reminder emails - NOT IMPLEMENTED
- ✅ Responsive design implemented
- ✅ Error handling and loading states (React Query)

**Day 28: Final Testing + Deployment**
- ✅ Security implemented (JWT, CORS, Helmet)
- ⚠️ Firestore rules file exists but not deployed
- ⚠️ Cross-browser testing (basic testing done)
- ✅ Mobile responsiveness implemented
- ⚠️ Frontend deployed to Lovable
- ❌ Backend not deployed to production
- ⚠️ Partial testing completed
- ❌ Not launched to production

**Deliverables:**
- ❌ Parent program features - NOT IMPLEMENTED
- ⚠️ Admin back-office (basic functionality only)
- ❌ Email notifications - NOT IMPLEMENTED
- ⚠️ Partial deployment (frontend only)
- ⚠️ Core features tested and working

---

## 🔐 Security Implementation

### Firestore Security Rules

**Location:** `tipu-api/firebase/firestore.rules`

**Key Principles:**
1. Users can only read/write their own data
2. Tutors can access bookings assigned to them
3. Parents can access their children's data
4. Admins have full access
5. Chat requires 18+ verification for students

See `tipu-api/firebase/firestore.rules` for complete implementation.

### API Security

**Location:** `tipu-api/src/middleware/auth.ts`

**All protected API routes enforce:**
1. Firebase JWT token verification (Authorization header)
2. User role-based authorization
3. Input validation with Zod schemas
4. Error handling with global error handler
5. Security logging with Winston

**Example (Express Route):**
```typescript
// tipu-api/src/routes/bookings.ts
import { authenticateUser } from '../middleware/auth';
import { z } from 'zod';

router.post('/:id/accept', authenticateUser, async (req, res, next) => {
  try {
    // 1. User already authenticated by middleware
    const user = req.user; // Populated by authenticateUser middleware

    // 2. Check role
    if (user.role !== 'tutor') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 3. Validate input
    const schema = z.object({
      meetingLink: z.string().url()
    });
    const { meetingLink } = schema.parse(req.body);

    // 4. Execute logic
    const booking = await bookingService.acceptBooking(
      req.params.id,
      user.uid,
      meetingLink
    );

    return res.status(200).json(booking);
  } catch (error) {
    next(error); // Global error handler
  }
});
```

### Stripe Security

1. **Webhook signature verification** (prevent fake payment events)
2. **Never expose secret keys** client-side
3. **Use Payment Intents** (not legacy Charges API)
4. **Implement idempotency keys** for payment retries

---

## 🚀 Deployment

### Environment Variables

**Frontend (tipu-app/.env):**
```bash
# Firebase (client-side config)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# API URL
VITE_API_URL=http://localhost:8888  # Development
# VITE_API_URL=https://api.tipuacademy.com  # Production

# Stripe (client-side publishable key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Backend (tipu-api/.env):**
```bash
# Server
PORT=8888
NODE_ENV=development

# Firebase Admin SDK (service account)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend - not yet implemented)
RESEND_API_KEY=re_...

# CORS allowed origins
ALLOWED_ORIGINS=http://localhost:5173,https://e85f917e-442a-4cd9-8b6c-ece9d8844a07.lovableproject.com
```

### Current Hosting

**Frontend:**
- Platform: Lovable
- URL: https://e85f917e-442a-4cd9-8b6c-ece9d8844a07.lovableproject.com
- Build: Vite production build
- Auto-deploy: Yes (Lovable platform)

**Backend:**
- Platform: Local development (port 8888)
- Production: Not yet deployed
- Recommended: Railway, Render, or AWS Elastic Beanstalk

### Deployment Checklist

**Frontend:**
- [x] Deployed to Lovable
- [x] Environment variables configured
- [ ] Custom domain configured
- [ ] Production API URL set

**Backend:**
- [ ] Deploy to production hosting
- [ ] Firebase project in production mode
- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Stripe live keys configured
- [ ] Stripe webhook endpoint configured (with public URL)
- [ ] Environment variables set
- [ ] CORS origins updated for production
- [ ] Winston logging configured for production
- [ ] Health check endpoint verified

**General:**
- [ ] Email service configured (Resend/SendGrid)
- [ ] SSL certificates configured
- [ ] Error tracking enabled (Sentry recommended)
- [ ] Analytics configured (optional)
- [ ] Test all critical flows in production
- [ ] Load testing completed
- [ ] Backup strategy implemented

---

## 🎯 Success Metrics & Progress

**Current MVP Status (~60-70% Complete):**

**✅ COMPLETED:**
- All 4 dashboards exist and functional
- End-to-end booking flow working (create → accept/decline → lesson report)
- Stripe payments operational (test mode, ready for production)
- Chat system with safeguarding (18+ verification)
- Lesson reports functional
- Mobile-responsive design
- Production-ready security (JWT, CORS, Helmet)
- Frontend deployed to Lovable
- API documentation complete (Swagger UI)

**⚠️ PARTIALLY COMPLETED:**
- Real-time chat (using polling, not real-time listeners)
- Admin back-office (dashboard exists, analytics incomplete)

**❌ NOT YET COMPLETED:**
- Session recording upload/playback (no Firebase Storage integration)
- Parent program materials (not implemented)
- Email notifications (Resend configured but no implementation)
- Tutor availability management
- Resource library
- Backend deployed to production
- Live Stripe keys configured

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
- **Vite Documentation:** https://vitejs.dev/guide/
- **React Router Documentation:** https://reactrouter.com/
- **TanStack Query (React Query):** https://tanstack.com/query/latest
- **Express.js Documentation:** https://expressjs.com/
- **shadcn/ui Components:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript Documentation:** https://www.typescriptlang.org/docs/

---

## 🆘 Troubleshooting

### Common Issues

**Firebase Auth not working:**
- Check authorized domains in Firebase Console (add localhost:5173 and Lovable domain)
- Verify API keys in tipu-app/.env (VITE_FIREBASE_*)
- Ensure Firebase SDK initialized correctly in tipu-app/src/lib/firebase/config.ts
- Check CORS configuration in tipu-api if API calls fail

**Stripe webhook not triggering:**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:8888/api/v1/payments/webhook`
- Verify webhook secret matches in tipu-api/.env
- Check webhook signature validation in tipu-api/src/routes/payments.ts
- Ensure webhook endpoint is publicly accessible (use ngrok for local testing)

**Firestore permission denied:**
- Check if Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Review security rules in tipu-api/firebase/firestore.rules
- Verify user authentication status (check JWT token)
- Verify role-based access logic in backend

**API CORS errors:**
- Check ALLOWED_ORIGINS in tipu-api/.env
- Ensure frontend URL is included (http://localhost:5173 and Lovable URL)
- Verify CORS middleware is configured in tipu-api/src/server.ts

**Chat not updating:**
- Current implementation uses React Query polling (not real-time)
- Check React Query refetch intervals
- Verify API endpoint responds correctly: GET /api/v1/messages/conversations/:id

**Backend not starting:**
- Check Firebase Admin SDK credentials in tipu-api/.env
- Ensure PORT 8888 is not already in use
- Verify all dependencies installed: `cd tipu-api && npm install`
- Check Winston logger configuration

---

## 👥 Team & Roles

**Development:** Ethan (using Lovable for AI-assisted development)
**Business Owner:** [Owner name]
**Target Users:** Homeschooling families, schools, lower-income families (parent program)

---

## 📞 Support & Documentation

For development questions, refer to:
- `tipu-api/docs/README.md` - Main setup guide
- `tipu-api/docs/SETUP.md` - Backend setup instructions
- `tipu-api/docs/API.md` - API endpoint documentation
- `tipu-api/docs/DATABASE.md` - Firestore database structure
- `tipu-api/docs/DEPLOYMENT.md` - Production deployment guide
- `tipu-api/openapi.yaml` - Complete OpenAPI 3.0 specification
- `http://localhost:8888/api-docs` - Interactive Swagger UI (when API running)

---

**Last Updated:** November 2025
**Version:** 0.7.0 (MVP in Progress - ~60-70% Complete)
**Status:** Active Development
