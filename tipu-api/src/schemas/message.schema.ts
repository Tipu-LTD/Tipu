import { z } from 'zod'

/**
 * Create conversation schema
 * Validates conversation creation between two participants
 */
export const createConversationSchema = z.object({
  participantIds: z.array(
    z.string().min(1, 'Participant ID required')
  ).min(2, 'At least 2 participants required').max(2, 'Only 2 participants allowed'),
})

/**
 * Send message schema
 * Validates message content and optional file attachment
 */
export const sendMessageSchema = z.object({
  text: z.string()
    .min(1, 'Message text required')
    .max(5000, 'Message must not exceed 5000 characters'),
  fileUrl: z.string()
    .url('File URL must be a valid URL')
    .refine(
      (url) => url.startsWith('https://firebasestorage.googleapis.com/'),
      'File must be hosted on Firebase Storage'
    )
    .optional(),
})

/**
 * Mark messages as read schema
 */
export const markAsReadSchema = z.object({
  messageIds: z.array(z.string()).optional(), // Optional: if not provided, mark all as read
})
