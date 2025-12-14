import { apiRequest } from './client';
import { Booking, Subject, Level, LessonReport } from '@/types/booking';

export interface CreateBookingData {
  studentId?: string; // Required for parents booking for children
  tutorId: string;
  subject: Subject;
  level: Level;
  scheduledAt: string;
  price: number;
  duration?: number;
}

export interface BookingsResponse {
  bookings: Booking[];
}

export interface BookingResponse {
  booking: Booking;
}

export interface AcceptBookingData {
  meetingLink: string;
}

export interface DeclineBookingData {
  reason: string;
}

export interface LessonReportData {
  topicsCovered: string;
  homework?: string;
  notes?: string;
}

export const bookingsApi = {
  create: (data: CreateBookingData) =>
    apiRequest<Booking>('/v1/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getAll: (params?: { status?: string; limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return apiRequest<BookingsResponse>(`/v1/bookings${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    apiRequest<Booking>(`/v1/bookings/${id}`),

  accept: (id: string, data: AcceptBookingData) =>
    apiRequest<{ message: string }>(`/v1/bookings/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  decline: (id: string, data: DeclineBookingData) =>
    apiRequest<{ message: string }>(`/v1/bookings/${id}/decline`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  submitLessonReport: (id: string, data: LessonReportData) =>
    apiRequest<{ message: string }>(`/v1/bookings/${id}/lesson-report`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
