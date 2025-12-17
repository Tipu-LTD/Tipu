import { Request, Response, NextFunction } from 'express'
import { auth } from '../config/firebase'
import { logger } from '../config/logger'

export interface AuthRequest extends Request {
  user?: {
    uid: string
    email?: string
    role?: string
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

    // Verify Firebase JWT token
    const decodedToken = await auth.verifyIdToken(token)

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

    // Attach user info to request including role from Firestore
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData?.role,
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
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Fetch user role from Firestore
    const { db } = await import('../config/firebase')
    const userDoc = await db.collection('users').doc(req.user.uid).get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userData = userDoc.data()
    req.user.role = userData?.role

    if (!allowedRoles.includes(userData?.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      })
    }

    return next()
  }
}
