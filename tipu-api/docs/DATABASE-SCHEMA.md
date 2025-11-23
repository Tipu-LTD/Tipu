# Database Schema

Complete Firestore database schema for TIPU Academy.

---

## Collections Overview

| Collection | Description | Document Count (Est.) |
|------------|-------------|----------------------|
| `users` | All user profiles (students, tutors, parents, admins) | 100-1000+ |
| `bookings` | Tutoring session bookings | 500-5000+ |
| `conversations` | Chat conversations | 50-500+ |
| `messages` | Chat messages (subcollection) | 1000-10000+ |
| `resources` | Teaching materials, recordings, guides | 100-1000+ |
| `tutor_availability` | Tutor weekly schedules | 10-100 |
| `schools` | School tracking | 5-50 |
| `syllabus_progress` | Student topic progress (Phase 2) | 100-1000+ |

---

## 1. users

**Purpose:** Store all user profiles for students, tutors, parents, and admins.

**Collection Path:** `/users/{userId}`

**Document ID:** Firebase Auth UID

### Schema

```typescript
{
  uid: string                          // Firebase Auth UID (same as document ID)
  email: string                        // Email address
  displayName: string                  // Full name
  role: 'student' | 'tutor' | 'parent' | 'admin'
  photoURL?: string                    // Profile photo URL (Firebase Storage)
  createdAt: Timestamp                 // Account creation date
  updatedAt: Timestamp                 // Last update date

  // Student-specific fields
  dateOfBirth?: Timestamp              // For 18+ chat eligibility check
  parentId?: string                    // Parent user ID (if under 18)
  schoolId?: string                    // School document ID
  enrolledSubjects?: string[]          // ['Maths', 'Physics']
  examBoards?: {                       // Exam board per subject
    [subject: string]: string          // e.g., { maths: 'AQA', physics: 'Edexcel' }
  }

  // Tutor-specific fields
  bio?: string                         // Tutor description
  subjects?: string[]                  // Subjects they teach
  hourlyRates?: {
    GCSE: number                       // Price in pence (default: 4500)
    'A-Level': number                  // Price in pence (default: 6000)
  }
  isApproved?: boolean                 // Admin approval status
  dbsVerified?: boolean                // DBS check status

  // Parent-specific fields
  childrenIds?: string[]               // Array of student user IDs

  // Payment fields
  stripeCustomerId?: string            // Stripe Customer ID (parents/students)
  stripeConnectId?: string             // Stripe Connect ID (tutors for payouts)
}
```

### Example Document

```json
{
  "uid": "abc123xyz",
  "email": "student@example.com",
  "displayName": "John Doe",
  "role": "student",
  "photoURL": "https://firebasestorage.googleapis.com/.../profile.jpg",
  "createdAt": "2024-12-01T10:00:00Z",
  "updatedAt": "2024-12-15T14:30:00Z",
  "dateOfBirth": "2005-06-15T00:00:00Z",
  "enrolledSubjects": ["Maths", "Physics"],
  "examBoards": {
    "Maths": "AQA",
    "Physics": "Edexcel"
  },
  "stripeCustomerId": "cus_abc123"
}
```

### Indexes

- `role` (ASC)
- `email` (ASC)
- `role` (ASC) + `createdAt` (DESC)

### Security Rules

- Users can read their own profile
- Parents can read their children's profiles
- Admins can read all profiles
- Users can update their own profile
- Only admins can delete profiles

---

## 2. bookings

**Purpose:** Store tutoring session bookings with status tracking.

**Collection Path:** `/bookings/{bookingId}`

**Document ID:** Auto-generated

### Schema

