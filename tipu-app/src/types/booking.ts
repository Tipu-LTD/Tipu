export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined';

export type Subject = 'Maths' | 'Physics' | 'Computer Science' | 'Python';

export type Level = 'GCSE' | 'A-Level';

export interface LessonReport {
  topicsCovered: string;
  homework?: string;
  notes?: string;
  completedAt: Date;
}

export interface Booking {
  id: string;
  studentId: string;
  tutorId: string;
  subject: Subject;
  level: Level;
  scheduledAt: Date;
  duration: number;
  status: BookingStatus;
  price: number;
  isPaid: boolean;
  paymentIntentId?: string;
  meetingLink?: string;
  recordingUrl?: string;
  lessonReport?: LessonReport;
  declineReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
