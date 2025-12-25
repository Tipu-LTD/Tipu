export type BookingStatus = 'pending' | 'accepted' | 'confirmed' | 'completed' | 'cancelled' | 'declined' | 'tutor-suggested';

export type Subject = 'Maths' | 'Physics' | 'Computer Science' | 'Python';

export type Level = 'GCSE' | 'A-Level';

export interface LessonReport {
  topicsCovered: string;
  homework?: string;
  notes?: string;
  completedAt: Date;
}

export interface RescheduleRequest {
  requestedBy: string;
  requestedAt: any;  // Firestore Timestamp
  newScheduledAt: any;  // Firestore Timestamp
  status: 'pending' | 'approved' | 'declined';
  respondedBy?: string;
  respondedAt?: any;  // Firestore Timestamp
  declineReason?: string;
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
  rescheduleRequest?: RescheduleRequest;
  paymentScheduledFor?: any;  // Firestore Timestamp
  paymentError?: string;

  // Payment authorization tracking (manual capture flow)
  paymentAuthType?: 'immediate_auth' | 'deferred_auth' | 'immediate_charge';
  paymentIntentCreatedAt?: any;  // Firestore Timestamp
  paymentCapturedAt?: any;  // Firestore Timestamp
  authorizationExpiresAt?: any;  // Firestore Timestamp
  savedPaymentMethodId?: string;
  setupIntentId?: string;
  requiresAuthCreation?: boolean;
  refundId?: string;
  refundedAt?: any;  // Firestore Timestamp

  // Tutor-suggested booking fields
  initiatedBy?: 'student' | 'parent' | 'tutor';
  tutorNotes?: string;
  suggestedAt?: any;  // Firestore Timestamp
  approvedBy?: string;
  approvedAt?: any;  // Firestore Timestamp
  requiresParentApproval?: boolean;  // True if student <18, false if student ≥18

  createdAt: Date;
  updatedAt: Date;
}
