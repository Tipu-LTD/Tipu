import { Timestamp } from 'firebase-admin/firestore'
import { Subject, Level } from './user'

export type BookingStatus = 'pending' | 'accepted' | 'confirmed' | 'completed' | 'cancelled' | 'declined' | 'tutor-suggested'

export interface LessonReport {
  topicsCovered: string
  homework?: string
  notes?: string
  completedAt: Timestamp
}

export interface Booking {
  id: string
  studentId: string
  tutorId: string
  subject: Subject
  level: Level
  scheduledAt: Timestamp
  duration: number
  status: BookingStatus
  price: number
  isPaid: boolean
  paymentIntentId?: string
  meetingLink?: string
  teamsMeetingId?: string
  recordingUrl?: string
  lessonReport?: LessonReport
  declineReason?: string

  // Tutor-initiated booking fields
  initiatedBy?: 'student' | 'parent' | 'tutor'
  suggestedAt?: Timestamp
  approvedBy?: string  // Parent UID who approved
  approvedAt?: Timestamp
  tutorNotes?: string  // Notes from tutor when suggesting

  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateBookingInput {
  studentId: string
  tutorId: string
  subject: Subject
  level: Level
  scheduledAt: Date
  price: number
  duration?: number
}

export interface AcceptBookingInput {
  bookingId: string
  tutorId: string
  // meetingLink will be added after payment via Teams integration
}

export interface DeclineBookingInput {
  bookingId: string
  tutorId: string
  reason: string
}

export interface SubmitLessonReportInput {
  bookingId: string
  tutorId: string  // Required for authorization
  topicsCovered: string
  homework?: string
  notes?: string
}

export interface SuggestLessonInput {
  studentId: string
  subject: Subject
  level: Level
  scheduledAt: Date
  duration?: number
  notes?: string  // Optional notes for parent
}

export interface ApproveSuggestionInput {
  bookingId: string
  parentId: string
}