```typescript
{
  id: string                           // Auto-generated document ID
  studentId: string                    // Student user ID
  tutorId: string                      // Tutor user ID
  subject: 'Maths' | 'Physics' | 'Computer Science' | 'Python'
  level: 'GCSE' | 'A-Level'
  scheduledAt: Timestamp               // Lesson date and time
  duration: number                     // Duration in minutes (default: 60)
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined'
  price: number                        // Price in pence (e.g., 4500 = £45.00)
  isPaid: boolean                      // Payment status
  paymentIntentId?: string             // Stripe Payment Intent ID

  // Session details
  meetingLink?: string                 // Zoom/Google Meet URL (added by tutor)
  recordingUrl?: string                // Firebase Storage URL for recording

  // Lesson report (completed by tutor after session)
  lessonReport?: {
    topicsCovered: string              // Topics taught
    homework?: string                  // Homework assigned
    notes?: string                     // Additional notes for student
    completedAt: Timestamp             // When report was completed
  }

  // Decline tracking
  declineReason?: string               // Reason if tutor declined

  createdAt: Timestamp                 // Booking creation date
  updatedAt: Timestamp                 // Last update date
}
```

### Example Document

```json
{
  "id": "booking789",
  "studentId": "abc123xyz",
  "tutorId": "tutor456",
  "subject": "Maths",
  "level": "GCSE",
  "scheduledAt": "2024-12-25T10:00:00Z",
  "duration": 60,
  "status": "confirmed",
  "price": 4500,
  "isPaid": true,
  "paymentIntentId": "pi_abc123",
  "meetingLink": "https://zoom.us/j/123456789",
  "recordingUrl": "https://firebasestorage.googleapis.com/.../recording.mp4",
  "lessonReport": {
    "topicsCovered": "Quadratic equations, factoring",
    "homework": "Complete exercises 1-10 on page 45",
    "notes": "Student showing good progress",
    "completedAt": "2024-12-25T11:00:00Z"
  },
  "createdAt": "2024-12-20T09:00:00Z",
  "updatedAt": "2024-12-25T11:00:00Z"
}
```

### Indexes

- `studentId` (ASC) + `scheduledAt` (DESC)
- `tutorId` (ASC) + `scheduledAt` (DESC)
- `status` (ASC) + `scheduledAt` (ASC)
- `scheduledAt` (ASC)

### Security Rules

- Students can read their own bookings
- Tutors can read bookings assigned to them
- Parents can read their children's bookings
- Admins can read all bookings
- Only students can create bookings
- Tutors can update bookings (accept/decline, add lesson report)

---

## 3. conversations

**Purpose:** Store chat conversations between users.

**Collection Path:** `/conversations/{conversationId}`

**Document ID:** Auto-generated

### Schema

```typescript
{
  id: string                           // Auto-generated document ID
  participantIds: string[]             // [studentId/parentId, tutorId]
  lastMessage?: {                      // Cache of last message for UI
    text: string
    senderId: string
    timestamp: Timestamp
  }
  unreadCount?: {                      // Unread message count per user
    [userId: string]: number           // e.g., { "abc123": 3, "tutor456": 0 }
  }
  createdAt: Timestamp                 // Conversation creation date
  updatedAt: Timestamp                 // Last message timestamp
}
```

### Example Document

```json
{
  "id": "conv123",
  "participantIds": ["abc123xyz", "tutor456"],
  "lastMessage": {
    "text": "See you tomorrow at 10am!",
    "senderId": "tutor456",
    "timestamp": "2024-12-24T15:30:00Z"
  },
  "unreadCount": {
    "abc123xyz": 1,
    "tutor456": 0
  },
  "createdAt": "2024-12-01T10:00:00Z",
  "updatedAt": "2024-12-24T15:30:00Z"
}
```

### Indexes

- `participantIds` (ARRAY_CONTAINS) + `updatedAt` (DESC)

### Security Rules

- Users can only read conversations they're a participant in
- Users can create conversations
- Users can update conversations they're part of (for unread counts)

---

## 4. messages

**Purpose:** Store individual chat messages within conversations.

**Collection Path:** `/conversations/{conversationId}/messages/{messageId}`

**Document ID:** Auto-generated

**Note:** This is a subcollection of `conversations`

### Schema

```typescript
{
  id: string                           // Auto-generated document ID
  senderId: string                     // User ID of sender
  text: string                         // Message text
  fileUrl?: string                     // Attachment URL (homework files, etc.)
  timestamp: Timestamp                 // Message sent time
  read: boolean                        // Whether message has been read
}
```

