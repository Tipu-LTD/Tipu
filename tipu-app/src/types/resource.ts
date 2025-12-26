export type ResourceType = 'recording' | 'homework' | 'guide' | 'notes' | 'other';
export type ResourceSubject = 'Maths' | 'Physics' | 'Computer Science' | 'Python' | 'General';

export interface Resource {
  id: string;
  title: string;
  description?: string;
  type: ResourceType;
  subject: ResourceSubject;
  level?: 'GCSE' | 'A-Level';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  studentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateResourceData {
  title: string;
  description?: string;
  type: ResourceType;
  subject: ResourceSubject;
  level?: 'GCSE' | 'A-Level';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  studentId: string;
}
