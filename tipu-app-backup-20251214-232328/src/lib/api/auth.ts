import { apiRequest, publicApiRequest } from './client';
import { User } from '@/types/user';

export interface RegisterData {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'tutor' | 'parent' | 'admin';
  dateOfBirth?: string;
  parentId?: string;
  subjects?: string[];
  bio?: string;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface MeResponse {
  user: User;
}

export const authApi = {
  register: (data: RegisterData) =>
    publicApiRequest<RegisterResponse>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMe: () => apiRequest<MeResponse>('/v1/auth/me')
};
