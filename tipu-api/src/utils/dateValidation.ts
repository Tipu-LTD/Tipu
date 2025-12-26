import { z } from 'zod'

/**
 * Validates booking dates:
 * - Must be in the future (at least 1 hour from now)
 * - Must be within 1 year from now
 */
export const futureDateSchema = z.string().datetime().refine(
  (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    return date >= oneHourFromNow && date <= oneYearFromNow
  },
  { message: 'Date must be between 1 hour and 1 year from now' }
)
