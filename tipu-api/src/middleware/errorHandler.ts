import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'
import { ZodError } from 'zod'

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = 'ApiError'
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  // Handle API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
    })
  }

  // Handle Firebase errors
  if (err.message.includes('Firebase')) {
    return res.status(500).json({
      error: 'Database error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }

  // Handle Stripe errors
  if (err.message.includes('Stripe')) {
    return res.status(500).json({
      error: 'Payment error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }

  // Default error response
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
}
