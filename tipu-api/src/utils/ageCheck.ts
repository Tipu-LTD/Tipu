/**
 * Age Verification Utilities
 *
 * Provides helper functions to calculate age and determine if a user is an adult (18+).
 * Used for enforcing booking restrictions and chat permissions.
 */

/**
 * Calculate age from date of birth
 * @param dateOfBirth - User's date of birth
 * @returns Age in years
 * @throws Error if dateOfBirth is invalid
 */
export function calculateAge(dateOfBirth: Date): number {
  // Validate input
  if (!(dateOfBirth instanceof Date) || isNaN(dateOfBirth.getTime())) {
    throw new Error('Invalid date of birth provided to calculateAge')
  }

  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--
  }

  // Never return negative age
  return Math.max(0, age)
}

/**
 * Check if user is an adult (18 years or older)
 * @param dateOfBirth - User's date of birth
 * @returns True if user is 18+, false otherwise
 */
export function isAdult(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) >= 18
}

/**
 * Check if user is a minor (under 18 years old)
 * @param dateOfBirth - User's date of birth
 * @returns True if user is under 18, false otherwise
 */
export function isMinor(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) < 18
}
