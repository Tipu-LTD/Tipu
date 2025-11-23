/**
 * Convert pence to pounds with proper formatting
 * @param pence - Amount in pence (e.g., 4500)
 * @returns Formatted string (e.g., "£45.00")
 */
export function penceToPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Convert pounds to pence
 * @param pounds - Amount in pounds (e.g., 45.00)
 * @returns Amount in pence (e.g., 4500)
 */
export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}
