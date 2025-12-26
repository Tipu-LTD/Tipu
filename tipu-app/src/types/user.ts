export type UserRole = 'student' | 'tutor' | 'parent' | 'admin';

export type Subject = 'Maths' | 'Physics' | 'Computer Science' | 'Python';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;

  // Student fields
  dateOfBirth?: Date;
  parentId?: string;
  schoolId?: string;
  enrolledSubjects?: Subject[];
  examBoards?: Record<string, string>; // e.g., {maths: 'AQA', physics: 'Edexcel'}

  // Tutor fields
  bio?: string;
  subjects?: Subject[];
  hourlyRates?: {
    GCSE: number;
    'A-Level': number;
  };
  isApproved?: boolean;

  // Parent fields
  childrenIds?: string[];

  // Payment fields
  stripeCustomerId?: string;
  stripeConnectId?: string;
}
