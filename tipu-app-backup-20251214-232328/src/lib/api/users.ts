import { apiRequest } from './client';
import { User, Subject } from '@/types/user';

export interface UpdateUserData {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  subjects?: Subject[];
}

export interface TutorsResponse {
  tutors: User[];
}

export const usersApi = {
  getById: (id: string) =>
    apiRequest<User>(`/v1/users/${id}`),

  update: (id: string, data: UpdateUserData) =>
    apiRequest<{ message: string }>(`/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  getAllTutors: (params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return apiRequest<TutorsResponse>(`/v1/users/tutors/all${query ? `?${query}` : ''}`);
  },

  getTutorsBySubject: (subject: Subject) =>
    apiRequest<TutorsResponse>(`/v1/users/tutors/subject/${subject}`)
};
