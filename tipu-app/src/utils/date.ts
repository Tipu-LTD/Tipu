import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format a date for display
 * @param date - Date object
 * @returns Formatted string (e.g., "Nov 23, 2025, 10:00 AM")
 */
export function formatDateTime(date: Date): string {
  return format(date, 'PPp');
}

/**
 * Format date as relative time
 * @param date - Date object
 * @returns Relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Format date for display (date only)
 * @param date - Date object
 * @returns Formatted string (e.g., "Nov 23, 2025")
 */
export function formatDate(date: Date): string {
  return format(date, 'PP');
}

/**
 * Format time for display (time only)
 * @param date - Date object
 * @returns Formatted string (e.g., "10:00 AM")
 */
export function formatTime(date: Date): string {
  return format(date, 'p');
}

/**
 * Check if a value is a valid Date object
 * @param date - Value to check
 * @returns True if valid Date, false otherwise
 */
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Convert Firestore timestamp to Date object
 * Handles multiple Firestore timestamp formats:
 * - Firestore Timestamp objects with .toDate() method
 * - Plain objects with _seconds property
 * - ISO date strings
 * - Null/undefined (returns current date as fallback)
 * @param timestamp - Firestore timestamp object or Date string
 * @returns Date object (current date if input is invalid)
 */
export function parseFirestoreDate(timestamp: any): Date {
  // Handle null/undefined - return current date instead of Unix epoch
  if (!timestamp) {
    console.warn('parseFirestoreDate called with null/undefined, returning current date');
    return new Date();
  }

  // Handle Firestore Timestamp objects
  if (timestamp?.toDate) return timestamp.toDate();

  // Handle plain objects with _seconds property
  if (timestamp?._seconds) return new Date(timestamp._seconds * 1000);

  // Handle other formats (strings, numbers, etc.)
  const date = new Date(timestamp);

  // Validate the result
  if (!isValidDate(date)) {
    console.warn('parseFirestoreDate: Invalid date, returning current date', timestamp);
    return new Date();
  }

  return date;
}

/**
 * Format duration in minutes to human-readable hours
 * @param minutes - Duration in minutes (e.g., 60, 90, 120)
 * @returns Formatted string (e.g., "1 hour", "1.5 hours", "2 hours")
 */
export function formatDuration(minutes: number): string {
  const hours = minutes / 60;

  if (hours === 1) {
    return '1 hour';
  } else if (hours % 1 === 0) {
    // Whole number of hours (e.g., 2, 3, 4)
    return `${hours} hours`;
  } else {
    // Fractional hours (e.g., 1.5, 2.5)
    return `${hours} hours`;
  }
}
