import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { Conversation, Message, SendMessageInput, CreateConversationInput } from '../types/message'
import { ApiError } from '../middleware/errorHandler'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Create a new conversation
 */
export const createConversation = async (
  input: CreateConversationInput
): Promise<Conversation> => {
  // Check if conversation already exists between these participants
  const existingSnapshot = await db
    .collection('conversations')
    .where('participantIds', '==', input.participantIds)
    .limit(1)
    .get()

  if (!existingSnapshot.empty) {
    return existingSnapshot.docs[0].data() as Conversation
  }

  const conversationRef = db.collection('conversations').doc()

  const conversation: Conversation = {
    id: conversationRef.id,
    participantIds: input.participantIds,
    unreadCount: {},
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  }

  // Initialize unread count for each participant
  input.participantIds.forEach((id) => {
    conversation.unreadCount![id] = 0
  })

  await conversationRef.set(conversation)

  logger.info(`Conversation created: ${conversationRef.id}`)

  return conversation
}

/**
 * Get conversation by ID
 */
export const getConversationById = async (conversationId: string): Promise<Conversation> => {
  const conversationDoc = await db.collection('conversations').doc(conversationId).get()

  if (!conversationDoc.exists) {
    throw new ApiError('Conversation not found', 404)
  }

  return conversationDoc.data() as Conversation
}

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  const snapshot = await db
    .collection('conversations')
    .where('participantIds', 'array-contains', userId)
    .orderBy('updatedAt', 'desc')
    .get()

  return snapshot.docs.map((doc) => doc.data() as Conversation)
}

/**
 * Send a message in a conversation
 */
export const sendMessage = async (input: SendMessageInput): Promise<Message> => {
  const conversationRef = db.collection('conversations').doc(input.conversationId)
  const conversation = await conversationRef.get()

  if (!conversation.exists) {
    throw new ApiError('Conversation not found', 404)
  }

  const conversationData = conversation.data() as Conversation

  // Check if sender is a participant
  if (!conversationData.participantIds.includes(input.senderId)) {
    throw new ApiError('User is not a participant in this conversation', 403)
  }

  // Create message
  const messageRef = conversationRef.collection('messages').doc()

  const message: Message = {
    id: messageRef.id,
    senderId: input.senderId,
    text: input.text,
    fileUrl: input.fileUrl,
    timestamp: FieldValue.serverTimestamp() as any,
    read: false,
  }

  await messageRef.set(message)

  // Update conversation with last message and unread counts
  const unreadCount = { ...conversationData.unreadCount }
  conversationData.participantIds.forEach((participantId) => {
    if (participantId !== input.senderId) {
      unreadCount[participantId] = (unreadCount[participantId] || 0) + 1
    }
  })

  await conversationRef.update({
    lastMessage: {
      text: input.text,
      senderId: input.senderId,
      timestamp: FieldValue.serverTimestamp(),
    },
    unreadCount,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`Message sent in conversation: ${input.conversationId}`)

  return message
}

/**
 * Get messages in a conversation
 */
export const getConversationMessages = async (
  conversationId: string
): Promise<Message[]> => {
  const snapshot = await db
    .collection('conversations')
    .doc(conversationId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .get()

  return snapshot.docs.map((doc) => doc.data() as Message)
}

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  const conversationRef = db.collection('conversations').doc(conversationId)
  const conversation = await conversationRef.get()

  if (!conversation.exists) {
    throw new ApiError('Conversation not found', 404)
  }

  const conversationData = conversation.data() as Conversation

  // Reset unread count for this user
  const unreadCount = { ...conversationData.unreadCount }
  unreadCount[userId] = 0

  await conversationRef.update({
    unreadCount,
  })

  logger.info(`Messages marked as read in conversation: ${conversationId}`, {
    userId,
  })
}
