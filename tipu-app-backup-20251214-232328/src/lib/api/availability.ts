import { apiRequest, publicApiRequest } from './client';

export interface WeeklyScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface BlockedDate {
  date: string;
  reason?: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
}

export interface DateOverride {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface TutorAvailability {
  id: string;
  tutorId: string;
  timezone: string;
  weeklySchedule: WeeklyScheduleSlot[];
  blockedDates: BlockedDate[];
  dateOverrides: DateOverride[];
  slotDuration: number;
  bufferBetweenSlots: number;
  advanceBookingDays: number;
  minNoticeHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface AvailabilityInput {
  timezone: string;
  weeklySchedule: WeeklyScheduleSlot[];
  blockedDates?: BlockedDate[];
  dateOverrides?: DateOverride[];
  slotDuration?: number;
  bufferBetweenSlots?: number;
  advanceBookingDays?: number;
  minNoticeHours?: number;
}

interface AvailabilityResponse {
  availability: TutorAvailability;
}

interface SlotsResponse {
  date: string;
  tutorId: string;
  slots: TimeSlot[];
}

// Get tutor's availability configuration (public - no auth required)
export const getTutorAvailability = async (tutorId: string): Promise<TutorAvailability> => {
  const response = await publicApiRequest<AvailabilityResponse>(`/v1/availability/tutors/${tutorId}`);
  return response.availability;
};

// Create or update tutor's availability (requires auth)
export const setTutorAvailability = async (
  tutorId: string,
  data: AvailabilityInput
): Promise<TutorAvailability> => {
  const response = await apiRequest<AvailabilityResponse>(`/v1/availability/tutors/${tutorId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.availability;
};

// Get available time slots for a specific date (public - no auth required)
export const getAvailableSlots = async (
  tutorId: string,
  date: string // YYYY-MM-DD
): Promise<SlotsResponse> => {
  return await publicApiRequest<SlotsResponse>(`/v1/availability/tutors/${tutorId}/slots?date=${date}`);
};

// Add a blocked date (requires auth)
export const addBlockedDate = async (
  tutorId: string,
  blockedDate: BlockedDate
): Promise<TutorAvailability> => {
  const response = await apiRequest<AvailabilityResponse>(`/v1/availability/tutors/${tutorId}/blocked-dates`, {
    method: 'POST',
    body: JSON.stringify(blockedDate)
  });
  return response.availability;
};

// Remove a blocked date (requires auth)
export const removeBlockedDate = async (
  tutorId: string,
  date: string
): Promise<TutorAvailability> => {
  const response = await apiRequest<AvailabilityResponse>(`/v1/availability/tutors/${tutorId}/blocked-dates/${date}`, {
    method: 'DELETE'
  });
  return response.availability;
};
