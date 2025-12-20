import { apiRequest } from './client';
import { Subject, Level } from '@/types/booking';

export interface StudentProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  enrolledSubjects: string[];
  totalLessons: number;
  upcomingLessons: number;
}

export interface LessonReportData {
  bookingId: string;
  scheduledAt: Date;
  subject: Subject;
  level: Level;
  duration: number;
  topicsCovered: string;
  homework?: string;
  notes?: string;
  completedAt: Date;
}

export interface SuggestLessonData {
  studentId: string;
  subject: Subject;
  level: Level;
  scheduledAt: string; // ISO datetime string
  duration?: number;
  notes?: string;
}

export const tutorsApi = {
  getMyStudents: () =>
    apiRequest<StudentProfile[]>('/v1/tutors/my-students'),

  getStudentLessonReports: (studentId: string) =>
    apiRequest<LessonReportData[]>(`/v1/tutors/students/${studentId}/lesson-reports`),

  suggestLesson: (data: SuggestLessonData) =>
    apiRequest<{ id: string; message: string }>('/v1/tutors/suggest-lesson', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
