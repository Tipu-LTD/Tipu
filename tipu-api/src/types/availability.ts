import { Timestamp } from 'firebase-admin/firestore';

export interface WeeklyScheduleSlot {
  dayOfWeek: number;           // 0-6 (Sunday-Saturday)
  startTime: string;            // "HH:mm" format (e.g., "09:00")
  endTime: string;              // "HH:mm" format (e.g., "17:00")
  isActive: boolean;            // Can disable without deleting
}

export interface BlockedDate {
  date: string;                 // "YYYY-MM-DD" format
  reason?: string;              // Optional note
  allDay: boolean;              // Block entire day or specific hours
  startTime?: string;           // If !allDay, "HH:mm" format
  endTime?: string;             // If !allDay, "HH:mm" format
}

export interface DateOverride {
  date: string;                 // "YYYY-MM-DD" format
  startTime: string;            // "HH:mm" format
  endTime: string;              // "HH:mm" format
  reason?: string;              // Optional note for the override
}

export interface TutorAvailability {
  id: string;                   // Document ID = tutorId
  tutorId: string;              // User UID
  timezone: string;             // e.g., "Europe/London"
  weeklySchedule: WeeklyScheduleSlot[];
  blockedDates: BlockedDate[];
  dateOverrides: DateOverride[];
  slotDuration: number;         // Minutes per slot (default: 60)
  bufferBetweenSlots: number;   // Minutes between bookings (default: 0)
  advanceBookingDays: number;   // How far in advance bookings allowed (default: 30)
  minNoticeHours: number;       // Minimum notice for bookings (default: 24)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TimeSlot {
  startTime: string;            // "HH:mm" format
  endTime: string;              // "HH:mm" format
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
