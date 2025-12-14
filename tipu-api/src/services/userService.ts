import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { User, CreateUserInput, UpdateUserInput } from '../types/user'
import { ApiError } from '../middleware/errorHandler'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Create a new user profile in Firestore
 */
export const createUser = async (uid: string, input: CreateUserInput): Promise<User> => {
  const userRef = db.collection('users').doc(uid)

  // Check if user already exists
  const existing = await userRef.get()
  if (existing.exists) {
    throw new ApiError('User already exists', 409)
  }

  const user: User = {
    uid,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  }

  // Add role-specific fields
  if (input.dateOfBirth) {
    user.dateOfBirth = input.dateOfBirth as any
  }

  if (input.parentId) {
    user.parentId = input.parentId

    // Verify parent exists and has parent role
    const parentRef = db.collection('users').doc(input.parentId)
    const parentDoc = await parentRef.get()

    if (!parentDoc.exists) {
      throw new ApiError('Parent account not found', 404)
    }

    const parentData = parentDoc.data()
    if (parentData?.role !== 'parent') {
      throw new ApiError('Specified user is not a parent account', 400)
    }

    // Add child to parent's childrenIds array
    await parentRef.update({
      childrenIds: FieldValue.arrayUnion(uid),
      updatedAt: FieldValue.serverTimestamp(),
    })

    logger.info(`Child ${uid} linked to parent ${input.parentId}`)
  }

  // Add tutor-specific fields
  if (input.role === 'tutor') {
    // Use custom hourly rates if provided, otherwise use defaults
    user.hourlyRates = input.hourlyRates || {
      GCSE: 4500, // £45.00 in pence
      'A-Level': 6000, // £60.00 in pence
    }
    user.isApproved = false
    user.dbsVerified = false

    // Add bio and subjects if provided
    if (input.bio) {
      user.bio = input.bio
    }
    if (input.subjects) {
      user.subjects = input.subjects
    }
  }

  await userRef.set(user)

  logger.info(`User created: ${uid}`, { role: input.role })

  return user
}

/**
 * Get user profile by UID
 */
export const getUserProfile = async (uid: string): Promise<User> => {
  const userDoc = await db.collection('users').doc(uid).get()

  if (!userDoc.exists) {
    throw new ApiError('User not found', 404)
  }

  return userDoc.data() as User
}

/**
 * Update user profile
 */
export const updateUserProfile = async (
  uid: string,
  updates: UpdateUserInput
): Promise<void> => {
  const userRef = db.collection('users').doc(uid)
  const user = await userRef.get()

  if (!user.exists) {
    throw new ApiError('User not found', 404)
  }

  await userRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`User profile updated: ${uid}`)
}

/**
 * Check if user is 18 or older
 */
export const checkAge18Plus = async (uid: string): Promise<boolean> => {
  const user = await getUserProfile(uid)

  if (!user.dateOfBirth) {
    return true // Assume adult if no birthdate (tutors, parents, admins)
  }

  const birthDate = user.dateOfBirth.toDate()
  const ageDiff = Date.now() - birthDate.getTime()
  const ageDate = new Date(ageDiff)
  const age = Math.abs(ageDate.getUTCFullYear() - 1970)

  return age >= 18
}

/**
 * Get all tutors
 */
export const getAllTutors = async (): Promise<User[]> => {
  const snapshot = await db
    .collection('users')
    .where('role', '==', 'tutor')
    .where('isApproved', '==', true)
    .get()

  return snapshot.docs.map((doc) => doc.data() as User)
}

/**
 * Get tutors by subject
 */
export const getTutorsBySubject = async (subject: string): Promise<User[]> => {
  const snapshot = await db
    .collection('users')
    .where('role', '==', 'tutor')
    .where('subjects', 'array-contains', subject)
    .where('isApproved', '==', true)
    .get()

  return snapshot.docs.map((doc) => doc.data() as User)
}

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (role?: string): Promise<User[]> => {
  let query = db.collection('users')

  if (role) {
    query = query.where('role', '==', role) as any
  }

  const snapshot = await query.get()

  return snapshot.docs.map((doc) => doc.data() as User)
}
