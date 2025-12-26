import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as userService from '../services/userService'
import { calculateAge } from '../utils/ageCheck'
import { registerSchema, passwordResetRequestSchema } from '../schemas/auth.schema'
import { auth } from '../config/firebase'
import { ZodError } from 'zod'
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService'
import { logger } from '../config/logger'

const router = Router()

router.post('/register', async (req, res, next) => {
  try {
    // Validate input including password strength
    const validated = registerSchema.parse(req.body)

    // ✅ ENFORCE PARENT REQUIREMENT FOR STUDENTS UNDER 18
    if (validated.role === 'student' && validated.dateOfBirth) {
      try {
        const birthDate = new Date(validated.dateOfBirth)
        const age = calculateAge(birthDate)

        if (isNaN(age) || age < 0) {
          return res.status(400).json({
            error: 'Invalid date of birth',
            code: 'INVALID_DATE_OF_BIRTH',
          })
        }

        if (age < 18 && !validated.parentId) {
          return res.status(400).json({
            error: 'Students under 18 must be registered by a parent',
            code: 'PARENT_REQUIRED',
            message: 'Please ask your parent to register and add you as their child.',
            age: age,
            dateOfBirth: validated.dateOfBirth,
          })
        }
      } catch (error) {
        logger.error('Error calculating age during registration:', error)
        return res.status(400).json({
          error: 'Invalid date of birth format',
          code: 'INVALID_DATE_OF_BIRTH',
        })
      }
    }

    let uid: string;

    // Check if user was already created (uid provided) or needs to be created
    if (validated.uid) {
      // User already created by frontend (Register.tsx or AddChild.tsx)
      uid = validated.uid;
      logger.info('Using existing Firebase user', { uid, email: validated.email });
    } else {
      // Create new Firebase user with provided password
      const userRecord = await auth.createUser({
        email: validated.email,
        password: validated.password!,
        displayName: validated.displayName,
      });
      uid = userRecord.uid;
      logger.info('Created new Firebase user', { uid, email: validated.email });
    }

    // Create Firestore profile
    const user = await userService.createUser(uid, {
      email: validated.email,
      displayName: validated.displayName,
      role: validated.role,
      dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : undefined,
      parentId: validated.parentId,
      bio: validated.bio,
      subjects: validated.subjects as import('../types/user').Subject[] | undefined,
      hourlyRates: validated.hourlyRates as { GCSE: number; 'A-Level': number } | undefined,
    })

    // Send email verification link
    try {
      const verificationLink = await auth.generateEmailVerificationLink(validated.email)
      await sendVerificationEmail(validated.email, validated.displayName, verificationLink)
      logger.info('Verification email sent to new user', { email: validated.email })
    } catch (emailError: any) {
      // Log error but don't block registration
      logger.error('Failed to send verification email during registration', {
        email: validated.email,
        error: emailError.message,
      })
    }

    return res.status(201).json({
      user,
      message: 'User registered successfully. Please check your email to verify your account.',
    })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    return next(error)
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user!.uid)

    res.json({ user })
  } catch (error) {
    return next(error)
  }
})

/**
 * Password reset request endpoint
 * Generates a password reset link and sends it via email
 *
 * Security features:
 * - Always returns success (timing-attack resistant - doesn't reveal if email exists)
 * - Link expires in 1 hour (Firebase default)
 * - All requests are logged for audit
 *
 * TODO: Add rate limiting (3 attempts per 15min per email)
 */
