import { z } from 'zod'

/**
 * Validation schemas for booking-related API endpoints
 */

export const createBookingSchema = z.object({
  tutorId: z.string().min(1, 'Tutor ID required'),
  studentId: z.string().min(1, 'Student ID required').optional(), // Optional for parents
  subject: z.enum(['Maths', 'Physics', 'Computer Science', 'Python'], {
    errorMap: () => ({ message: 'Subject must be Maths, Physics, Computer Science, or Python' }),
  }),
  level: z.enum(['GCSE', 'A-Level'], {
    errorMap: () => ({ message: 'Level must be GCSE or A-Level' }),
  }),
  scheduledAt: z.string().datetime('Invalid datetime format'),
  price: z.number().int().positive('Price must be a positive integer'),
  duration: z.number().int().min(15, 'Duration must be at least 15 minutes').max(300, 'Duration cannot exceed 300 minutes').optional(),
})

export const lessonReportSchema = z.object({
  topicsCovered: z.string().min(10, 'Topics covered must be at least 10 characters'),
  homework: z.string().optional(),
  notes: z.string().optional(),
})

export const acceptBookingSchema = z.object({
  meetingLink: z.string().url('Meeting link must be a valid URL').optional(), // Optional since Teams generates it
})

export const declineBookingSchema = z.object({
  reason: z.string().min(10, 'Decline reason must be at least 10 characters'),
})
