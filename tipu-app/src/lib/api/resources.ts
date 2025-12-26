import { apiRequest } from './client';
import { Resource, CreateResourceData } from '@/types/resource';

export const resourcesApi = {
  /**
   * Create a new resource
   * @param data Resource data including file URL and metadata
   * @returns The created resource
   */
  createResource: (data: CreateResourceData) =>
    apiRequest<Resource>('/v1/resources', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  /**
   * Get all resources for a specific student
   * @param studentId The student's UID
   * @returns Array of resources for the student
   */
  getStudentResources: (studentId: string) =>
    apiRequest<Resource[]>(`/v1/resources/student/${studentId}`),

  /**
   * Delete a resource
   * @param resourceId The resource ID to delete
   */
  deleteResource: (resourceId: string) =>
    apiRequest<void>(`/v1/resources/${resourceId}`, {
      method: 'DELETE'
    })
};

// Convenience helper function for easier imports
export const getStudentResources = (studentId: string) =>
  resourcesApi.getStudentResources(studentId);