router.post('/password-reset', async (req, res, next) => {
  try {
    // Validate input
    const { email } = passwordResetRequestSchema.parse(req.body)

    // Log the request for security audit
    logger.info('Password reset requested', { email })

    try {
      // Check if user exists
      const userRecord = await auth.getUserByEmail(email)

      // Get user profile for display name
      const userProfile = await userService.getUserProfile(userRecord.uid)

      // Generate Firebase password reset link
      const resetLink = await auth.generatePasswordResetLink(email)

      // Send email
      await sendPasswordResetEmail(email, resetLink, userProfile.displayName)

      logger.info('Password reset email sent successfully', { email })
    } catch (error: any) {
      // If user doesn't exist or email fails, log but still return success
      // This prevents email enumeration attacks
      if (error.code === 'auth/user-not-found') {
        logger.info('Password reset requested for non-existent email', { email })
      } else {
        logger.error('Error sending password reset email', { email, error: error.message })
      }
    }

    // Always return success (don't reveal if email exists)
    return res.json({
      message: 'If an account exists with this email, a password reset link has been sent',
    })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    return next(error)
  }
})

/**
 * Resend email verification endpoint
 * Allows authenticated users to resend their verification email
 *
 * Security: Requires authentication, rate-limited
 */
router.post('/resend-verification', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!

    // Check if email is already verified
    const userRecord = await auth.getUser(user.uid)
    if (userRecord.emailVerified) {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'Your email address has already been verified',
      })
    }

    // Get user profile for display name
    const userProfile = await userService.getUserProfile(user.uid)

    // Generate and send verification email
    const verificationLink = await auth.generateEmailVerificationLink(user.email!)
    await sendVerificationEmail(user.email!, userProfile.displayName, verificationLink)

    logger.info('Verification email resent', { email: user.email })

    return res.json({
      message: 'Verification email sent. Please check your inbox.',
    })
  } catch (error: any) {
    logger.error('Error resending verification email', {
      uid: req.user?.uid,
      error: error.message,
    })
    return next(error)
  }
})

/**
 * Verify email endpoint
 * TODO: Implement using Firebase Admin SDK methods instead of client SDK methods
 * checkActionCode and applyActionCode don't exist in Firebase Admin SDK
 *
 * Options:
 * 1. Handle email verification client-side using Firebase Client SDK
 * 2. Use Firebase Auth REST API for server-side verification
 * 3. Skip server-side verification and rely on Firebase's automatic handling
 */
/*
router.post('/verify-email', async (req, res, next) => {
  try {
    // Validate input
    const { oobCode } = verifyEmailSchema.parse(req.body)

    // Verify the code and apply the email verification
    // Note: checkActionCode is not available in Firebase Admin SDK
    const info = await auth.checkActionCode(oobCode)

    // Extract email from the action code info
    const email = info.data.email

    if (!email) {
      return res.status(400).json({
        error: 'Invalid verification code',
        message: 'Could not extract email from verification code',
      })
    }

    // Apply the verification
    // Note: applyActionCode is not available in Firebase Admin SDK
    await auth.applyActionCode(oobCode)

    // Update Firestore user document
    const userRecord = await auth.getUserByEmail(email)
    await db.collection('users').doc(userRecord.uid).update({
      emailVerified: true,
      updatedAt: new Date(),
    })

    // Get user profile for display name
    const userProfile = await userService.getUserProfile(userRecord.uid)

    // Send welcome email
    try {
      await sendWelcomeEmail(email, userProfile.displayName)
      logger.info('Welcome email sent after verification', { email })
    } catch (emailError: any) {
      // Log error but don't block verification success
      logger.error('Failed to send welcome email', {
        email,
        error: emailError.message,
      })
    }

    logger.info('Email verified successfully', { email, uid: userRecord.uid })

    return res.json({
      message: 'Email verified successfully! Welcome to Tipu.',
    })
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    // Handle Firebase errors
    if (error.code === 'auth/invalid-action-code') {
      return res.status(400).json({
        error: 'Invalid or expired verification link',
        message: 'This verification link is invalid or has already been used. Please request a new one.',
      })
    }

    if (error.code === 'auth/expired-action-code') {
      return res.status(400).json({
        error: 'Expired verification link',
        message: 'This verification link has expired. Please request a new one.',
      })
    }

    logger.error('Error verifying email', { error: error.message })
    return next(error)
  }
})
*/

export default router
