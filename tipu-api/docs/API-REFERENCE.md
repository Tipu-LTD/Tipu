# API Reference

Complete documentation for all API functions in TIPU Academy.

---

## Table of Contents

1. [Authentication API](#1-authentication-api)
2. [Booking API](#2-booking-api)
3. [Payment API](#3-payment-api)
4. [Chat API](#4-chat-api)
5. [Tutor API](#5-tutor-api)
6. [Resources API](#6-resources-api)
7. [Admin API](#7-admin-api)
8. [Notification API](#8-notification-api)

---

## 1. Authentication API

Location: `src/lib/api/users.ts`

### `registerUser()`

Register a new user with Firebase Authentication and create profile in Firestore.

**Signature:**
```typescript
function registerUser(
  email: string,
  password: string,
  role: UserRole,
  additionalData: Partial<User>
): Promise<User>
```

**Parameters:**
- `email` (string): User's email address
- `password` (string): Password (min 6 characters)
- `role` (UserRole): 'student' | 'tutor' | 'parent' | 'admin'
- `additionalData` (Partial<User>): Additional profile data (displayName, dateOfBirth, etc.)

**Returns:** Promise resolving to User object

**Example:**
```typescript
const user = await registerUser(
  'student@example.com',
  'password123',
  'student',
  {
    displayName: 'John Doe',
    dateOfBirth: new Date('2005-06-15'),
    enrolledSubjects: ['Maths', 'Physics']
  }
)
```

---

### `getUserProfile()`

Get user profile by UID.

**Signature:**
```typescript
function getUserProfile(uid: string): Promise<User>
```

**Parameters:**
- `uid` (string): Firebase Auth UID

**Returns:** Promise resolving to User object

**Example:**
```typescript
const user = await getUserProfile('abc123xyz')
```

---

### `updateUserProfile()`

Update user profile in Firestore.

**Signature:**
```typescript
function updateUserProfile(
  uid: string,
  updates: Partial<User>
): Promise<void>
```

**Parameters:**
- `uid` (string): Firebase Auth UID
- `updates` (Partial<User>): Fields to update

**Example:**
```typescript
await updateUserProfile('abc123xyz', {
  displayName: 'Jane Doe',
  photoURL: 'https://example.com/photo.jpg'
})
```

---

### `checkAge18Plus()`

Check if user is 18 or older (for chat eligibility).

**Signature:**
```typescript
function checkAge18Plus(uid: string): Promise<boolean>
```

**Parameters:**
- `uid` (string): Firebase Auth UID

**Returns:** Promise resolving to boolean (true if 18+, false otherwise)

**Example:**
```typescript
const isAdult = await checkAge18Plus('abc123xyz')
if (isAdult) {
  // Allow chat access
}
```

---

## 2. Booking API

Location: `src/lib/api/bookings.ts`

### `createBooking()`

Create a new booking request.

**Signature:**
```typescript
function createBooking(data: {
  studentId: string
  tutorId: string
  subject: Subject
  level: Level
  scheduledAt: Date
  price: number
  duration?: number
}): Promise<Booking>
```

**Parameters:**
- `data.studentId` (string): Student's user ID
- `data.tutorId` (string): Tutor's user ID
- `data.subject` (Subject): 'Maths' | 'Physics' | 'Computer Science' | 'Python'
- `data.level` (Level): 'GCSE' | 'A-Level'
- `data.scheduledAt` (Date): Lesson date/time
- `data.price` (number): Price in pence (e.g., 4500 = £45.00)
- `data.duration` (number, optional): Duration in minutes (default: 60)

**Returns:** Promise resolving to Booking object

**Example:**
```typescript
const booking = await createBooking({
  studentId: 'student123',
  tutorId: 'tutor456',
  subject: 'Maths',
  level: 'GCSE',
  scheduledAt: new Date('2024-12-25T10:00:00'),
  price: 4500, // £45.00
  duration: 60
})
```

---

### `acceptBooking()`

Tutor accepts a booking request.

**Signature:**
```typescript
function acceptBooking(
  bookingId: string,
  tutorId: string,
  meetingLink: string
): Promise<void>
```

**Parameters:**
- `bookingId` (string): Booking document ID
- `tutorId` (string): Tutor's user ID (for verification)
- `meetingLink` (string): Zoom/Google Meet URL

**Example:**
```typescript
await acceptBooking(
  'booking789',
  'tutor456',
  'https://zoom.us/j/123456789'
)
```

---

### `declineBooking()`

Tutor declines a booking request. Sends notification to other tutors teaching that subject.

**Signature:**
```typescript
function declineBooking(
  bookingId: string,
  tutorId: string,
  reason: string
): Promise<void>
```

**Parameters:**
- `bookingId` (string): Booking document ID
- `tutorId` (string): Tutor's user ID
- `reason` (string): Decline reason

**Example:**
```typescript
await declineBooking(
  'booking789',
  'tutor456',
  'Not available at this time'
)
```

---

### `getBookingsByUser()`

Get all bookings for a specific user (filtered by role).

**Signature:**
```typescript
function getBookingsByUser(
  userId: string,
  role: UserRole
): Promise<Booking[]>
```

**Parameters:**
- `userId` (string): User ID
- `role` (UserRole): User's role (affects filtering)

**Returns:** Promise resolving to array of Booking objects

**Example:**
```typescript
// For students: returns bookings where studentId matches
// For tutors: returns bookings where tutorId matches
const bookings = await getBookingsByUser('user123', 'student')
```

---

### `uploadSessionRecording()`

Upload session recording video to Firebase Storage.

**Signature:**
```typescript
function uploadSessionRecording(
  bookingId: string,
  file: File
): Promise<string>
```

**Parameters:**
- `bookingId` (string): Booking document ID
- `file` (File): Video file

**Returns:** Promise resolving to Firebase Storage download URL

**Example:**
```typescript
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const recordingUrl = await uploadSessionRecording('booking789', file)
// recordingUrl: 'https://firebasestorage.googleapis.com/...'
```

---

### `submitLessonReport()`

Tutor submits post-session lesson report.

**Signature:**
```typescript
function submitLessonReport(
  bookingId: string,
  report: LessonReport
): Promise<void>
```

**Parameters:**
- `bookingId` (string): Booking document ID
- `report` (LessonReport): Report object

**LessonReport Type:**
```typescript
interface LessonReport {
  topicsCovered: string
  homework?: string
  notes?: string
  completedAt: Timestamp
}
```

**Example:**
```typescript
await submitLessonReport('booking789', {
  topicsCovered: 'Quadratic equations, factoring',
  homework: 'Complete exercises 1-10 on page 45',
  notes: 'Student showing good progress',
  completedAt: new Date()
})
```

---

### `completeBooking()`

Mark a booking as completed.

**Signature:**
```typescript
function completeBooking(bookingId: string): Promise<void>
```

**Parameters:**
- `bookingId` (string): Booking document ID

**Example:**
```typescript
await completeBooking('booking789')
```

---

## 3. Payment API

Location: `src/lib/api/payments.ts`

### `createPaymentIntent()`

Create a Stripe Payment Intent for a booking.

**Signature:**
```typescript
function createPaymentIntent(
  bookingId: string,
  amount: number
): Promise<{clientSecret: string, paymentIntentId: string}>
```

**Parameters:**
- `bookingId` (string): Booking document ID
- `amount` (number): Amount in pence

**Returns:** Promise resolving to object with clientSecret and paymentIntentId

**Example:**
```typescript
const { clientSecret, paymentIntentId } = await createPaymentIntent(
  'booking789',
  4500 // £45.00
)
// Use clientSecret with Stripe Elements
```

---

### `confirmPayment()`

Confirm payment and update booking status. Called by webhook.

**Signature:**
```typescript
function confirmPayment(
  bookingId: string,
  paymentIntentId: string
): Promise<void>
```

**Parameters:**
- `bookingId` (string): Booking document ID
- `paymentIntentId` (string): Stripe Payment Intent ID

**Example:**
```typescript
// Called in webhook handler
await confirmPayment('booking789', 'pi_abc123')
```

---

### `getPaymentHistory()`

Get payment history for a user.

**Signature:**
```typescript
function getPaymentHistory(
  userId: string
): Promise<Payment[]>
```

**Parameters:**
- `userId` (string): User ID (parent or student)

**Returns:** Promise resolving to array of Payment objects

**Example:**
```typescript
const payments = await getPaymentHistory('user123')
```

---

### `createTutorConnectAccount()`

Create Stripe Connect account for tutor payouts.

**Signature:**
```typescript
function createTutorConnectAccount(
  tutorId: string
): Promise<{accountId: string, onboardingUrl: string}>
```

**Parameters:**
- `tutorId` (string): Tutor's user ID

**Returns:** Promise resolving to object with Stripe account ID and onboarding URL

**Example:**
```typescript
const { accountId, onboardingUrl } = await createTutorConnectAccount('tutor456')
// Redirect tutor to onboardingUrl to complete setup
window.location.href = onboardingUrl
```

---

## 4. Chat API

Location: `src/lib/api/messages.ts`

### `getOrCreateConversation()`

Get existing conversation or create new one between users.

**Signature:**
```typescript
function getOrCreateConversation(
  participantIds: string[]
): Promise<Conversation>
```

**Parameters:**
- `participantIds` (string[]): Array of user IDs (usually 2: student/parent + tutor)

**Returns:** Promise resolving to Conversation object

**Example:**
```typescript
const conversation = await getOrCreateConversation([
  'student123',
  'tutor456'
])
```

---

### `sendMessage()`

Send a message in a conversation.

**Signature:**
```typescript
function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  fileUrl?: string
): Promise<Message>
```

**Parameters:**
- `conversationId` (string): Conversation document ID
- `senderId` (string): Sender's user ID
- `text` (string): Message text
- `fileUrl` (string, optional): Attachment URL (e.g., homework file)

**Returns:** Promise resolving to Message object

**Example:**
```typescript
const message = await sendMessage(
  'conv123',
  'student123',
  'Hi, I have a question about quadratic equations'
)
```

---

### `getConversations()`

Get all conversations for a user.

**Signature:**
```typescript
function getConversations(
  userId: string
): Promise<Conversation[]>
```

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise resolving to array of Conversation objects

**Example:**
```typescript
const conversations = await getConversations('tutor456')
```

---

### `subscribeToMessages()`

Subscribe to real-time message updates in a conversation.

**Signature:**
```typescript
function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe
```

**Parameters:**
- `conversationId` (string): Conversation document ID
- `callback` (function): Function called with new messages

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = subscribeToMessages('conv123', (messages) => {
  console.log('New messages:', messages)
  setMessages(messages) // Update UI
})

// Later: cleanup
unsubscribe()
```

---

### `markAsRead()`

Mark messages as read for a user.

**Signature:**
```typescript
function markAsRead(
  conversationId: string,
  userId: string
): Promise<void>
```

**Parameters:**
- `conversationId` (string): Conversation document ID
- `userId` (string): User ID

**Example:**
```typescript
await markAsRead('conv123', 'student123')
```

---

## 5. Tutor API

Location: `src/lib/api/tutors.ts`

### `setAvailability()`

Set tutor's weekly availability.

**Signature:**
```typescript
function setAvailability(
  tutorId: string,
  slots: TimeSlot[]
): Promise<void>
```

**TimeSlot Type:**
```typescript
interface TimeSlot {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string // 'HH:mm' (e.g., '09:00')
  endTime: string   // 'HH:mm' (e.g., '17:00')
}
```

**Example:**
```typescript
await setAvailability('tutor456', [
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
  { dayOfWeek: 3, startTime: '10:00', endTime: '16:00' }, // Wednesday
  { dayOfWeek: 5, startTime: '13:00', endTime: '19:00' }  // Friday
])
```

---

### `getAvailableSlots()`

Get available time slots for a tutor on a specific date.

**Signature:**
```typescript
function getAvailableSlots(
  tutorId: string,
  date: Date
): Promise<TimeSlot[]>
```

**Parameters:**
- `tutorId` (string): Tutor's user ID
- `date` (Date): Target date

**Returns:** Promise resolving to array of available time slots

**Example:**
```typescript
const slots = await getAvailableSlots('tutor456', new Date('2024-12-25'))
// Returns available slots on Christmas 2024
```

---

### `getTutorsBySubject()`

Get all tutors who teach a specific subject.

**Signature:**
```typescript
function getTutorsBySubject(
  subject: Subject
): Promise<User[]>
```

**Parameters:**
- `subject` (Subject): 'Maths' | 'Physics' | 'Computer Science' | 'Python'

**Returns:** Promise resolving to array of User objects (tutors)

**Example:**
```typescript
const mathTutors = await getTutorsBySubject('Maths')
```

---

## 6. Resources API

Location: `src/lib/api/resources.ts`

### `uploadResource()`

Upload a teaching resource (recording, guide, homework).

**Signature:**
```typescript
function uploadResource(
  file: File,
  metadata: ResourceMetadata
): Promise<Resource>
```

**ResourceMetadata Type:**
```typescript
interface ResourceMetadata {
  title: string
  description?: string
  type: 'recording' | 'homework' | 'guide' | 'parent-material' | 'syllabus'
  subject: Subject
  level?: Level
  examBoard?: string
  uploadedBy: string // User ID
  isPublic: boolean
  studentIds?: string[] // If private
}
```

**Example:**
```typescript
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const resource = await uploadResource(file, {
  title: 'Quadratic Equations Worksheet',
  description: 'Practice problems for GCSE Maths',
  type: 'homework',
  subject: 'Maths',
  level: 'GCSE',
  examBoard: 'AQA',
  uploadedBy: 'tutor456',
  isPublic: true
})
```

---

### `getResourcesByStudent()`

Get all resources accessible to a student.

**Signature:**
```typescript
function getResourcesByStudent(
  studentId: string
): Promise<Resource[]>
```

**Parameters:**
- `studentId` (string): Student's user ID

**Returns:** Promise resolving to array of Resource objects

**Example:**
```typescript
const resources = await getResourcesByStudent('student123')
```

---

### `getParentMaterials()`

Get all parent teaching materials.

**Signature:**
```typescript
function getParentMaterials(): Promise<Resource[]>
```

**Returns:** Promise resolving to array of Resource objects (type: 'parent-material')

**Example:**
```typescript
const guides = await getParentMaterials()
```

---

## 7. Admin API

Location: `src/lib/api/admin.ts`

### `getAllUsers()`

Get all users (optionally filtered by role).

**Signature:**
```typescript
function getAllUsers(
  role?: UserRole
): Promise<User[]>
```

**Parameters:**
- `role` (UserRole, optional): Filter by role

**Returns:** Promise resolving to array of User objects

**Example:**
```typescript
const allStudents = await getAllUsers('student')
const allUsers = await getAllUsers() // No filter
```

---

### `getRevenueStats()`

Get revenue statistics for a date range.

**Signature:**
```typescript
function getRevenueStats(
  startDate: Date,
  endDate: Date
): Promise<RevenueStats>
```

**RevenueStats Type:**
```typescript
interface RevenueStats {
  totalRevenue: number
  totalBookings: number
  averageBookingValue: number
  revenueBySubject: { [subject: string]: number }
  revenueByLevel: { GCSE: number, 'A-Level': number }
}
```

**Example:**
```typescript
const stats = await getRevenueStats(
  new Date('2024-12-01'),
  new Date('2024-12-31')
)
console.log(`Total revenue in December: £${stats.totalRevenue / 100}`)
```

---

### `getAllBookings()`

Get all bookings (admin view).

**Signature:**
```typescript
function getAllBookings(): Promise<Booking[]>
```

**Returns:** Promise resolving to array of all Booking objects

**Example:**
```typescript
const allBookings = await getAllBookings()
```

---

### `getSchoolStudents()`

Get all students belonging to a specific school.

**Signature:**
```typescript
function getSchoolStudents(
  schoolId: string
): Promise<User[]>
```

**Parameters:**
- `schoolId` (string): School document ID

**Returns:** Promise resolving to array of User objects (students)

**Example:**
```typescript
const students = await getSchoolStudents('school123')
```

---

## 8. Notification API

Location: `src/pages/api/notifications/send-email.ts` (Next.js API route)

### `sendBookingRequestEmail()`

Send email to tutor when new booking request is received.

**Endpoint:** `POST /api/notifications/send-email`

**Request Body:**
```typescript
{
  type: 'booking_request'
  tutorEmail: string
  bookingDetails: {
    studentName: string
    subject: string
    level: string
    scheduledAt: string
    bookingId: string
  }
}
```

**Example:**
```typescript
await fetch('/api/notifications/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'booking_request',
    tutorEmail: 'tutor@example.com',
    bookingDetails: {
      studentName: 'John Doe',
      subject: 'Maths',
      level: 'GCSE',
      scheduledAt: '2024-12-25T10:00:00',
      bookingId: 'booking789'
    }
  })
})
```

---

### `sendBookingConfirmationEmail()`

Send email to student when booking is confirmed.

**Request Body:**
```typescript
{
  type: 'booking_confirmation'
  studentEmail: string
  bookingDetails: {
    tutorName: string
    subject: string
    level: string
    scheduledAt: string
    meetingLink: string
    bookingId: string
  }
}
```

---

### `sendLessonReminderEmail()`

Send reminder email 24 hours before lesson.

**Request Body:**
```typescript
{
  type: 'lesson_reminder'
  studentEmail: string
  bookingDetails: {
    tutorName: string
    subject: string
    scheduledAt: string
    meetingLink: string
  }
}
```

---

## 🔐 Authentication

All API functions require Firebase Authentication. Include auth token in requests:

```typescript
import { getAuth } from 'firebase/auth'

const user = getAuth().currentUser
const token = await user.getIdToken()

fetch('/api/some-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## ⚠️ Error Handling

All API functions may throw errors. Always wrap in try-catch:

```typescript
try {
  const booking = await createBooking(data)
} catch (error) {
  console.error('Failed to create booking:', error)
  // Handle error (show toast, etc.)
}
```

---

## 📚 Related Documentation

- [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) - Firestore collection schemas
- [SETUP-FIREBASE.md](./SETUP-FIREBASE.md) - Firebase configuration
- [SETUP-STRIPE.md](./SETUP-STRIPE.md) - Stripe integration

---

**Last Updated:** December 2024
