import { Request, Response, NextFunction } from 'express'
import { auth } from '../config/firebase'
import { logger } from '../config/logger'
import { UserRole } from '../types/user'

export interface AuthRequest extends Request {
  user?: {
    uid: string
    email?: string
    role?: UserRole
    emailVerified?: boolean
    isApproved?: boolean
  }
}

/**
 * Middleware to verify Firebase JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      })
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify Firebase JWT token and check if it has been revoked
    const decodedToken = await auth.verifyIdToken(token, true)

    // Fetch user data from Firestore to get the role
    const { db } = await import('../config/firebase')
    const userDoc = await db.collection('users').doc(decodedToken.uid).get()

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist',
      })
    }

    const userData = userDoc.data()

    // Attach comprehensive user info to request (cached for subsequent middleware)
    // This prevents redundant Firestore reads in requireRole and other middleware
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData?.role,
      emailVerified: userData?.emailVerified,
      isApproved: userData?.isApproved,
      childrenIds: userData?.childrenIds, // For parent authorization checks
    }

    return next()
  } catch (error) {
    logger.error('Authentication error:', error)
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token',
    })
  }
}

/**
 * Middleware to check if user has a specific role
 * Uses cached role from authenticate() middleware - no additional Firestore read
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Use cached role from authenticate() middleware (no DB call needed)
    const userRole = req.user.role

    if (!userRole) {
      logger.error('User role not found in cached data', { uid: req.user.uid })
      return res.status(500).json({
        error: 'Internal server error',
        message: 'User role information missing',
      })
    }

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Unauthorized role access attempt', {
        uid: req.user.uid,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
      })
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      })
    }

    return next()
  }
}
