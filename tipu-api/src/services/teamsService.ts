import { graphClient, organizerUserId, organizerEmail } from '../config/microsoft'
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

  logger.info('🔄 [TEAMS DEBUG] Starting retry logic', {
    maxRetries,
    baseDelay,
  })

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`🎯 [TEAMS DEBUG] Attempt ${attempt}/${maxRetries}`, {
        attempt,
        maxRetries,
      })

      const result = await fn()

      logger.info(`✅ [TEAMS DEBUG] Attempt ${attempt} succeeded`, {
        attempt,
      })

      return result
    } catch (error: any) {
      lastError = error

      logger.error(`❌ [TEAMS DEBUG] Attempt ${attempt} failed`, {
        attempt,
        maxRetries,
        error: error.message,
        errorType: error.constructor.name,
        statusCode: error.statusCode || error.status,
        errorCode: error.code,
        errorStack: error.stack,
      })

      if (attempt === maxRetries) {
        logger.error('🛑 [TEAMS DEBUG] All retry attempts exhausted', {
          totalAttempts: maxRetries,
          finalError: error.message,
        })
        break
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1)

      logger.warn(`⏳ [TEAMS DEBUG] Retrying in ${delay}ms...`, {
        error: error.message,
        attempt,
        maxRetries,
        nextAttempt: attempt + 1,
        delay,
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

  logger.info('🎬 [TEAMS DEBUG] createTeamsMeeting called', {
    bookingId,
    subject,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    studentEmail: studentEmail || '(none)',
    tutorEmail: tutorEmail || '(none)',
  })

  // Build request body for debugging
  const requestBody = {
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    subject: subject,
    // Note: No participants field - Teams meetings work without pre-specified participants
    // With lobbyBypassSettings.scope='everyone', anyone with the link can join
  }

  logger.info('📤 [TEAMS DEBUG] Microsoft Graph API request', {
    endpoint: `/users/${organizerUserId}/onlineMeetings`,
    method: 'POST',
    organizerUserId,
    organizerEmail,
    requestBody: JSON.stringify(requestBody, null, 2),
  })

  try {
    // Create the online meeting with retry logic
    const meeting = await retryWithBackoff(async () => {
      logger.info('📞 [TEAMS DEBUG] Calling Microsoft Graph API', {
        timestamp: new Date().toISOString(),
      })

      // Create online meeting directly
      // Using Online Meetings API for full control over lobby settings
      const onlineMeetingRequest = {
        startDateTime: requestBody.startDateTime,
        endDateTime: requestBody.endDateTime,
        subject: requestBody.subject,

        // Note: No participants field - Teams meetings work without pre-specified participants
        // With lobbyBypassSettings.scope='everyone', anyone with the link can join

        // CRITICAL: Lobby bypass settings - allow everyone to bypass lobby
        // This enables meetings to start without the organizer being present
        lobbyBypassSettings: {
          scope: 'everyone',              // All participants can join directly
          isDialInBypassEnabled: true     // Phone dial-in users also bypass
        },

        // Meeting permissions
        allowedPresenters: 'everyone',     // All participants can present
        allowMeetingChat: 'enabled',       // Enable chat
        allowTeamworkReactions: true,      // Enable reactions

        // Disable announcements
        isEntryExitAnnounced: false,       // No join/leave sounds

        // Additional settings
        allowAttendeeToEnableCamera: true,
        allowAttendeeToEnableMic: true,
        allowParticipantsToChangeName: false,
        allowWhiteboard: true  // Enable Microsoft Whiteboard for tutors
      }

      logger.info('📅 [TEAMS DEBUG] Creating online meeting directly', {
        endpoint: `/users/${organizerUserId}/onlineMeetings`,
        onlineMeetingRequest: JSON.stringify(onlineMeetingRequest, null, 2),
      })

      const response = await graphClient
        .api(`/users/${organizerUserId}/onlineMeetings`)
        .post(onlineMeetingRequest)

      logger.info('📥 [TEAMS DEBUG] Microsoft Graph API response received', {
        responseKeys: Object.keys(response || {}),
        hasJoinWebUrl: !!response?.joinWebUrl,
        hasId: !!response?.id,
        fullResponse: JSON.stringify(response, null, 2),
      })

      // Extract meeting link from online meeting response
      return {
        joinWebUrl: response.joinWebUrl,
        id: response.id,
        ...response
      }
    })

    const joinUrl = meeting.joinWebUrl
    const meetingId = meeting.id

    logger.info('✅ [TEAMS DEBUG] Teams meeting data extracted', {
      joinUrl: joinUrl || '(missing)',
      meetingId: meetingId || '(missing)',
      meetingKeys: Object.keys(meeting || {}),
    })

    if (!joinUrl) {
      logger.error('❌ [TEAMS DEBUG] No joinWebUrl in response', {
        meeting: JSON.stringify(meeting, null, 2),
      })
      throw new ApiError('Failed to get meeting join URL from Teams API', 500)
    }

    logger.info('💾 [TEAMS DEBUG] Updating Firestore with meeting link', {
      bookingId,
      meetingLink: joinUrl,
      teamsMeetingId: meetingId,
    })

    // Update booking with meeting link
    await db.collection('bookings').doc(bookingId).update({
      meetingLink: joinUrl,
      teamsMeetingId: meetingId,
      updatedAt: FieldValue.serverTimestamp(),
    })

    logger.info('✅ [TEAMS DEBUG] Firestore updated successfully', {
      bookingId,
      collection: 'bookings',
    })

    const result = {
      joinUrl,
      meetingId,
      organizerEmail,
    }

    logger.info('🎉 [TEAMS DEBUG] createTeamsMeeting completed successfully', {
      bookingId,
      result,
    })

    return result
  } catch (error: any) {
    logger.error('💥 [TEAMS DEBUG] createTeamsMeeting failed after all retries', {
      bookingId,
      error: {
        message: error.message,
        type: error.constructor.name,
        statusCode: error.statusCode || error.status,
        code: error.code,
        stack: error.stack,
        fullError: JSON.stringify(error, null, 2),
      },
      graphClientInitialized: !!graphClient,
      organizerUserId,
      organizerEmail,
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
  logger.info('🚀 [TEAMS DEBUG] generateMeetingForBooking called', {
    bookingId,
    timestamp: new Date().toISOString(),
  })

  // Get booking details
  logger.info('🔍 [TEAMS DEBUG] Fetching booking from Firestore', { bookingId })
  const bookingDoc = await db.collection('bookings').doc(bookingId).get()

  if (!bookingDoc.exists) {
    logger.error('❌ [TEAMS DEBUG] Booking not found in Firestore', { bookingId })
    throw new ApiError('Booking not found', 404)
  }

  const booking = bookingDoc.data()
  logger.info('✅ [TEAMS DEBUG] Booking retrieved successfully', {
    bookingId,
    booking: {
      studentId: booking?.studentId,
      tutorId: booking?.tutorId,
      subject: booking?.subject,
      level: booking?.level,
      scheduledAt: booking?.scheduledAt?.toDate()?.toISOString(),
      duration: booking?.duration,
      status: booking?.status,
      isPaid: booking?.isPaid,
      meetingLink: booking?.meetingLink ? '(exists)' : '(none)',
    },
  })

  // Check if meeting already exists (idempotency)
  if (booking?.meetingLink) {
    logger.info('⚠️ [TEAMS DEBUG] Meeting link already exists for booking', {
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
  logger.info('🔍 [TEAMS DEBUG] Fetching student and tutor emails', {
    studentId: booking?.studentId,
    tutorId: booking?.tutorId,
  })

  const [studentDoc, tutorDoc] = await Promise.all([
    db.collection('users').doc(booking?.studentId).get(),
    db.collection('users').doc(booking?.tutorId).get(),
  ])

  const studentEmail = studentDoc.data()?.email
  const tutorEmail = tutorDoc.data()?.email

  logger.info('✅ [TEAMS DEBUG] User emails retrieved', {
    studentEmail: studentEmail || '(not found)',
    tutorEmail: tutorEmail || '(not found)',
    studentDocExists: studentDoc.exists,
    tutorDocExists: tutorDoc.exists,
  })

  // Calculate meeting duration (default 60 minutes)
  const duration = booking?.duration || 60
  const startDateTime = booking?.scheduledAt?.toDate() || new Date()
  const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000)

  // Create meeting subject
  const subject = `Tipu: ${booking?.subject} ${booking?.level} Lesson`

  logger.info('📅 [TEAMS DEBUG] Prepared meeting details', {
    subject,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    duration,
  })

  // Create Teams meeting
  logger.info('🎯 [TEAMS DEBUG] Calling createTeamsMeeting', { bookingId })
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
    // Using Object ID instead of email to avoid 404 errors
    await graphClient
      .api(`/users/${organizerUserId}/onlineMeetings/${meetingId}`)
      .delete()

    logger.info('Teams meeting deleted', { meetingId, organizerUserId })
  } catch (error: any) {
    logger.error('Failed to delete Teams meeting', {
      meetingId,
      organizerUserId,
      error: error.message,
    })
    throw new ApiError(`Failed to delete Teams meeting: ${error.message}`, 500)
  }
}
