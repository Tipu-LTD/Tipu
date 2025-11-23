import { User } from '@/types/user';

export const isTutorProfileComplete = (user: User): boolean => {
  return !!(
    user.bio &&
    user.subjects?.length &&
    user.hourlyRates?.GCSE &&
    user.hourlyRates?.['A-Level']
  );
};
