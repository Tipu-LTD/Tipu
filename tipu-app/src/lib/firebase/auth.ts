import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { auth } from './config';

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<UserCredential> {
  // Set persistence before signing in
  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;

  try {
    await setPersistence(auth, persistence);
  } catch (error) {
    console.warn('Failed to set auth persistence:', error);
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser(): Promise<void> {
  return signOut(auth);
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Confirm password reset using Firebase action code
 * @param oobCode - The action code from the password reset email URL
 * @param newPassword - The new password to set
 */
export async function confirmPasswordReset(
  oobCode: string,
  newPassword: string
): Promise<void> {
  return firebaseConfirmPasswordReset(auth, oobCode, newPassword);
}

/**
 * Re-authenticate user with current password (required before password change)
 * @param currentPassword - The user's current password
 */
export async function reauthenticateUser(currentPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No authenticated user');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

/**
 * Update user password (requires recent authentication)
 * @param currentPassword - The user's current password
 * @param newPassword - The new password to set
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }

  // Re-authenticate first (Firebase security requirement)
  await reauthenticateUser(currentPassword);

  // Update password
  await updatePassword(user, newPassword);
}
