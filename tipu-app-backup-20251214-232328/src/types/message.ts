export interface Message {
  id: string;
  senderId: string;
  text: string;
  fileUrl?: string;
  timestamp: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Date;
  };
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}
