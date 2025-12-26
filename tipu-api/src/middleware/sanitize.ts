import { Request, Response, NextFunction } from 'express'
import { sanitizeInput } from '../utils/sanitize'
import { logger } from '../config/logger'

/**
 * Middleware to sanitize all request body inputs
 * Prevents XSS attacks by stripping HTML from user input
 */
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && Object.keys(req.body).length > 0) {
    try {
      req.body = sanitizeInput(req.body)
      logger.debug('Request body sanitized', { path: req.path })
    } catch (error) {
      logger.error('Error sanitizing request body', error)
      // Continue anyway - better to process than fail
    }
  }
  next()
}
