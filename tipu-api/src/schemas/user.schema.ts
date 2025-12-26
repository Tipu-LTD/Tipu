import { z } from 'zod'

/**
 * User profile update schema
 * Validates user profile updates and prevents unauthorized field modifications
 */
export const updateUserSchema = z.object({
  displayName: z.string().min(1, 'Display name required').max(100, 'Display name too long').optional(),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
  photoURL: z.string().url('Photo URL must be a valid URL').optional(),

  // Student-specific fields
  dateOfBirth: z.string().datetime().optional(),
  enrolledSubjects: z.array(
    z.enum(['Maths', 'Physics', 'Computer Science', 'Python'])
  ).optional(),
  examBoards: z.record(z.string()).optional(),

  // Tutor-specific fields
  subjects: z.array(
    z.enum(['Maths', 'Physics', 'Computer Science', 'Python'])
  ).optional(),
  hourlyRates: z.object({
    GCSE: z.number().int().positive().min(1000).max(50000).optional(), // £10-£500
    'A-Level': z.number().int().positive().min(1000).max(50000).optional(),
  }).optional(),

  // Parent-specific fields (none currently updatable by parents)

  // IMPORTANT: Fields NOT allowed to be updated by users
  // These are filtered out in the route handler:
  // - role
  // - isApproved
  // - dbsVerified
  // - stripeCustomerId
  // - stripeConnectId
  // - childrenIds
  // - parentId
}).strict() // Reject any unknown fields

/**
 * Tutor approval schema (admin only)
 */
export const approveTutorSchema = z.object({
  isApproved: z.boolean(),
  dbsVerified: z.boolean().optional(),
})

/**
 * Child creation schema (parent-initiated)
 * Validates input for creating a child account through parent dashboard
 */
export const createChildSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  dateOfBirth: z.string().datetime('Invalid date format'),
})

export type CreateChildInput = z.infer<typeof createChildSchema>
