import { apiRequest } from './client';
import { Conversation, Message } from '@/types/message';

export interface CreateConversationData {
  participantIds: string[];
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface MessagesResponse {
  messages: Message[];
}

export interface SendMessageData {
  text: string;
  fileUrl?: string;
}

export const messagesApi = {
  getConversations: (params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return apiRequest<ConversationsResponse>(`/v1/messages/conversations${query ? `?${query}` : ''}`);
  },

  createConversation: (data: CreateConversationData) =>
    apiRequest<Conversation>('/v1/messages/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMessages: (conversationId: string, params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return apiRequest<MessagesResponse>(`/v1/messages/conversations/${conversationId}/messages${query ? `?${query}` : ''}`);
  },

  sendMessage: (conversationId: string, data: SendMessageData) =>
    apiRequest<Message>(`/v1/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  markAsRead: (conversationId: string) =>
    apiRequest<{ message: string }>(`/v1/messages/conversations/${conversationId}/read`, {
      method: 'POST'
    })
};
