// Fixed pricing for MVP launch
export const FIXED_PRICES = {
  GCSE: 2900,      // £29.00 in pence
  'A-Level': 3900  // £39.00 in pence
} as const;

export type EducationLevel = keyof typeof FIXED_PRICES;

export function getPrice(level: EducationLevel): number {
  return FIXED_PRICES[level];
}

export function calculateBookingPrice(level: EducationLevel, duration: number): number {
  return getPrice(level) * duration;
}
