import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { signOutUser } from '@/lib/firebase/auth';
import { authApi } from '@/lib/api/auth';
import { User } from '@/types/user';
import { ApiError } from '@/lib/api/client';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  profileError: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setUser(null);
      setProfileError(false);
      return;
    }

    try {
      const response = await authApi.getMe();
      setUser(response.user);
      setProfileError(false);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);

      // Only logout if the error is a 401 (unauthorized)
      // For network errors or server errors, keep the Firebase auth state
      if (error instanceof ApiError && error.status === 401) {
        console.warn('Unauthorized - logging out');
        setUser(null);
        setProfileError(false);
        await signOutUser();
      } else {
        // Network error or server error - keep Firebase user authenticated
        // but set profileError so UI can show a warning
        console.warn('Failed to fetch profile, but keeping auth state');
        setUser(null);
        setProfileError(true);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // Fetch full user profile from backend
        await refreshProfile();
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOutUser();
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, profileError, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
