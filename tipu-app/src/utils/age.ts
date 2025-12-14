/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth
 * @returns Age in years
 */
export const calculateAge = (dateOfBirth: Date | string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Check if a person is 18 or older
 * @param dateOfBirth - Date of birth
 * @returns True if 18 or older
 */
export const isAdult = (dateOfBirth: Date | string): boolean => {
  return calculateAge(dateOfBirth) >= 18;
};
