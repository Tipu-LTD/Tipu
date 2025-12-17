import { graphClient, organizerEmail } from '../config/microsoft'
import { logger } from '../config/logger'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { ApiError } from '../middleware/errorHandler'

interface CreateTeamsMeetingInput {
  bookingId: string
  subject: string
  startDateTime: Date
  endDateTime: Date
  studentEmail?: string
  tutorEmail?: string
}

interface TeamsMeetingResponse {
  joinUrl: string
  meetingId: string
  organizerEmail: string
}

/**
 * Retry helper function with exponential backoff
 * Retries a function up to maxRetries times with increasing delays
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1)

      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, {
        error: error.message,
        attempt,
        maxRetries,
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Create a Microsoft Teams meeting for a booking
 * Includes automatic retry logic (3 attempts with exponential backoff)
 */
export const createTeamsMeeting = async (
  input: CreateTeamsMeetingInput
): Promise<TeamsMeetingResponse> => {
  const { bookingId, subject, startDateTime, endDateTime, studentEmail, tutorEmail } = input

  logger.info('Creating Teams meeting', {
    bookingId,
    subject,
    startDateTime,
    endDateTime,
  })

  try {
    // Create the online meeting with retry logic
    const meeting = await retryWithBackoff(async () => {
      // Create online meeting using Microsoft Graph API
      const response = await graphClient
        .api(`/users/${organizerEmail}/onlineMeetings`)
        .post({
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          subject: subject,
          participants: {
            attendees: [
              ...(studentEmail
                ? [
                    {
                      identity: {
                        user: {
                          id: studentEmail,
                          displayName: 'Student',
                        },
                      },
                      upn: studentEmail,
                    },
                  ]
                : []),
              ...(tutorEmail
                ? [
                    {
                      identity: {
                        user: {
                          id: tutorEmail,
                          displayName: 'Tutor',
                        },
                      },
                      upn: tutorEmail,
                    },
                  ]
                : []),
            ],
          },
        })

      return response
    })

    const joinUrl = meeting.joinWebUrl
    const meetingId = meeting.id

    if (!joinUrl) {
      throw new ApiError('Failed to get meeting join URL from Teams API', 500)
    }

    logger.info('Teams meeting created successfully', {
      bookingId,
      meetingId,
      joinUrl,
    })

    // Update booking with meeting link
    await db.collection('bookings').doc(bookingId).update({
      meetingLink: joinUrl,
      teamsMeetingId: meetingId,
      updatedAt: FieldValue.serverTimestamp(),
    })

    logger.info('Booking updated with Teams meeting link', { bookingId })

    return {
      joinUrl,
      meetingId,
      organizerEmail,
    }
  } catch (error: any) {
    logger.error('Failed to create Teams meeting after retries', {
      bookingId,
      error: error.message,
      stack: error.stack,
    })

    throw new ApiError(
      `Failed to create Teams meeting: ${error.message}`,
      500
    )
  }
}

/**
 * Generate Teams meeting for a booking
 * Retrieves booking details from Firestore and creates a meeting
 * Idempotent - safe to call multiple times
 */
export const generateMeetingForBooking = async (
  bookingId: string
): Promise<TeamsMeetingResponse> => {
  // Get booking details
  const bookingDoc = await db.collection('bookings').doc(bookingId).get()

  if (!bookingDoc.exists) {
    throw new ApiError('Booking not found', 404)
  }

  const booking = bookingDoc.data()

  // Check if meeting already exists (idempotency)
  if (booking?.meetingLink) {
    logger.info('Meeting link already exists for booking', {
      bookingId,
      meetingLink: booking.meetingLink,
    })

    return {
      joinUrl: booking.meetingLink,
      meetingId: booking.teamsMeetingId || '',
      organizerEmail,
    }
  }

  // Get student and tutor emails
  const [studentDoc, tutorDoc] = await Promise.all([
    db.collection('users').doc(booking?.studentId).get(),
    db.collection('users').doc(booking?.tutorId).get(),
  ])

  const studentEmail = studentDoc.data()?.email
  const tutorEmail = tutorDoc.data()?.email

  // Calculate meeting duration (default 60 minutes)
  const duration = booking?.duration || 60
  const startDateTime = booking?.scheduledAt?.toDate() || new Date()
  const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000)

  // Create meeting subject
  const subject = `Tipu: ${booking?.subject} ${booking?.level} Lesson`

  // Create Teams meeting
  return await createTeamsMeeting({
    bookingId,
    subject,
    startDateTime,
    endDateTime,
    studentEmail,
    tutorEmail,
  })
}

/**
 * Delete a Teams meeting (for cancellations)
 */
export const deleteTeamsMeeting = async (
  meetingId: string
): Promise<void> => {
  try {
    await graphClient
      .api(`/users/${organizerEmail}/onlineMeetings/${meetingId}`)
      .delete()

    logger.info('Teams meeting deleted', { meetingId })
  } catch (error: any) {
    logger.error('Failed to delete Teams meeting', {
      meetingId,
      error: error.message,
    })
    throw new ApiError(`Failed to delete Teams meeting: ${error.message}`, 500)
  }
}
