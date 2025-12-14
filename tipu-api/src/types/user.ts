import { Timestamp } from 'firebase-admin/firestore'

export type UserRole = 'student' | 'tutor' | 'parent' | 'admin'

export type Subject = 'Maths' | 'Physics' | 'Computer Science' | 'Python'

export type Level = 'GCSE' | 'A-Level'

export interface User {
  uid: string
  email: string
  displayName: string
  role: UserRole
  photoURL?: string
  createdAt: Timestamp
  updatedAt: Timestamp

  // Student-specific fields
  dateOfBirth?: Timestamp
  parentId?: string
  schoolId?: string
  enrolledSubjects?: Subject[]
  examBoards?: Record<string, string>

  // Tutor-specific fields
  bio?: string
  subjects?: Subject[]
  hourlyRates?: {
    GCSE: number
    'A-Level': number
  }
  isApproved?: boolean
  dbsVerified?: boolean

  // Parent-specific fields
  childrenIds?: string[]

  // Payment fields
  stripeCustomerId?: string
  stripeConnectId?: string
}

export interface CreateUserInput {
  email: string
  displayName: string
  role: UserRole
  dateOfBirth?: Date
  parentId?: string
  // Tutor-specific fields
  bio?: string
  subjects?: Subject[]
  hourlyRates?: {
    GCSE: number
    'A-Level': number
  }
}

export interface UpdateUserInput {
  displayName?: string
  photoURL?: string
  bio?: string
  subjects?: Subject[]
  hourlyRates?: {
    GCSE: number
    'A-Level': number
  }
}
