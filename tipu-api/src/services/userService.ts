import { db } from '../config/firebase'
import { logger } from '../config/logger'
import { User, CreateUserInput, UpdateUserInput, UserRole } from '../types/user'
import { ApiError } from '../middleware/errorHandler'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Field access control lists by role
 * Defines which fields each role is allowed to update
 */
const COMMON_ALLOWED_FIELDS = ['displayName', 'photoURL', 'bio']

const ALLOWED_FIELDS_BY_ROLE: Record<UserRole, string[]> = {
  student: [...COMMON_ALLOWED_FIELDS, 'dateOfBirth', 'enrolledSubjects', 'examBoards'],
  tutor: [...COMMON_ALLOWED_FIELDS, 'subjects', 'hourlyRates'],
  parent: [...COMMON_ALLOWED_FIELDS, 'childrenIds'],
  admin: [...COMMON_ALLOWED_FIELDS], // Admins use separate admin endpoints for protected fields
}

/**
 * Protected fields that should NEVER be updated through the standard update endpoint
 * These require admin privileges and special endpoints
 */
const PROTECTED_FIELDS = [
  'role',
  'isApproved',
  'dbsVerified',
  'stripeCustomerId',
  'stripeConnectId',
  'parentId',
  'uid',
  'email',
  'createdAt',
  'updatedAt',
]

/**
 * Filter update fields based on user role
 * Prevents privilege escalation by only allowing role-appropriate fields
 */
const filterUpdatesByRole = (
  updates: Record<string, any>,
  userRole: UserRole,
  requestingUid: string
): Record<string, any> => {
  const allowedFields = ALLOWED_FIELDS_BY_ROLE[userRole]
  const filtered: Record<string, any> = {}
  const blockedFields: string[] = []

  Object.keys(updates).forEach((key) => {
    // Check if field is protected
    if (PROTECTED_FIELDS.includes(key)) {
      blockedFields.push(key)
      logger.warn(`Blocked attempt to update protected field: ${key} by user ${requestingUid} with role ${userRole}`)
      return
    }

    // Check if field is allowed for this role
    if (allowedFields.includes(key)) {
      filtered[key] = updates[key]
    } else {
      blockedFields.push(key)
      logger.warn(`Blocked attempt to update unauthorized field: ${key} by user ${requestingUid} with role ${userRole}`)
    }
  })

  // Log security event if any fields were blocked
  if (blockedFields.length > 0) {
    logger.error(`Security: Unauthorized field update attempt`, {
      requestingUser: requestingUid,
      requestingRole: userRole,
      blockedFields,
      allAttemptedFields: Object.keys(updates),
    })
  }

  return filtered
}

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
      GCSE: 2900, // £29.00 - Fixed pricing
      'A-Level': 3900, // £39.00 - Fixed pricing
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
 * Update user profile with role-based field filtering
 * Prevents privilege escalation by only allowing users to update permitted fields
 */
export const updateUserProfile = async (
  uid: string,
  updates: UpdateUserInput,
  requestingRole: UserRole,
  requestingUid: string
): Promise<void> => {
  const userRef = db.collection('users').doc(uid)
  const userDoc = await userRef.get()

  if (!userDoc.exists) {
    throw new ApiError('User not found', 404)
  }

  const userData = userDoc.data() as User
  const isAdmin = requestingRole === 'admin'

  let finalUpdates: Record<string, any>

  // Admins can update more fields, but still protect critical ones
  if (isAdmin) {
    // Admins can update any field except uid and email
    const { uid: _, email: __, createdAt: ___, ...adminAllowedUpdates } = updates as Record<string, any>
    finalUpdates = adminAllowedUpdates
    logger.info(`Admin ${requestingUid} updating user ${uid}`, {
      fields: Object.keys(adminAllowedUpdates),
    })
  } else {
    // Filter updates based on the role of the user BEING UPDATED (not the requesting user)
    // This ensures tutors can only update tutor fields, students can only update student fields, etc.
    finalUpdates = filterUpdatesByRole(
      updates as Record<string, any>,
      userData.role,
      requestingUid
    )
  }

  // Only update if there are valid fields to update
  if (Object.keys(finalUpdates).length === 0) {
    logger.warn(`No valid fields to update for user ${uid} by ${requestingUid}`)
    throw new ApiError('No valid fields to update', 400)
  }

  await userRef.update({
    ...finalUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`User profile updated: ${uid}`, {
    updatedFields: Object.keys(finalUpdates),
    updatedBy: requestingUid,
  })
}

/**
 * Update protected fields (admin only)
 * Allows admins to update sensitive fields like approval status, payment IDs, etc.
 */
export const adminUpdateUser = async (
  uid: string,
  updates: Record<string, any>,
  adminUid: string
): Promise<void> => {
  const userRef = db.collection('users').doc(uid)
  const userDoc = await userRef.get()

  if (!userDoc.exists) {
    throw new ApiError('User not found', 404)
  }

  // Admins can update any field except uid and email
  const { uid: _, email: __, ...allowedUpdates } = updates

  await userRef.update({
    ...allowedUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`Admin updated user ${uid}`, {
    updatedFields: Object.keys(allowedUpdates),
    adminUid,
  })
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
