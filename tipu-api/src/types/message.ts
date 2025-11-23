import { Timestamp } from 'firebase-admin/firestore'

export interface Conversation {
  id: string
  participantIds: string[]
  lastMessage?: {
    text: string
    senderId: string
    timestamp: Timestamp
  }
  unreadCount?: Record<string, number>
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Message {
  id: string
  senderId: string
  text: string
  fileUrl?: string
  timestamp: Timestamp
  read: boolean
}

export interface SendMessageInput {
  conversationId: string
  senderId: string
  text: string
  fileUrl?: string
}

export interface CreateConversationInput {
  participantIds: string[]
}
