# TIPU ACADEMY - IMPLEMENTATION PLAN
## Next Phases Specification (Weeks 1-9)

**Current Status:** ~60-70% MVP Complete
**Target:** 100% MVP Ready for Production Launch
**Timeline:** 9 Weeks
**Last Updated:** November 2025

---

## 📋 Executive Summary

This document details the implementation of the remaining critical features for TIPU Academy's MVP launch. Based on the current architecture (React + Vite frontend, Express + TypeScript backend, Firebase Firestore), we will implement:

1. **Tutor Availability System** - Calendar-based scheduling
2. **Email Notification System** - Automated emails for key events
3. **Resource Management** - File uploads, Firebase Storage integration
4. **Admin Analytics Dashboard** - Revenue tracking, charts, insights
5. **Real-time Updates** - Optimize messaging and booking updates
6. **Production Deployment** - Backend hosting, security hardening, testing

---

## 🏗️ Current Architecture Reference

**Frontend (tipu-app):**
- React 18 + TypeScript + Vite
- React Router v6
- TanStack Query (React Query)
- shadcn/ui + Tailwind CSS
- Firebase SDK (client)
- Stripe React SDK

**Backend (tipu-api):**
- Express.js + TypeScript
- Firebase Admin SDK
- Firebase Firestore
- Firebase Storage
- Stripe SDK
- Winston Logger
- Port: 8888

**Database:**
- Firebase Firestore (NoSQL)

**Current Collections:**
- ✅ users
- ✅ bookings
- ✅ conversations
- ✅ messages

**Planned Collections:**
- ❌ tutor_availability
- ❌ resources
- ❌ notifications
- ❌ schools (Phase 2)

---

## 📅 PHASE 1: TUTOR AVAILABILITY SYSTEM
**Duration:** Weeks 1-2
**Priority:** Critical
**Dependencies:** None

### Overview
Allow tutors to set their weekly availability (recurring schedule) and block specific dates. Students can only book time slots when tutors are available.

### Database Schema

#### New Collection: `tutor_availability`

```typescript
// Collection: tutor_availability
// Document ID: tutorId (one document per tutor)
{
  id: string                           // Document ID = tutorId
  tutorId: string                      // User UID
  timezone: string                     // e.g., "Europe/London"

  // Recurring weekly schedule
  weeklySchedule: Array<{
    dayOfWeek: number                  // 0-6 (Sunday-Saturday)
    startTime: string                  // "HH:mm" format (e.g., "09:00")
    endTime: string                    // "HH:mm" format (e.g., "17:00")
    isActive: boolean                  // Can disable without deleting
  }>

  // Specific date blocks (holidays, personal time off)
  blockedDates: Array<{
    date: string                       // "YYYY-MM-DD" format
    reason?: string                    // Optional note
    allDay: boolean                    // Block entire day or specific hours
    startTime?: string                 // If !allDay
    endTime?: string                   // If !allDay
  }>

  // Specific date overrides (one-time availability changes)
  dateOverrides: Array<{
    date: string                       // "YYYY-MM-DD"
    startTime: string
    endTime: string
    reason?: string
  }>

  // Settings
  slotDuration: number                 // Minutes per slot (default: 60)
  bufferBetweenSlots: number          // Minutes between bookings (default: 0)
  advanceBookingDays: number          // How far in advance bookings allowed (default: 30)
  minNoticeHours: number              // Minimum notice for bookings (default: 24)

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Example Document:**
```json
{
  "id": "tutor123",
  "tutorId": "tutor123",
  "timezone": "Europe/London",
  "weeklySchedule": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00",
      "isActive": true
    },
    {
      "dayOfWeek": 3,
      "startTime": "14:00",
      "endTime": "20:00",
      "isActive": true
    }
  ],
  "blockedDates": [
    {
      "date": "2025-12-25",
      "reason": "Christmas Day",
      "allDay": true
    }
  ],
  "dateOverrides": [],
  "slotDuration": 60,
  "bufferBetweenSlots": 15,
  "advanceBookingDays": 30,
  "minNoticeHours": 24,
  "createdAt": "2025-11-23T10:00:00Z",
  "updatedAt": "2025-11-23T10:00:00Z"
}
```

### Backend API Endpoints

#### File: `tipu-api/src/routes/availability.ts`

```typescript
import express from 'express';
import { authenticateUser } from '../middleware/auth';
import * as availabilityService from '../services/availabilityService';
import { z } from 'zod';

const router = express.Router();

// ==========================================
// GET /api/v1/availability/tutors/:tutorId
// Get tutor's availability configuration
// ==========================================
router.get('/tutors/:tutorId', async (req, res, next) => {
  try {
    const { tutorId } = req.params;

    const availability = await availabilityService.getTutorAvailability(tutorId);

    if (!availability) {
      return res.status(404).json({
        error: 'Tutor availability not found'
      });
    }

    res.json({ availability });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POST /api/v1/availability/tutors/:tutorId
// Create/Update tutor's availability
// Auth: Tutor only (own availability)
// ==========================================
router.post('/tutors/:tutorId', authenticateUser, async (req, res, next) => {
  try {
    const { tutorId } = req.params;
    const user = req.user;

    // Authorization: only tutor can update their own availability
    if (user.uid !== tutorId && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden'
      });
    }

    // Validate input
    const schema = z.object({
      timezone: z.string(),
      weeklySchedule: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        isActive: z.boolean()
      })),
      blockedDates: z.array(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().optional(),
        allDay: z.boolean(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
      })).optional(),
      dateOverrides: z.array(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        reason: z.string().optional()
      })).optional(),
      slotDuration: z.number().min(15).max(240).optional(),
      bufferBetweenSlots: z.number().min(0).max(60).optional(),
      advanceBookingDays: z.number().min(1).max(90).optional(),
      minNoticeHours: z.number().min(0).max(168).optional()
    });

    const data = schema.parse(req.body);

    const availability = await availabilityService.setTutorAvailability(
      tutorId,
      data
    );

    res.json({ availability });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET /api/v1/availability/tutors/:tutorId/slots
