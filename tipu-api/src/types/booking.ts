import { Timestamp } from 'firebase-admin/firestore'
import { Subject, Level } from './user'

export type BookingStatus = 'pending' | 'accepted' | 'confirmed' | 'completed' | 'cancelled' | 'declined'

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
  recordingUrl?: string
  lessonReport?: LessonReport
  declineReason?: string
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
  topicsCovered: string
  homework?: string
  notes?: string
}
