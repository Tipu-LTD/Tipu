import { User } from '@/types/user';

export const isTutorProfileComplete = (user: User): boolean => {
  return !!(
    user.bio &&
    user.subjects?.length
    // Rate check removed - all tutors use fixed pricing (£29 GCSE, £39 A-Level)
  );
};