### Example Document

```json
{
  "id": "msg789",
  "senderId": "abc123xyz",
  "text": "Hi, I have a question about quadratic equations",
  "timestamp": "2024-12-24T14:00:00Z",
  "read": true
}
```

### Indexes

- `timestamp` (ASC)

### Security Rules

- Users can read messages in conversations they're part of
- Only conversation participants can send messages
- Students under 18 cannot send messages (enforced at app level + rules)

---

## 5. resources

**Purpose:** Store teaching materials, recordings, guides, and homework.

**Collection Path:** `/resources/{resourceId}`

**Document ID:** Auto-generated

### Schema

```typescript
{
  id: string                           // Auto-generated document ID
  title: string                        // Resource title
  description?: string                 // Resource description
  type: 'recording' | 'homework' | 'guide' | 'parent-material' | 'syllabus'
  subject: 'Maths' | 'Physics' | 'Computer Science' | 'Python' | 'General'
  level?: 'GCSE' | 'A-Level'          // Optional for general resources
  examBoard?: string                   // 'AQA', 'Edexcel', 'OCR', etc.
  fileUrl: string                      // Firebase Storage URL
  uploadedBy: string                   // User ID (tutor or admin)
  isPublic: boolean                    // Public vs student-specific
  studentIds?: string[]                // If private, which students can access
  createdAt: Timestamp                 // Upload date
}
```

### Example Document

```json
{
  "id": "resource123",
  "title": "Quadratic Equations Worksheet",
  "description": "Practice problems for GCSE Maths",
  "type": "homework",
  "subject": "Maths",
  "level": "GCSE",
  "examBoard": "AQA",
  "fileUrl": "https://firebasestorage.googleapis.com/.../worksheet.pdf",
  "uploadedBy": "tutor456",
  "isPublic": true,
  "createdAt": "2024-12-01T10:00:00Z"
}
```

### Indexes

- `subject` (ASC) + `level` (ASC) + `createdAt` (DESC)
- `type` (ASC) + `isPublic` (ASC)
- `uploadedBy` (ASC) + `createdAt` (DESC)

### Security Rules

- All authenticated users can read public resources
- Students can read resources assigned to them
- Tutors and admins can create/update resources
- Only admins can delete resources

---

## 6. tutor_availability

**Purpose:** Store tutor weekly availability schedules.

**Collection Path:** `/tutor_availability/{tutorId}`

**Document ID:** Tutor user ID

### Schema

```typescript
{
  id: string                           // Document ID = tutor user ID
  tutorId: string                      // Tutor user ID (same as document ID)
  slots: Array<{
    dayOfWeek: number                  // 0-6 (Sunday-Saturday)
    startTime: string                  // 'HH:mm' format (e.g., '09:00')
    endTime: string                    // 'HH:mm' format (e.g., '17:00')
  }>
  blockedDates?: Timestamp[]           // Holiday/unavailable dates
  updatedAt: Timestamp                 // Last update
}
```

### Example Document

```json
{
  "id": "tutor456",
  "tutorId": "tutor456",
  "slots": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": 3,
      "startTime": "10:00",
      "endTime": "16:00"
    },
    {
      "dayOfWeek": 5,
      "startTime": "13:00",
      "endTime": "19:00"
    }
  ],
  "blockedDates": [
    "2024-12-25T00:00:00Z",
    "2024-12-26T00:00:00Z"
  ],
  "updatedAt": "2024-12-20T10:00:00Z"
}
```

### Indexes

- `tutorId` (ASC)

### Security Rules

- All authenticated users can read availability
- Only the tutor can update their own availability
- Admins can update any tutor's availability

---

## 7. schools

**Purpose:** Track school partnerships and student assignments.

**Collection Path:** `/schools/{schoolId}`

**Document ID:** Auto-generated

### Schema

```typescript
{
  id: string                           // Auto-generated document ID
  name: string                         // School name
  contactEmail?: string                // School contact email
  contactPhone?: string                // School contact phone
  studentIds: string[]                 // Array of student user IDs
  createdAt: Timestamp                 // School added date
}
```

