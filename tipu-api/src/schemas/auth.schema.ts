import { z } from 'zod'

/**
 * Password validation schema
 * Enforces:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * User registration schema
 * Validates all required fields for user registration
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema.optional(), // Optional - required only if uid not provided
  uid: z.string().optional(), // Firebase UID if user already created
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['student', 'tutor', 'parent'], {
    errorMap: () => ({ message: 'Role must be student, tutor, or parent' })
  }),

  // Optional fields based on role
  dateOfBirth: z.string().datetime().optional(), // For students (18+ check)
  parentId: z.string().optional(), // For students under 18
  bio: z.string().max(500).optional(), // For tutors
  subjects: z.array(z.string()).optional(), // For tutors
  hourlyRates: z.object({
    GCSE: z.number().int().positive().optional(),
    'A-Level': z.number().int().positive().optional(),
  }).optional(), // For tutors
}).refine(
  (data) => {
    // Must provide either uid (user already created) or password (create new user)
    if (!data.uid && !data.password) {
      return false;
    }
    return true;
  },
  {
    message: 'Either uid or password must be provided',
    path: ['password'],
  }
).refine(
  (data) => {
    // If role is student, dateOfBirth is required
    if (data.role === 'student' && !data.dateOfBirth) {
      return false;
    }
    return true;
  },
  {
    message: 'Date of birth is required for student accounts',
    path: ['dateOfBirth'],
  }
)

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Password reset request schema
 * Validates email for password reset request
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>

/**
 * Email verification schema
 * Validates the action code from Firebase email verification link
 */
export const verifyEmailSchema = z.object({
  oobCode: z.string().min(1, 'Verification code is required'),
})

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
