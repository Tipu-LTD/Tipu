import { isValidDate, parseFirestoreDate } from './date';

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth (Date object, ISO string, or Firestore Timestamp)
 * @returns Age in years (0 if invalid date)
 */
export const calculateAge = (dateOfBirth: Date | string | any): number => {
  const today = new Date();

  // Use parseFirestoreDate to handle all formats (Date, string, Firestore Timestamp)
  const birthDate = parseFirestoreDate(dateOfBirth);

  // Validate date
  if (!isValidDate(birthDate)) {
    console.error('calculateAge: Invalid date of birth', dateOfBirth);
    return 0;  // Return 0 instead of NaN
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Never return negative age
  return Math.max(0, age);
};

/**
 * Check if a person is 18 or older
 * @param dateOfBirth - Date of birth
 * @returns True if 18 or older
 */
export const isAdult = (dateOfBirth: Date | string): boolean => {
  return calculateAge(dateOfBirth) >= 18;
};
