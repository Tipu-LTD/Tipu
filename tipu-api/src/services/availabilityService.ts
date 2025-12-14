import { db } from '../config/firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  TutorAvailability,
  AvailabilityInput,
  WeeklyScheduleSlot,
  BlockedDate,
  DateOverride,
  TimeSlot
} from '../types/availability';

// ==========================================
// Get tutor's availability configuration
// ==========================================
export async function getTutorAvailability(
  tutorId: string
): Promise<TutorAvailability | null> {
  const doc = await db.collection('tutor_availability').doc(tutorId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data()
  } as TutorAvailability;
}

// ==========================================
// Set/Update tutor's availability
// ==========================================
export async function setTutorAvailability(
  tutorId: string,
  data: AvailabilityInput
): Promise<TutorAvailability> {
  const docRef = db.collection('tutor_availability').doc(tutorId);
  const existing = await docRef.get();

  const availabilityData: any = {
    tutorId,
    timezone: data.timezone,
    weeklySchedule: data.weeklySchedule,
    blockedDates: data.blockedDates || [],
    dateOverrides: data.dateOverrides || [],
    slotDuration: data.slotDuration || 60,
    bufferBetweenSlots: data.bufferBetweenSlots || 0,
    advanceBookingDays: data.advanceBookingDays || 30,
    minNoticeHours: data.minNoticeHours || 24,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (!existing.exists) {
    // Create new
    await docRef.set({
      ...availabilityData,
      createdAt: FieldValue.serverTimestamp()
    });
  } else {
    // Update existing
    await docRef.update(availabilityData);
  }

  const updated = await docRef.get();
  return {
    id: updated.id,
    ...updated.data()
  } as TutorAvailability;
}

// ==========================================
// Get available time slots for a specific date
// Returns array of { startTime, endTime, isAvailable }
// ==========================================
export async function getAvailableSlots(
  tutorId: string,
  dateStr: string // YYYY-MM-DD
): Promise<TimeSlot[]> {
  const availability = await getTutorAvailability(tutorId);

  if (!availability) {
    return [];
  }

  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  // Check if date is blocked
  const isBlocked = availability.blockedDates.some(blocked => {
    if (blocked.date === dateStr) {
      return blocked.allDay || true; // Simplified for now
    }
    return false;
  });

  if (isBlocked) {
    return [];
  }

  // Check for date override
  const override = availability.dateOverrides.find(o => o.date === dateStr);

  let daySchedule: WeeklyScheduleSlot | DateOverride | null = null;

  if (override) {
    daySchedule = override;
  } else {
    // Get weekly schedule for this day
    daySchedule = availability.weeklySchedule.find(
      s => s.dayOfWeek === dayOfWeek && s.isActive
    ) || null;
  }

  if (!daySchedule) {
    return []; // No availability this day
  }

  // Generate time slots
  const slots: TimeSlot[] = [];

  const { startTime: dayStart, endTime: dayEnd } = daySchedule;
  const slotDuration = availability.slotDuration;
  const buffer = availability.bufferBetweenSlots;

  let currentTime = timeToMinutes(dayStart);
  const endMinutes = timeToMinutes(dayEnd);

  while (currentTime + slotDuration <= endMinutes) {
    const slotStart = minutesToTime(currentTime);
    const slotEnd = minutesToTime(currentTime + slotDuration);

    // Check if slot is already booked
    const isBooked = await isSlotBooked(tutorId, dateStr, slotStart, slotEnd);

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      isAvailable: !isBooked
    });

    currentTime += slotDuration + buffer;
  }

  return slots;
}

// ==========================================
// Check if a time slot is already booked
// ==========================================
async function isSlotBooked(
  tutorId: string,
  dateStr: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  // Query bookings for this tutor on this date
  const startDate = new Date(`${dateStr}T${startTime}:00`);
  const endDate = new Date(`${dateStr}T${endTime}:00`);

  const bookingsSnapshot = await db.collection('bookings')
    .where('tutorId', '==', tutorId)
    .where('scheduledAt', '>=', Timestamp.fromDate(startDate))
    .where('scheduledAt', '<', Timestamp.fromDate(endDate))
    .where('status', 'in', ['pending', 'confirmed'])
    .get();

  return !bookingsSnapshot.empty;
}

// ==========================================
// Add a blocked date
// ==========================================
export async function addBlockedDate(
  tutorId: string,
  blockedDate: BlockedDate
): Promise<TutorAvailability> {
  const docRef = db.collection('tutor_availability').doc(tutorId);

  await docRef.update({
    blockedDates: FieldValue.arrayUnion(blockedDate),
    updatedAt: FieldValue.serverTimestamp()
  });

  const updated = await docRef.get();
  return {
    id: updated.id,
    ...updated.data()
  } as TutorAvailability;
}

// ==========================================
// Remove a blocked date
// ==========================================
export async function removeBlockedDate(
  tutorId: string,
  dateStr: string
): Promise<TutorAvailability> {
  const availability = await getTutorAvailability(tutorId);

  if (!availability) {
    throw new Error('Tutor availability not found');
  }

  const blockedToRemove = availability.blockedDates.find(b => b.date === dateStr);

  if (!blockedToRemove) {
    throw new Error('Blocked date not found');
  }

  const docRef = db.collection('tutor_availability').doc(tutorId);

  await docRef.update({
    blockedDates: FieldValue.arrayRemove(blockedToRemove),
    updatedAt: FieldValue.serverTimestamp()
  });

  const updated = await docRef.get();
  return {
    id: updated.id,
    ...updated.data()
  } as TutorAvailability;
}

// ==========================================
// Helper: Convert "HH:mm" to minutes since midnight
// ==========================================
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// ==========================================
// Helper: Convert minutes since midnight to "HH:mm"
// ==========================================
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
