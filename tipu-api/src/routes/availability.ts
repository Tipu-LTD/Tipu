import express, { Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
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

    return res.json({ availability });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POST /api/v1/availability/tutors/:tutorId
// Create/Update tutor's availability
// Auth: Tutor only (own availability)
// ==========================================
router.post('/tutors/:tutorId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tutorId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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

    return res.json({ availability });
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

    return res.json({
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
router.post('/tutors/:tutorId/blocked-dates', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tutorId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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

    return res.json({ availability });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE /api/v1/availability/tutors/:tutorId/blocked-dates/:date
// Remove a blocked date
// Auth: Tutor only
// ==========================================
router.delete('/tutors/:tutorId/blocked-dates/:date', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tutorId, date } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.uid !== tutorId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const availability = await availabilityService.removeBlockedDate(
      tutorId,
      date
    );

    return res.json({ availability });
  } catch (error) {
    next(error);
  }
});

export default router;