### Example Document

```json
{
  "id": "school123",
  "name": "St. Mary's Secondary School",
  "contactEmail": "admin@stmarys.edu",
  "contactPhone": "020 1234 5678",
  "studentIds": ["student1", "student2", "student3"],
  "createdAt": "2024-12-01T10:00:00Z"
}
```

### Indexes

- `name` (ASC)

### Security Rules

- Only admins can read/write school data

---

## 8. syllabus_progress

**Purpose:** Track student progress through syllabus topics (Phase 2 feature).

**Collection Path:** `/syllabus_progress/{progressId}`

**Document ID:** Auto-generated (one per student per subject)

### Schema

```typescript
{
  id: string                           // Auto-generated document ID
  studentId: string                    // Student user ID
  subject: 'Maths' | 'Physics' | 'Computer Science' | 'Python'
  examBoard: string                    // 'AQA', 'Edexcel', 'OCR', etc.
  topics: {
    [topicId: string]: {
      name: string                     // Topic name
      completed: boolean               // Completion status
      lastCovered?: Timestamp          // When last taught (from lesson report)
    }
  }
  updatedAt: Timestamp                 // Last update
}
```

### Example Document

```json
{
  "id": "progress123",
  "studentId": "abc123xyz",
  "subject": "Maths",
  "examBoard": "AQA",
  "topics": {
    "algebra_quadratics": {
      "name": "Quadratic Equations",
      "completed": true,
      "lastCovered": "2024-12-25T10:00:00Z"
    },
    "algebra_factoring": {
      "name": "Factoring",
      "completed": false
    }
  },
  "updatedAt": "2024-12-25T11:00:00Z"
}
```

### Indexes

- `studentId` (ASC) + `subject` (ASC)

### Security Rules

- Students can read their own progress
- Parents can read their children's progress
- Tutors can update progress
- Admins have full access

---

## Data Relationships

### User → Bookings
- One user can have many bookings
- `users.uid` → `bookings.studentId` or `bookings.tutorId`

### User → Conversations
- One user can have many conversations
- `users.uid` → `conversations.participantIds[]`

### Conversation → Messages
- One conversation has many messages (subcollection)
- `/conversations/{conversationId}/messages/{messageId}`

### User → Resources
- Tutors upload resources
- Students access resources
- `users.uid` → `resources.uploadedBy`
- `users.uid` → `resources.studentIds[]`

### Parent → Children
- One parent can have multiple children
- `users.childrenIds[]` → `users.uid`

### Tutor → Availability
- One tutor has one availability document
- `users.uid` → `tutor_availability.tutorId`

### School → Students
- One school has many students
- `schools.studentIds[]` → `users.uid`

---

## Migration Path

Since the database is starting from scratch:

1. **Week 1:** Create `users` collection during auth implementation
2. **Week 2:** Create `bookings`, `tutor_availability` collections
3. **Week 3:** Create `conversations`, `messages`, `resources` collections
4. **Week 4:** Create `schools` collection
5. **Phase 2:** Create `syllabus_progress` collection

---

## Backup Strategy

**Firestore Automatic Backups:**
- Enable daily automatic exports in Firebase Console
- Export location: Cloud Storage bucket
- Retention: 30 days

**Manual Backups:**
```bash
gcloud firestore export gs://[BUCKET_NAME]/[EXPORT_FOLDER]
```

---

## Performance Optimization

1. **Use composite indexes** for common queries
2. **Denormalize data** where appropriate (e.g., lastMessage in conversations)
3. **Use subcollections** for one-to-many relationships (messages)
4. **Limit query results** with pagination
5. **Cache frequently accessed data** client-side

---

## Related Documentation

- [API-REFERENCE.md](./API-REFERENCE.md) - How to query these collections
- [SETUP-FIREBASE.md](./SETUP-FIREBASE.md) - Firebase configuration
- [CLAUDE.MD](../CLAUDE.MD) - Complete implementation guide

---

**Last Updated:** December 2024