// Get available time slots for a specific date
// Query params: date (YYYY-MM-DD)
// ==========================================
router.get('/tutors/:tutorId/slots', async (req, res, next) => {
  try {
    const { tutorId } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        error: 'Date parameter required (YYYY-MM-DD)'
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const slots = await availabilityService.getAvailableSlots(
      tutorId,
      date
    );

    res.json({
      date,
      tutorId,
      slots
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POST /api/v1/availability/tutors/:tutorId/blocked-dates
// Add a blocked date
// Auth: Tutor only
// ==========================================
router.post('/tutors/:tutorId/blocked-dates', authenticateUser, async (req, res, next) => {
  try {
    const { tutorId } = req.params;
    const user = req.user;

    if (user.uid !== tutorId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().optional(),
      allDay: z.boolean(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
    });

    const data = schema.parse(req.body);

    const availability = await availabilityService.addBlockedDate(
      tutorId,
      data
    );

    res.json({ availability });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE /api/v1/availability/tutors/:tutorId/blocked-dates/:date
// Remove a blocked date
// Auth: Tutor only
// ==========================================
router.delete('/tutors/:tutorId/blocked-dates/:date', authenticateUser, async (req, res, next) => {
  try {
    const { tutorId, date } = req.params;
    const user = req.user;

    if (user.uid !== tutorId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const availability = await availabilityService.removeBlockedDate(
      tutorId,
      date
    );

    res.json({ availability });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Backend Service Layer

#### File: `tipu-api/src/services/availabilityService.ts`

```typescript
import { db } from '../config/firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

interface WeeklyScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface BlockedDate {
  date: string;
  reason?: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
}

interface DateOverride {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface TutorAvailability {
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  data: Partial<TutorAvailability>
): Promise<TutorAvailability> {
  const docRef = db.collection('tutor_availability').doc(tutorId);
  const existing = await docRef.get();

  const availabilityData = {
    tutorId,
    ...data,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (!existing.exists) {
    // Create new
    await docRef.set({
      ...availabilityData,
      createdAt: FieldValue.serverTimestamp(),
      // Defaults
      slotDuration: data.slotDuration || 60,
      bufferBetweenSlots: data.bufferBetweenSlots || 0,
      advanceBookingDays: data.advanceBookingDays || 30,
      minNoticeHours: data.minNoticeHours || 24,
      blockedDates: data.blockedDates || [],
      dateOverrides: data.dateOverrides || []
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
): Promise<Array<{ startTime: string; endTime: string; isAvailable: boolean }>> {
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
  const slots: Array<{ startTime: string; endTime: string; isAvailable: boolean }> = [];

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
```

### Frontend Components

#### 1. Tutor Availability Editor (Tutor Dashboard)

**File:** `tipu-app/src/components/tutors/AvailabilityEditor.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

interface WeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function AvailabilityEditor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySlot[]>([]);
  const [timezone, setTimezone] = useState('Europe/London');

  // Fetch existing availability
  const { data: availability, isLoading } = useQuery({
    queryKey: ['availability', user?.uid],
    queryFn: async () => {
      const response = await apiClient.get(`/availability/tutors/${user?.uid}`);
      return response.data.availability;
    },
    enabled: !!user?.uid
  });

  useEffect(() => {
    if (availability) {
      setWeeklySchedule(availability.weeklySchedule || []);
      setTimezone(availability.timezone || 'Europe/London');
    }
  }, [availability]);

  // Save availability
  const saveMutation = useMutation({
    mutationFn: async (data: { timezone: string; weeklySchedule: WeeklySlot[] }) => {
      const response = await apiClient.post(
        `/availability/tutors/${user?.uid}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', user?.uid] });
      toast.success('Availability updated successfully');
    },
    onError: () => {
      toast.error('Failed to update availability');
    }
  });

  const toggleDay = (dayOfWeek: number) => {
    const existing = weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);

    if (existing) {
      setWeeklySchedule(prev =>
        prev.map(s =>
          s.dayOfWeek === dayOfWeek
            ? { ...s, isActive: !s.isActive }
            : s
        )
      );
    } else {
      setWeeklySchedule(prev => [
        ...prev,
        {
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true
        }
      ]);
    }
  };

  const updateSlotTime = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setWeeklySchedule(prev =>
      prev.map(s =>
        s.dayOfWeek === dayOfWeek
          ? { ...s, [field]: value }
          : s
      )
    );
  };

  const handleSave = () => {
    saveMutation.mutate({
      timezone,
      weeklySchedule: weeklySchedule.filter(s => s.isActive)
    });
  };

  if (isLoading) {
    return <div>Loading availability...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {DAYS.map(day => {
            const slot = weeklySchedule.find(s => s.dayOfWeek === day.value);
            const isActive = slot?.isActive || false;

            return (
              <div key={day.value} className="flex items-center gap-4">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <Label className="w-24">{day.label}</Label>

                {isActive && slot && (
                  <>
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateSlotTime(day.value, 'startTime', e.target.value)
                      }
                      className="w-32"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        updateSlotTime(day.value, 'endTime', e.target.value)
                      }
                      className="w-32"
                    />
                  </>
                )}
              </div>
            );
          })}

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="mt-4"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Availability'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 2. Time Slot Picker (Booking Flow)

**File:** `tipu-app/src/components/bookings/TimeSlotPicker.tsx`

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TimeSlotPickerProps {
  tutorId: string;
  onSelect: (dateTime: Date) => void;
}

export default function TimeSlotPicker({ tutorId, onSelect }: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Fetch available slots for selected date
  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['availability-slots', tutorId, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;

      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await apiClient.get(
        `/availability/tutors/${tutorId}/slots`,
        { params: { date: dateStr } }
      );
      return response.data;
    },
    enabled: !!selectedDate
  });

  const handleSlotClick = (slot: { startTime: string; endTime: string }) => {
    if (!selectedDate) return;

    const [hours, minutes] = slot.startTime.split(':').map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);

    setSelectedSlot(slot.startTime);
    onSelect(dateTime);
  };

  const availableSlots = slotsData?.slots.filter((s: any) => s.isAvailable) || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Date</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => {
            // Disable past dates
            return date < new Date(new Date().setHours(0, 0, 0, 0));
          }}
          className="rounded-md border"
        />
      </div>

      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Available Time Slots</h3>
          {isLoading ? (
            <p>Loading slots...</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-slate-500">No slots available on this date</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot: any) => (
                <Button
                  key={slot.startTime}
                  variant={selectedSlot === slot.startTime ? 'default' : 'outline'}
                  onClick={() => handleSlotClick(slot)}
                  className="text-sm"
                >
                  {slot.startTime}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Frontend Integration Points

#### Update Booking Creation Flow

**File:** `tipu-app/src/pages/Tutors.tsx`

Add TimeSlotPicker to the booking modal:

```typescript
import TimeSlotPicker from '@/components/bookings/TimeSlotPicker';

// In BookingModal component
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Book a Lesson with {tutor.displayName}</DialogTitle>
    </DialogHeader>

    <TimeSlotPicker
      tutorId={tutor.uid}
      onSelect={(dateTime) => {
        setBookingDateTime(dateTime);
      }}
    />

    {/* Rest of booking form */}
  </DialogContent>
</Dialog>
```

### UI/UX Mockups

**Tutor Availability Editor:**
```
┌─────────────────────────────────────────┐
│ Weekly Availability                     │
├─────────────────────────────────────────┤
│                                         │
│ ☐ Sunday                                │
│                                         │
│ ☑ Monday    [09:00] to [17:00]         │
│                                         │
│ ☐ Tuesday                               │
│                                         │
│ ☑ Wednesday [14:00] to [20:00]         │
│                                         │
│ ☑ Thursday  [09:00] to [17:00]         │
│                                         │
│ ☑ Friday    [09:00] to [17:00]         │
│                                         │
│ ☐ Saturday                              │
│                                         │
│ [Save Availability]                     │
└─────────────────────────────────────────┘
```

**Time Slot Picker (Student View):**
```
┌─────────────────────────────────────────┐
│ Select Date                             │
├─────────────────────────────────────────┤
│  [Calendar widget showing month]        │
│                                         │
│  Available Time Slots for Nov 25:       │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │09:00 │ │10:00 │ │11:00 │           │
│  └──────┘ └──────┘ └──────┘           │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │14:00 │ │15:00 │ │16:00 │           │
│  └──────┘ └──────┘ └──────┘           │
│                                         │
│  Selected: Nov 25, 2025 at 14:00       │
│                                         │
│  [Continue to Booking]                  │
└─────────────────────────────────────────┘
```

### Testing Requirements

#### Unit Tests

```typescript
// tipu-api/src/services/__tests__/availabilityService.test.ts

describe('availabilityService', () => {
  describe('getAvailableSlots', () => {
    it('should return empty array if tutor has no availability', async () => {
      const slots = await getAvailableSlots('tutor123', '2025-11-25');
      expect(slots).toEqual([]);
    });

    it('should generate correct time slots based on weekly schedule', async () => {
      // Mock tutor availability
      const slots = await getAvailableSlots('tutor123', '2025-11-25');
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('startTime');
      expect(slots[0]).toHaveProperty('endTime');
      expect(slots[0]).toHaveProperty('isAvailable');
    });

    it('should mark slots as unavailable if already booked', async () => {
      // Create a booking
      // Check that slot is marked unavailable
    });

    it('should respect blocked dates', async () => {
      // Block a date
      const slots = await getAvailableSlots('tutor123', '2025-12-25');
      expect(slots).toEqual([]);
    });
  });
});
```

#### Integration Tests

```typescript
describe('Availability API', () => {
  it('POST /api/v1/availability/tutors/:tutorId - should create availability', async () => {
    const response = await request(app)
      .post('/api/v1/availability/tutors/tutor123')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        timezone: 'Europe/London',
        weeklySchedule: [
          {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '17:00',
            isActive: true
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.availability).toHaveProperty('id');
  });

  it('GET /api/v1/availability/tutors/:tutorId/slots - should return available slots', async () => {
    const response = await request(app)
      .get('/api/v1/availability/tutors/tutor123/slots')
      .query({ date: '2025-11-25' });

    expect(response.status).toBe(200);
    expect(response.body.slots).toBeInstanceOf(Array);
  });
});
```

### OpenAPI Specification Update

Add to `tipu-api/openapi.yaml`:

```yaml
paths:
  /api/v1/availability/tutors/{tutorId}:
    get:
      summary: Get tutor availability configuration
      tags:
        - Availability
      parameters:
        - name: tutorId
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Tutor availability retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  availability:
                    $ref: '#/components/schemas/TutorAvailability'
        404:
          description: Tutor availability not found

    post:
      summary: Create or update tutor availability
      tags:
        - Availability
      security:
        - BearerAuth: []
      parameters:
        - name: tutorId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TutorAvailabilityInput'
      responses:
        200:
          description: Availability updated
        403:
          description: Forbidden

  /api/v1/availability/tutors/{tutorId}/slots:
    get:
      summary: Get available time slots for a specific date
      tags:
        - Availability
      parameters:
        - name: tutorId
          in: path
          required: true
          schema:
            type: string
        - name: date
          in: query
          required: true
          schema:
            type: string
            format: date
            example: "2025-11-25"
      responses:
        200:
          description: Available slots retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  date:
                    type: string
                  tutorId:
                    type: string
                  slots:
                    type: array
                    items:
                      type: object
                      properties:
                        startTime:
                          type: string
                          example: "09:00"
                        endTime:
                          type: string
                          example: "10:00"
                        isAvailable:
                          type: boolean

components:
  schemas:
    TutorAvailability:
      type: object
      properties:
        id:
          type: string
        tutorId:
          type: string
        timezone:
          type: string
        weeklySchedule:
          type: array
          items:
            type: object
            properties:
              dayOfWeek:
                type: integer
                minimum: 0
                maximum: 6
              startTime:
                type: string
                pattern: '^\d{2}:\d{2}$'
              endTime:
                type: string
                pattern: '^\d{2}:\d{2}$'
              isActive:
                type: boolean
        blockedDates:
          type: array
          items:
            type: object
            properties:
              date:
                type: string
                format: date
              reason:
                type: string
              allDay:
                type: boolean
        slotDuration:
          type: integer
        bufferBetweenSlots:
          type: integer
        advanceBookingDays:
          type: integer
        minNoticeHours:
          type: integer
```

### Phase 1 Checklist

- [ ] Create `tutor_availability` collection schema
- [ ] Implement `availabilityService.ts` with all functions
- [ ] Create `availability.ts` routes
- [ ] Add availability routes to server.ts
- [ ] Update OpenAPI spec
- [ ] Create `AvailabilityEditor` component
- [ ] Create `TimeSlotPicker` component
- [ ] Integrate TimeSlotPicker into booking flow
- [ ] Update booking validation to check availability
- [ ] Write unit tests for availabilityService
- [ ] Write integration tests for API endpoints
- [ ] Test UI components
- [ ] Update CLAUDE.md documentation

---

## 📧 PHASE 2: EMAIL NOTIFICATION SYSTEM
**Duration:** Week 3
**Priority:** High
**Dependencies:** Phase 1 (booking availability)

### Overview
Implement automated email notifications for key events using Resend API.

### Architecture

**Email Service Provider:** Resend (already configured in .env)

**Email Types:**
1. **Booking Request** - Sent to tutor when student requests booking
2. **Booking Confirmation** - Sent to student when tutor accepts
3. **Booking Declined** - Sent to student when tutor declines
4. **Lesson Reminder** - Sent 24 hours before scheduled lesson
5. **Lesson Report** - Sent to student/parent after tutor submits report
6. **Payment Receipt** - Sent after successful payment

### Database Schema

#### New Collection: `email_notifications`

```typescript
// Collection: email_notifications
// Track sent emails for debugging and analytics
{
  id: string
  type: 'booking_request' | 'booking_confirmation' | 'booking_declined' |
        'lesson_reminder' | 'lesson_report' | 'payment_receipt'
  recipientEmail: string
  recipientId: string                  // User UID
  subject: string
  templateId?: string                  // Resend template ID if using templates
  metadata: {
    bookingId?: string
    paymentId?: string
    [key: string]: any
  }
  status: 'pending' | 'sent' | 'failed'
  sentAt?: Timestamp
  error?: string
  resendId?: string                    // Resend email ID
  createdAt: Timestamp
}
```

### Backend Implementation

#### File: `tipu-api/src/services/emailService.ts`

```typescript
import { Resend } from 'resend';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'TIPU Academy <noreply@tipuacademy.com>';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  metadata?: Record<string, any>;
}

interface BookingEmailData {
  studentName: string;
  tutorName: string;
  subject: string;
  level: string;
  scheduledAt: string;
  meetingLink?: string;
  declineReason?: string;
  price: string;
  bookingId: string;
}

interface LessonReportEmailData {
  studentName: string;
  tutorName: string;
  subject: string;
  topicsCovered: string;
  homework?: string;
  notes?: string;
  scheduledAt: string;
}

// ==========================================
// Send email and log to database
// ==========================================
async function sendEmail(
  type: string,
  recipientEmail: string,
  recipientId: string,
  options: EmailOptions
): Promise<void> {
  const notificationRef = db.collection('email_notifications').doc();

  try {
    // Create pending notification
    await notificationRef.set({
      id: notificationRef.id,
      type,
      recipientEmail,
      recipientId,
      subject: options.subject,
      metadata: options.metadata || {},
      status: 'pending',
      createdAt: FieldValue.serverTimestamp()
    });

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html
    });

    if (error) {
      throw new Error(error.message);
    }

    // Update notification as sent
    await notificationRef.update({
      status: 'sent',
      sentAt: FieldValue.serverTimestamp(),
      resendId: data?.id
    });
  } catch (error: any) {
    console.error('Email send failed:', error);

    // Update notification as failed
    await notificationRef.update({
      status: 'failed',
      error: error.message
    });

    throw error;
  }
}

// ==========================================
// 1. Booking Request Email (to Tutor)
// ==========================================
export async function sendBookingRequestEmail(
  tutorEmail: string,
  tutorId: string,
  data: BookingEmailData
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 New Booking Request</h1>
          </div>
          <div class="content">
            <p>Hello ${data.tutorName},</p>
            <p>You have a new booking request from <strong>${data.studentName}</strong>.</p>

            <div class="details">
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Level:</strong> ${data.level}</p>
              <p><strong>Scheduled:</strong> ${data.scheduledAt}</p>
              <p><strong>Price:</strong> ${data.price}</p>
            </div>

            <p>Please review and respond to this request:</p>
            <p style="text-align: center;">
              <a href="https://app.tipuacademy.com/bookings/${data.bookingId}" class="button">
                View Booking Request
              </a>
            </p>

            <p style="color: #64748b; font-size: 14px;">
              Booking ID: ${data.bookingId}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    'booking_request',
    tutorEmail,
    tutorId,
    {
      to: tutorEmail,
      subject: `New Booking Request from ${data.studentName}`,
      html,
      metadata: { bookingId: data.bookingId }
    }
  );
}

// ==========================================
// 2. Booking Confirmation Email (to Student)
// ==========================================
export async function sendBookingConfirmationEmail(
  studentEmail: string,
  studentId: string,
  data: BookingEmailData
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .meeting-link { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hello ${data.studentName},</p>
            <p>Great news! ${data.tutorName} has confirmed your booking.</p>

            <div class="details">
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Level:</strong> ${data.level}</p>
              <p><strong>Scheduled:</strong> ${data.scheduledAt}</p>
              <p><strong>Tutor:</strong> ${data.tutorName}</p>
            </div>

            ${data.meetingLink ? `
              <div class="meeting-link">
                <p><strong>Meeting Link:</strong></p>
                <a href="${data.meetingLink}" class="button">Join Lesson</a>
              </div>
            ` : ''}

            <p>We'll send you a reminder 24 hours before your lesson.</p>

            <p style="text-align: center;">
              <a href="https://app.tipuacademy.com/bookings/${data.bookingId}" class="button">
                View Booking Details
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    'booking_confirmation',
    studentEmail,
    studentId,
    {
      to: studentEmail,
      subject: `Lesson Confirmed with ${data.tutorName}`,
      html,
      metadata: { bookingId: data.bookingId }
    }
  );
}

// ==========================================
// 3. Booking Declined Email (to Student)
// ==========================================
export async function sendBookingDeclinedEmail(
  studentEmail: string,
  studentId: string,
  data: BookingEmailData
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f97316; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Update</h1>
          </div>
          <div class="content">
            <p>Hello ${data.studentName},</p>
            <p>Unfortunately, ${data.tutorName} is unable to accept your booking request for ${data.scheduledAt}.</p>

            ${data.declineReason ? `
              <div class="details">
                <p><strong>Reason:</strong> ${data.declineReason}</p>
              </div>
            ` : ''}

            <p>Don't worry! You can:</p>
            <ul>
              <li>Browse other available tutors</li>
              <li>Select a different time slot</li>
              <li>Request a lesson with another tutor</li>
            </ul>

            <p style="text-align: center;">
              <a href="https://app.tipuacademy.com/tutors" class="button">
                Browse Tutors
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    'booking_declined',
    studentEmail,
    studentId,
    {
      to: studentEmail,
      subject: `Booking Update - ${data.subject}`,
      html,
      metadata: { bookingId: data.bookingId }
    }
  );
}

// ==========================================
// 4. Lesson Reminder Email (24h before)
// ==========================================
export async function sendLessonReminderEmail(
  studentEmail: string,
  studentId: string,
  data: BookingEmailData
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .meeting-link { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: center; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Lesson Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${data.studentName},</p>
            <p>Your lesson with ${data.tutorName} is coming up soon!</p>

            <div class="details">
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Level:</strong> ${data.level}</p>
              <p><strong>Scheduled:</strong> ${data.scheduledAt}</p>
              <p><strong>Tutor:</strong> ${data.tutorName}</p>
            </div>

            ${data.meetingLink ? `
              <div class="meeting-link">
                <p><strong>Join your lesson:</strong></p>
                <a href="${data.meetingLink}" class="button">Join Meeting</a>
              </div>
            ` : ''}

            <p>Make sure you have:</p>
            <ul>
              <li>A stable internet connection</li>
              <li>Your notebook and materials ready</li>
              <li>Any questions you want to ask</li>
            </ul>

            <p>See you soon!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    'lesson_reminder',
    studentEmail,
    studentId,
    {
      to: studentEmail,
      subject: `Reminder: Lesson with ${data.tutorName} Tomorrow`,
      html,
      metadata: { bookingId: data.bookingId }
    }
  );
}

// ==========================================
// 5. Lesson Report Email (after session)
// ==========================================
export async function sendLessonReportEmail(
  studentEmail: string,
  studentId: string,
  data: LessonReportEmailData
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .section { margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Lesson Report</h1>
          </div>
          <div class="content">
            <p>Hello ${data.studentName},</p>
            <p>${data.tutorName} has completed your lesson report.</p>

            <div class="details">
              <p><strong>Session Date:</strong> ${data.scheduledAt}</p>
              <p><strong>Subject:</strong> ${data.subject}</p>
            </div>

            <div class="section">
              <h3>Topics Covered</h3>
              <p>${data.topicsCovered}</p>
            </div>

            ${data.homework ? `
              <div class="section">
                <h3>Homework</h3>
                <p>${data.homework}</p>
              </div>
            ` : ''}

            ${data.notes ? `
              <div class="section">
                <h3>Additional Notes</h3>
                <p>${data.notes}</p>
              </div>
            ` : ''}

            <p>Keep up the great work!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    'lesson_report',
    studentEmail,
    studentId,
    {
      to: studentEmail,
      subject: `Lesson Report: ${data.subject} with ${data.tutorName}`,
      html
    }
  );
}

export {
  sendEmail
};
```

#### Update Booking Service to Trigger Emails

**File:** `tipu-api/src/services/bookingService.ts`

```typescript
import * as emailService from './emailService';

// In acceptBooking function
export async function acceptBooking(
  bookingId: string,
  tutorId: string,
  meetingLink: string
): Promise<Booking> {
  // ... existing code ...

  // Send confirmation email to student
  try {
    const student = await getUserById(booking.studentId);
    const tutor = await getUserById(tutorId);

    await emailService.sendBookingConfirmationEmail(
      student.email,
      student.uid,
      {
        studentName: student.displayName,
        tutorName: tutor.displayName,
        subject: booking.subject,
        level: booking.level,
        scheduledAt: booking.scheduledAt.toDate().toLocaleString(),
        meetingLink,
        price: `£${booking.price / 100}`,
        bookingId: booking.id
      }
    );
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    // Don't fail the booking if email fails
  }

  return updatedBooking;
}

// In declineBooking function
export async function declineBooking(
  bookingId: string,
  tutorId: string,
  reason: string
): Promise<Booking> {
  // ... existing code ...

  // Send decline email to student
  try {
    const student = await getUserById(booking.studentId);
    const tutor = await getUserById(tutorId);

    await emailService.sendBookingDeclinedEmail(
      student.email,
      student.uid,
      {
        studentName: student.displayName,
        tutorName: tutor.displayName,
        subject: booking.subject,
        level: booking.level,
        scheduledAt: booking.scheduledAt.toDate().toLocaleString(),
        declineReason: reason,
        price: `£${booking.price / 100}`,
        bookingId: booking.id
      }
    );
  } catch (error) {
    console.error('Failed to send decline email:', error);
  }

  return updatedBooking;
}
```

#### Scheduled Reminder Job

**File:** `tipu-api/src/jobs/lessonReminders.ts`

```typescript
import { db } from '../config/firebase';
import * as emailService from '../services/emailService';
import { getUserById } from '../services/userService';

export async function sendLessonReminders() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Query bookings scheduled for tomorrow
  const bookingsSnapshot = await db.collection('bookings')
    .where('status', '==', 'confirmed')
    .where('scheduledAt', '>=', tomorrow)
    .where('scheduledAt', '<', new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000))
    .get();

  for (const doc of bookingsSnapshot.docs) {
    const booking = doc.data();

    try {
      const student = await getUserById(booking.studentId);
      const tutor = await getUserById(booking.tutorId);

      await emailService.sendLessonReminderEmail(
        student.email,
        student.uid,
        {
          studentName: student.displayName,
          tutorName: tutor.displayName,
          subject: booking.subject,
          level: booking.level,
          scheduledAt: booking.scheduledAt.toDate().toLocaleString(),
          meetingLink: booking.meetingLink,
          price: `£${booking.price / 100}`,
          bookingId: booking.id
        }
      );

      console.log(`Sent reminder for booking ${booking.id}`);
    } catch (error) {
      console.error(`Failed to send reminder for booking ${booking.id}:`, error);
    }
  }
}

// Schedule this to run daily (via cron job or Cloud Functions)
```

### Deployment

#### Option 1: Node-cron (Simple)

```typescript
// tipu-api/src/server.ts
import cron from 'node-cron';
import { sendLessonReminders } from './jobs/lessonReminders';

// Run daily at 10:00 AM
cron.schedule('0 10 * * *', async () => {
  console.log('Running lesson reminder job...');
  await sendLessonReminders();
});
```

#### Option 2: Firebase Cloud Functions (Recommended for Production)

```typescript
// tipu-api/functions/src/index.ts
import * as functions from 'firebase-functions';
import { sendLessonReminders } from './jobs/lessonReminders';

export const dailyReminderJob = functions.pubsub
  .schedule('0 10 * * *')
  .timeZone('Europe/London')
  .onRun(async (context) => {
    await sendLessonReminders();
    return null;
  });
```

### Testing

```typescript
// tipu-api/src/services/__tests__/emailService.test.ts

describe('emailService', () => {
  it('should send booking confirmation email', async () => {
    await sendBookingConfirmationEmail(
      'student@test.com',
      'student123',
      {
        studentName: 'John Doe',
        tutorName: 'Jane Smith',
        subject: 'Maths',
        level: 'GCSE',
        scheduledAt: '2025-11-25 14:00',
        meetingLink: 'https://zoom.us/j/123',
        price: '£45.00',
        bookingId: 'booking123'
      }
    );

    // Verify email logged to database
    const notifications = await db.collection('email_notifications')
      .where('recipientEmail', '==', 'student@test.com')
      .where('type', '==', 'booking_confirmation')
      .get();

    expect(notifications.empty).toBe(false);
    expect(notifications.docs[0].data().status).toBe('sent');
  });
});
```

### Phase 2 Checklist

- [ ] Install Resend SDK: `npm install resend`
- [ ] Create `email_notifications` collection
- [ ] Implement `emailService.ts`
- [ ] Create email templates (HTML)
- [ ] Integrate emails into booking service
- [ ] Create lesson reminder job
- [ ] Set up cron schedule or Cloud Function
- [ ] Test all email types
- [ ] Verify email deliverability
- [ ] Add unsubscribe links (compliance)
- [ ] Update privacy policy

---

## 📁 PHASE 3: RESOURCE MANAGEMENT & FILE STORAGE
**Duration:** Weeks 4-5
**Priority:** Medium-High
**Dependencies:** Phase 1 (for attaching resources to bookings)

### Overview
Implement file upload/download system for teaching materials, session recordings, homework, and parent program resources using Firebase Storage.

### Database Schema

#### Collection: `resources` (already defined, now implementing)

```typescript
{
  id: string
  title: string
  description?: string
  type: 'recording' | 'homework' | 'guide' | 'parent-material' | 'syllabus' | 'lesson-plan'
  subject: 'Maths' | 'Physics' | 'Computer Science' | 'Python' | 'General'
  level?: 'GCSE' | 'A-Level' | 'General'
  examBoard?: string                   // 'AQA', 'Edexcel', 'OCR', etc.

  // File details
  fileUrl: string                      // Firebase Storage download URL
  storagePath: string                  // Firebase Storage path
  fileName: string                     // Original filename
  fileSize: number                     // Bytes
  mimeType: string                     // e.g., 'application/pdf', 'video/mp4'

  // Access control
  uploadedBy: string                   // User UID (tutor or admin)
  isPublic: boolean                    // Public vs student-specific
  studentIds?: string[]                // If private, which students can access
  bookingId?: string                   // Associated with specific booking

  // Metadata
  thumbnailUrl?: string                // For videos
  duration?: number                    // For videos (seconds)
  tags?: string[]                      // Searchable tags

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Firebase Storage Structure

```
tipu-academy-storage/
├── recordings/
│   ├── {bookingId}/
│   │   └── recording_{timestamp}.mp4
├── homework/
│   ├── {studentId}/
│   │   └── {assignmentId}.pdf
├── guides/
│   ├── maths/
│   │   ├── gcse/
│   │   └── a-level/
│   ├── physics/
│   └── computer-science/
├── parent-materials/
│   └── week-{number}/
│       └── guide.pdf
└── user-uploads/
    └── {userId}/
        └── {filename}
```

### Backend API Endpoints

#### File: `tipu-api/src/routes/resources.ts`

```typescript
import express from 'express';
import multer from 'multer';
import { auth
# TIPU ACADEMY - IMPLEMENTATION PLAN (PHASES 3-6)
## Continuation of Next Phases Specification

---

## 📁 PHASE 3: RESOURCE MANAGEMENT & FILE STORAGE
**Duration:** Weeks 4-5
**Priority:** Medium-High
**Dependencies:** Phase 1 (for attaching resources to bookings)

### Overview
Implement complete file upload/download system for teaching materials, session recordings, homework, and parent program resources using Firebase Storage.

### Database Schema

#### Collection: `resources`

```typescript
{
  id: string
  title: string
  description?: string
  type: 'recording' | 'homework' | 'guide' | 'parent-material' | 'syllabus' | 'lesson-plan'
  subject: 'Maths' | 'Physics' | 'Computer Science' | 'Python' | 'General'
  level?: 'GCSE' | 'A-Level' | 'General'
  examBoard?: string

  // File details
  fileUrl: string                      // Firebase Storage download URL
  storagePath: string                  // Firebase Storage path
  fileName: string
  fileSize: number                     // Bytes
  mimeType: string

  // Access control
  uploadedBy: string
  isPublic: boolean
  studentIds?: string[]
  bookingId?: string

  // Metadata
  thumbnailUrl?: string
  duration?: number
  tags?: string[]

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Backend API - Resource Service

**File:** `tipu-api/src/services/resourceService.ts`

```typescript
import { storage, db } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';

export async function uploadResource(
  file: Express.Multer.File,
  metadata: {
    title: string;
    type: string;
    subject: string;
    level?: string;
    uploadedBy: string;
    isPublic: boolean;
    studentIds?: string[];
    bookingId?: string;
  }
) {
  const fileId = uuidv4();
  const storagePath = `${metadata.type}s/${fileId}/${file.originalname}`;

  // Upload to Firebase Storage
  const bucket = storage.bucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  // Make public if needed
  if (metadata.isPublic) {
    await fileRef.makePublic();
  }

  const [fileUrl] = await fileRef.getSignedUrl({
    action: 'read',
    expires: '03-01-2500', // Far future date
  });

  // Create resource document
  const resourceData = {
    id: fileId,
    ...metadata,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    fileUrl,
    storagePath,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection('resources').doc(fileId).set(resourceData);

  return resourceData;
}

export async function getResources(filters: {
  type?: string;
  subject?: string;
  level?: string;
  isPublic?: boolean;
  studentId?: string;
  uploadedBy?: string;
}) {
  let query = db.collection('resources');

  if (filters.type) query = query.where('type', '==', filters.type);
  if (filters.subject) query = query.where('subject', '==', filters.subject);
  if (filters.level) query = query.where('level', '==', filters.level);
  if (filters.isPublic !== undefined) query = query.where('isPublic', '==', filters.isPublic);
  if (filters.uploadedBy) query = query.where('uploadedBy', '==', filters.uploadedBy);

  const snapshot = await query.orderBy('createdAt', 'desc').get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function deleteResource(resourceId: string, userId: string) {
  const resourceDoc = await db.collection('resources').doc(resourceId).get();

  if (!resourceDoc.exists) {
    throw new Error('Resource not found');
  }

  const resource = resourceDoc.data();

  // Check permissions
  if (resource.uploadedBy !== userId) {
    throw new Error('Unauthorized');
  }

  // Delete from Storage
  const bucket = storage.bucket();
  await bucket.file(resource.storagePath).delete();

  // Delete from Firestore
  await db.collection('resources').doc(resourceId).delete();
}
```

### Backend API Routes

**File:** `tipu-api/src/routes/resources.ts`

```typescript
import express from 'express';
import multer from 'multer';
import { authenticateUser } from '../middleware/auth';
import * as resourceService from '../services/resourceService';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

// POST /api/v1/resources - Upload resource
router.post('/', authenticateUser, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, type, subject, level, isPublic, studentIds, bookingId } = req.body;

    const resource = await resourceService.uploadResource(req.file, {
      title,
      type,
      subject,
      level,
      uploadedBy: req.user.uid,
      isPublic: isPublic === 'true',
      studentIds: studentIds ? JSON.parse(studentIds) : undefined,
      bookingId,
    });

    res.json({ resource });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/resources - Get resources with filters
router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const { type, subject, level, isPublic } = req.query;

    const resources = await resourceService.getResources({
      type: type as string,
      subject: subject as string,
      level: level as string,
      isPublic: isPublic === 'true' ? true : undefined,
      studentId: req.user.role === 'student' ? req.user.uid : undefined,
    });

    res.json({ resources });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/resources/:id - Delete resource
router.delete('/:id', authenticateUser, async (req, res, next) => {
  try {
    await resourceService.deleteResource(req.params.id, req.user.uid);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Frontend - Resource Upload Component

**File:** `tipu-app/src/components/resources/ResourceUpload.tsx`

```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ResourceUpload({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('guide');
  const [subject, setSubject] = useState('Maths');
  const [level, setLevel] = useState('GCSE');
  const [isPublic, setIsPublic] = useState(true);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post('/resources', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource uploaded successfully');
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to upload resource');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('subject', subject);
    formData.append('level', level);
    formData.append('isPublic', isPublic.toString());

    uploadMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>File</Label>
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.doc,.docx,.mp4,.mov,.zip"
        />
        {file && (
          <p className="text-sm text-slate-500 mt-1">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <div>
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Quadratic Equations Practice"
          required
        />
      </div>

      <div>
        <Label>Description (Optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the resource..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <option value="guide">Guide</option>
            <option value="homework">Homework</option>
            <option value="recording">Recording</option>
            <option value="syllabus">Syllabus</option>
            <option value="parent-material">Parent Material</option>
          </Select>
        </div>

        <div>
          <Label>Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <option value="Maths">Maths</option>
            <option value="Physics">Physics</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Python">Python</option>
            <option value="General">General</option>
          </Select>
        </div>
      </div>

      <div>
        <Label>Level</Label>
        <Select value={level} onValueChange={setLevel}>
          <option value="GCSE">GCSE</option>
          <option value="A-Level">A-Level</option>
          <option value="General">General</option>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          id="isPublic"
        />
        <Label htmlFor="isPublic">Make publicly accessible</Label>
      </div>

      <Button type="submit" disabled={uploadMutation.isPending || !file}>
        {uploadMutation.isPending ? 'Uploading...' : 'Upload Resource'}
      </Button>
    </form>
  );
}
```

### Frontend - Resource Library

**File:** `tipu-app/src/pages/Resources.tsx`

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import ResourceUpload from '@/components/resources/ResourceUpload';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, FileText, Video, Book } from 'lucide-react';

export default function ResourcesPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    type: '',
    subject: '',
    level: '',
  });

  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ['resources', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.level) params.append('level', filters.level);

      const response = await apiClient.get(`/resources?${params.toString()}`);
      return response.data;
    },
  });

  const resources = resourcesData?.resources || [];

  const getIcon = (type: string) => {
    switch (type) {
      case 'recording':
        return <Video className="w-6 h-6" />;
      case 'guide':
        return <Book className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Resource Library</h1>

        {(user?.role === 'tutor' || user?.role === 'admin') && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>Upload Resource</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Resource</DialogTitle>
              </DialogHeader>
              <ResourceUpload />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          className="px-4 py-2 border rounded"
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
        >
          <option value="">All Subjects</option>
          <option value="Maths">Maths</option>
          <option value="Physics">Physics</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Python">Python</option>
        </select>

        <select
          className="px-4 py-2 border rounded"
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
        >
          <option value="">All Levels</option>
          <option value="GCSE">GCSE</option>
          <option value="A-Level">A-Level</option>
        </select>

        <select
          className="px-4 py-2 border rounded"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="guide">Guides</option>
          <option value="homework">Homework</option>
          <option value="recording">Recordings</option>
          <option value="parent-material">Parent Materials</option>
        </select>
      </div>

      {/* Resource Grid */}
      {isLoading ? (
        <p>Loading resources...</p>
      ) : resources.length === 0 ? (
        <p className="text-slate-500">No resources found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource: any) => (
            <Card key={resource.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-primary-600">
                    {getIcon(resource.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{resource.title}</h3>
                    <p className="text-sm text-slate-500 mb-2">
                      {resource.subject} • {resource.level}
                    </p>
                    {resource.description && (
                      <p className="text-sm text-slate-600 mb-3">
                        {resource.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(resource.fileUrl, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Phase 3 Checklist

- [ ] Install dependencies: `npm install multer uuid`
- [ ] Configure Firebase Storage in backend
- [ ] Implement `resourceService.ts`
- [ ] Create `resources.ts` routes
- [ ] Add multer middleware for file uploads
- [ ] Create `ResourceUpload` component
- [ ] Create `ResourcesPage` component
- [ ] Add Resources link to navigation
- [ ] Configure storage security rules
- [ ] Test file uploads (PDF, video, docs)
- [ ] Implement file size limits
- [ ] Add progress indicator for uploads
- [ ] Test access control (public vs private)

---

## 📊 PHASE 4: ADMIN ANALYTICS & REVENUE DASHBOARD
**Duration:** Week 6
**Priority:** Medium
**Dependencies:** All booking and payment data

### Overview
Build comprehensive admin dashboard with revenue tracking, user statistics, booking analytics, and visual charts.

### Backend Analytics Service

**File:** `tipu-api/src/services/analyticsService.ts`

```typescript
import { db } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export async function getRevenueStats(startDate: Date, endDate: Date) {
  const bookingsSnapshot = await db.collection('bookings')
    .where('status', '==', 'completed')
    .where('isPaid', '==', true)
    .where('createdAt', '>=', Timestamp.fromDate(startDate))
    .where('createdAt', '<=', Timestamp.fromDate(endDate))
    .get();

  const bookings = bookingsSnapshot.docs.map(doc => doc.data());

  const totalRevenue = bookings.reduce((sum, b) => sum + b.price, 0);
  const totalBookings = bookings.length;
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Revenue by subject
  const revenueBySubject = bookings.reduce((acc, b) => {
    acc[b.subject] = (acc[b.subject] || 0) + b.price;
    return acc;
  }, {} as Record<string, number>);

  // Revenue by level
  const revenueByLevel = bookings.reduce((acc, b) => {
    acc[b.level] = (acc[b.level] || 0) + b.price;
    return acc;
  }, {} as Record<string, number>);

  // Daily revenue breakdown
  const dailyRevenue = bookings.reduce((acc, b) => {
    const date = b.createdAt.toDate().toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + b.price;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalRevenue,
    totalBookings,
    averageBookingValue,
    revenueBySubject,
    revenueByLevel,
    dailyRevenue,
  };
}

export async function getUserStats() {
  const [studentsSnap, tutorsSnap, parentsSnap] = await Promise.all([
    db.collection('users').where('role', '==', 'student').count().get(),
    db.collection('users').where('role', '==', 'tutor').count().get(),
    db.collection('users').where('role', '==', 'parent').count().get(),
  ]);

  return {
    totalStudents: studentsSnap.data().count,
    totalTutors: tutorsSnap.data().count,
    totalParents: parentsSnap.data().count,
    totalUsers: studentsSnap.data().count + tutorsSnap.data().count + parentsSnap.data().count,
  };
}

export async function getBookingStats(startDate: Date, endDate: Date) {
  const bookingsSnapshot = await db.collection('bookings')
    .where('createdAt', '>=', Timestamp.fromDate(startDate))
    .where('createdAt', '<=', Timestamp.fromDate(endDate))
    .get();

  const bookings = bookingsSnapshot.docs.map(doc => doc.data());

  const byStatus = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: bookings.length,
    byStatus,
    completionRate: bookings.length > 0
      ? (byStatus.completed || 0) / bookings.length * 100
      : 0,
  };
}

export async function getTopTutors(limit: number = 10) {
  const bookingsSnapshot = await db.collection('bookings')
    .where('status', '==', 'completed')
    .get();

  const tutorStats = bookingsSnapshot.docs.reduce((acc, doc) => {
    const booking = doc.data();
    if (!acc[booking.tutorId]) {
      acc[booking.tutorId] = {
        tutorId: booking.tutorId,
        totalBookings: 0,
        totalRevenue: 0,
      };
    }
    acc[booking.tutorId].totalBookings++;
    acc[booking.tutorId].totalRevenue += booking.price;
    return acc;
  }, {} as Record<string, any>);

  const sorted = Object.values(tutorStats)
    .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);

  // Fetch tutor details
  const tutorsWithDetails = await Promise.all(
    sorted.map(async (stat: any) => {
      const tutorDoc = await db.collection('users').doc(stat.tutorId).get();
      return {
        ...stat,
        tutor: tutorDoc.data(),
      };
    })
  );

  return tutorsWithDetails;
}
```

### Backend API Routes

**File:** `tipu-api/src/routes/analytics.ts`

```typescript
import express from 'express';
import { authenticateUser } from '../middleware/auth';
import * as analyticsService from '../services/analyticsService';

const router = express.Router();

// All analytics routes require admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.use(authenticateUser, requireAdmin);

// GET /api/v1/analytics/revenue
router.get('/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const stats = await analyticsService.getRevenueStats(start, end);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/users
router.get('/users', async (req, res, next) => {
  try {
    const stats = await analyticsService.getUserStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/bookings
router.get('/bookings', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const stats = await analyticsService.getBookingStats(start, end);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/top-tutors
router.get('/top-tutors', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const tutors = await analyticsService.getTopTutors(limit);

    res.json({ tutors });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Frontend - Admin Analytics Dashboard

**File:** `tipu-app/src/pages/dashboard/AdminDashboard.tsx`

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BookOpen, DollarSign, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Fetch analytics data
  const { data: revenueData } = useQuery({
    queryKey: ['analytics-revenue', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await apiClient.get(`/analytics/revenue?${params}`);
      return response.data;
    },
  });

  const { data: userStats } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/users');
      return response.data;
    },
  });

  const { data: bookingStats } = useQuery({
    queryKey: ['analytics-bookings', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await apiClient.get(`/analytics/bookings?${params}`);
      return response.data;
    },
  });

  const { data: topTutorsData } = useQuery({
    queryKey: ['analytics-top-tutors'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/top-tutors?limit=5');
      return response.data;
    },
  });

  // Format data for charts
  const dailyRevenueChart = Object.entries(revenueData?.dailyRevenue || {}).map(([date, revenue]) => ({
    date,
    revenue: (revenue as number) / 100,
  }));

  const subjectRevenueChart = Object.entries(revenueData?.revenueBySubject || {}).map(([subject, revenue]) => ({
    subject,
    revenue: (revenue as number) / 100,
  }));

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Date Range Selector */}
      <div className="flex gap-4 mb-6">
        <input
          type="date"
          value={dateRange.startDate}
          onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          className="px-4 py-2 border rounded"
        />
        <input
          type="date"
          value={dateRange.endDate}
          onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          className="px-4 py-2 border rounded"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-2xl font-bold">
                  £{((revenueData?.totalRevenue || 0) / 100).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Bookings</p>
                <p className="text-2xl font-bold">{bookingStats?.total || 0}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-2xl font-bold">{userStats?.totalUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {bookingStats?.completionRate?.toFixed(1) || 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Subject */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subjectRevenueChart}
                  dataKey="revenue"
                  nameKey="subject"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {subjectRevenueChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Tutors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Tutors</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Tutor</th>
                <th className="text-right py-2">Bookings</th>
                <th className="text-right py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topTutorsData?.tutors.map((item: any) => (
                <tr key={item.tutorId} className="border-b">
                  <td className="py-2">{item.tutor?.displayName}</td>
                  <td className="text-right py-2">{item.totalBookings}</td>
                  <td className="text-right py-2">
                    £{(item.totalRevenue / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Phase 4 Checklist

- [ ] Install chart library: `npm install recharts`
- [ ] Implement `analyticsService.ts`
- [ ] Create `analytics.ts` routes
- [ ] Add admin middleware check
- [ ] Build AdminDashboard component
- [ ] Add revenue charts
- [ ] Add user stats
- [ ] Add booking analytics
- [ ] Add top tutors table
- [ ] Test with real data
- [ ] Add export functionality (CSV/PDF)
- [ ] Add date range filtering

---

## ⚡ PHASE 5: REAL-TIME UPDATES OPTIMIZATION
**Duration:** Week 7
**Priority:** Low-Medium
**Dependencies:** None

### Overview
Optimize messaging and booking updates using Firestore real-time listeners instead of polling.

### Backend - WebSocket Alternative (Firestore Listeners)

**Note:** Since we're using Firestore, we can leverage Firestore's built-in real-time listeners on the client side instead of implementing WebSockets.

### Frontend - Real-time Message Updates

**File:** `tipu-app/src/hooks/useRealtimeMessages.ts`

```typescript
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

export function useRealtimeMessages(conversationId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(newMessages);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching messages:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  return { messages, isLoading, error };
}
```

### Frontend - Real-time Booking Updates

**File:** `tipu-app/src/hooks/useRealtimeBookings.ts`

```typescript
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimeBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const bookingsRef = collection(db, 'bookings');

    // Query based on user role
    const q = user.role === 'student'
      ? query(bookingsRef, where('studentId', '==', user.uid), orderBy('scheduledAt', 'desc'))
      : query(bookingsRef, where('tutorId', '==', user.uid), orderBy('scheduledAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBookings(newBookings);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { bookings, isLoading };
}
```

### Update Chat Component to Use Real-time

**File:** `tipu-app/src/components/chat/ChatWindow.tsx`

```typescript
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

export default function ChatWindow({ conversationId }: { conversationId: string }) {
  // Use real-time hook instead of React Query
  const { messages, isLoading } = useRealtimeMessages(conversationId);

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      await apiClient.post(`/messages/conversations/${conversationId}/messages`, {
        text,
      });
    },
  });

  // Rest of component...
}
```

### Phase 5 Checklist

- [ ] Create `useRealtimeMessages` hook
- [ ] Create `useRealtimeBookings` hook
- [ ] Update ChatWindow to use real-time messages
- [ ] Update booking lists to use real-time data
- [ ] Add optimistic UI updates
- [ ] Test connection handling
- [ ] Test offline behavior
- [ ] Add reconnection logic
- [ ] Performance test with many messages

---

## 🧪 PHASE 6: TESTING, POLISH & PRODUCTION DEPLOYMENT
**Duration:** Weeks 8-9
**Priority:** Critical
**Dependencies:** All previous phases

### Testing Strategy

#### 1. Unit Tests (Backend)

**File:** `tipu-api/src/services/__tests__/availabilityService.test.ts`

```typescript
import { getTutorAvailability, getAvailableSlots } from '../availabilityService';

describe('Availability Service', () => {
  beforeEach(() => {
    // Setup test data
  });

  afterEach(() => {
    // Cleanup
  });

  test('should return null for non-existent tutor', async () => {
    const availability = await getTutorAvailability('nonexistent');
    expect(availability).toBeNull();
  });

  test('should generate correct time slots', async () => {
    const slots = await getAvailableSlots('tutor123', '2025-12-01');
    expect(slots).toBeInstanceOf(Array);
    expect(slots.length).toBeGreaterThan(0);
  });
});
```

#### 2. Integration Tests (API)

**File:** `tipu-api/src/__tests__/integration/bookings.test.ts`

```typescript
import request from 'supertest';
import app from '../../server';

describe('Bookings API', () => {
  let studentToken: string;
  let tutorToken: string;

  beforeAll(async () => {
    // Create test users and get tokens
  });

  test('POST /api/v1/bookings - should create booking', async () => {
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        tutorId: 'test-tutor',
        subject: 'Maths',
        level: 'GCSE',
        scheduledAt: new Date(),
        price: 4500,
      });

    expect(response.status).toBe(201);
    expect(response.body.booking).toHaveProperty('id');
  });
});
```

#### 3. Frontend Component Tests

**File:** `tipu-app/src/components/__tests__/BookingCard.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import BookingCard from '../bookings/BookingCard';

describe('BookingCard', () => {
  const mockBooking = {
    id: '1',
    subject: 'Maths',
    level: 'GCSE',
    scheduledAt: new Date(),
    status: 'pending',
  };

  test('renders booking details', () => {
    render(<BookingCard booking={mockBooking} />);

    expect(screen.getByText('Maths')).toBeInTheDocument();
    expect(screen.getByText('GCSE')).toBeInTheDocument();
  });
});
```

### Production Deployment

#### Backend Deployment (Railway/Render)

**1. Railway Deployment:**

```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health"
  }
}
```

**2. Environment Variables:**

Set in Railway/Render dashboard:
```
PORT=8888
NODE_ENV=production
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
ALLOWED_ORIGINS=https://tipuacademy.com,https://app.tipuacademy.com
```

**3. Deploy Commands:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

#### Frontend Deployment (Lovable)

Already deployed at: https://e85f917e-442a-4cd9-8b6c-ece9d8844a07.lovableproject.com

**Update API URL:**

```typescript
// tipu-app/src/lib/api/client.ts
const API_URL = import.meta.env.VITE_API_URL || 'https://api.tipuacademy.com';
```

### Security Hardening

#### 1. Firestore Security Rules

**File:** `tipu-api/firebase/firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isTutor() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'tutor';
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }

    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if isAuthenticated() && (
        resource.data.studentId == request.auth.uid ||
        resource.data.tutorId == request.auth.uid ||
        isAdmin()
      );
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        resource.data.tutorId == request.auth.uid ||
        isAdmin()
      );
      allow delete: if isAdmin();
    }

    // Conversations
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() &&
        request.auth.uid in resource.data.participantIds;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() &&
        request.auth.uid in resource.data.participantIds;

      match /messages/{messageId} {
        allow read: if isAuthenticated() &&
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds;
        allow create: if isAuthenticated();
      }
    }

    // Resources
    match /resources/{resourceId} {
      allow read: if isAuthenticated() && (
        resource.data.isPublic == true ||
        request.auth.uid in resource.data.studentIds ||
        resource.data.uploadedBy == request.auth.uid ||
        isAdmin()
      );
      allow create: if isTutor() || isAdmin();
      allow update: if resource.data.uploadedBy == request.auth.uid || isAdmin();
      allow delete: if resource.data.uploadedBy == request.auth.uid || isAdmin();
    }

    // Tutor Availability
    match /tutor_availability/{tutorId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(tutorId) || isAdmin();
    }
  }
}
```

**Deploy Rules:**

```bash
firebase deploy --only firestore:rules
```

#### 2. Firebase Storage Rules

**File:** `tipu-api/firebase/storage.rules`

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recordings/{bookingId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /homework/{studentId}/{fileName} {
      allow read: if request.auth != null && request.auth.uid == studentId;
      allow write: if request.auth != null && request.auth.uid == studentId;
    }

    match /guides/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /parent-materials/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Performance Optimization

#### 1. Database Indexing

Create composite indexes in Firestore Console:

```
Collection: bookings
- studentId (Ascending) + scheduledAt (Descending)
- tutorId (Ascending) + scheduledAt (Descending)
- status (Ascending) + createdAt (Descending)

Collection: resources
- subject (Ascending) + level (Ascending)
- type (Ascending) + isPublic (Ascending)
```

#### 2. Frontend Optimizations

```typescript
// Lazy load routes
const StudentDashboard = lazy(() => import('./pages/dashboard/StudentDashboard'));
const TutorDashboard = lazy(() => import('./pages/dashboard/TutorDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboard/AdminDashboard'));

// Use React Query caching
queryClient.setDefaultOptions({
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
});
```

### Final Deployment Checklist

**Backend:**
- [ ] Deploy to Railway/Render
- [ ] Configure environment variables
- [ ] Set up custom domain (api.tipuacademy.com)
- [ ] Configure SSL certificate
- [ ] Deploy Firestore security rules
- [ ] Deploy Storage security rules
- [ ] Set up Stripe webhook endpoint
- [ ] Configure CORS for production domains
- [ ] Enable logging and monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure database backups

**Frontend:**
- [ ] Update API URL to production
- [ ] Update Stripe publishable key (live)
- [ ] Build production bundle
- [ ] Deploy to Lovable (or custom hosting)
- [ ] Set up custom domain (app.tipuacademy.com)
- [ ] Configure SSL
- [ ] Test all critical user flows
- [ ] Enable analytics (Google Analytics)
- [ ] Add error boundary
- [ ] Test on mobile devices

**General:**
- [ ] Load testing (artillery/k6)
- [ ] Security audit
- [ ] GDPR compliance check
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Email templates tested
- [ ] Payment flow tested end-to-end
- [ ] User acceptance testing
- [ ] Create deployment runbook
- [ ] Set up monitoring alerts

---

## 📊 FINAL SUCCESS METRICS

**MVP Complete When:**
- ✅ Tutors can set weekly availability
- ✅ Students can only book available slots
- ✅ Automated emails sent for all key events
- ✅ Session recordings can be uploaded/downloaded
- ✅ Teaching materials library functional
- ✅ Admin can view revenue analytics and charts
- ✅ Real-time messaging works smoothly
- ✅ All security rules deployed
- ✅ Backend deployed to production
- ✅ 95%+ uptime achieved
- ✅ < 2s page load times
- ✅ All tests passing
- ✅ GDPR compliant

**Post-MVP Enhancements (Future):**
- Parent program content and features
- School management system
- Syllabus progress tracking
- SMS notifications
- Mobile apps (iOS/Android)
- Video integration (embedded lessons)
- Referral system
- Multi-currency support
- Advanced analytics
- AI-powered tutor matching

---

## 📝 DOCUMENTATION UPDATES

### Update CLAUDE.md

After completing all phases, update the main CLAUDE.md file:

- Change status from "~60-70% Complete" to "100% MVP Complete"
- Update implementation status section with all ✅
- Add production URLs
- Update deployment checklist
- Add post-launch roadmap

### Create API Documentation

Generate interactive API docs:

```bash
# Generate from OpenAPI spec
npx redoc-cli bundle tipu-api/openapi.yaml -o tipu-api/docs/api.html

# Host on static site
```

### User Documentation

Create user guides:
- Student guide (how to book, use resources)
- Tutor guide (set availability, conduct lessons, upload materials)
- Parent guide (monitor progress, use parent program)
- Admin guide (manage users, view analytics)

---

## 🎉 CONCLUSION

This implementation plan provides a complete roadmap to take TIPU Academy from 60-70% MVP to 100% production-ready. Each phase builds on the previous one with:

- **Detailed technical specifications**
- **Complete code examples**
- **Database schemas**
- **API endpoint definitions**
- **Frontend components**
- **Testing requirements**
- **Deployment procedures**

**Total Timeline:** 9 weeks
**Total Effort:** ~360 hours of development

Follow this plan systematically, complete each phase's checklist before moving to the next, and you'll have a fully functional, production-ready tutoring platform ready to launch! 🚀
