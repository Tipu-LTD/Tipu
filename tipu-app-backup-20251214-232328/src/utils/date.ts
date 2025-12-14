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
 * Convert Firestore timestamp to Date object
 * Handles multiple Firestore timestamp formats:
 * - Firestore Timestamp objects with .toDate() method
 * - Plain objects with _seconds property
 * - ISO date strings
 * @param timestamp - Firestore timestamp object or Date string
 * @returns Date object
 */
export function parseFirestoreDate(timestamp: any): Date {
  if (timestamp?.toDate) return timestamp.toDate();
  if (timestamp?._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}
