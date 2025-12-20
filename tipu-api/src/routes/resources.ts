import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { db } from '../config/firebase';

const router = Router();

// Validation schemas
const createResourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['recording', 'homework', 'guide', 'notes', 'other']),
  subject: z.enum(['Maths', 'Physics', 'Computer Science', 'Python', 'General']),
  level: z.enum(['GCSE', 'A-Level']).optional(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
  studentId: z.string().min(1)
});

/**
 * POST /api/v1/resources
 * Create a new resource metadata entry
 * Auth: Tutor only
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // Check if user is a tutor
    if (user.role !== 'tutor') {
      return res.status(403).json({ error: 'Only tutors can upload resources' });
    }

    // Validate request body
    const validatedData = createResourceSchema.parse(req.body);

    // Verify tutor has taught this student (check bookings)
    const bookingCheck = await db.collection('bookings')
      .where('tutorId', '==', user.uid)
      .where('studentId', '==', validatedData.studentId)
      .limit(1)
      .get();

    if (bookingCheck.empty) {
      return res.status(403).json({ error: 'You have not taught this student' });
    }

    // Create resource document
    const resourceData = {
      ...validatedData,
      uploadedBy: user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const resourceRef = await db.collection('resources').add(resourceData);

    return res.status(201).json({
      id: resourceRef.id,
      ...resourceData
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    next(error);
  }
});

/**
 * GET /api/v1/resources/student/:studentId
 * Get all resources for a specific student
 * Auth: Tutor who uploaded OR student OR student's parent
 */
router.get('/student/:studentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { studentId } = req.params;

    // Check authorization
    let isAuthorized = false;

    if (user.role === 'admin') {
      isAuthorized = true;
    } else if (user.role === 'student' && user.uid === studentId) {
      isAuthorized = true;
    } else if (user.role === 'parent') {
      // Check if student is parent's child
      const parentDoc = await db.collection('users').doc(user.uid).get();
      const parentData = parentDoc.data();
      if (parentData && parentData.childrenIds && parentData.childrenIds.includes(studentId)) {
        isAuthorized = true;
      }
    } else if (user.role === 'tutor') {
      // Check if tutor has taught this student
      const bookingCheck = await db.collection('bookings')
        .where('tutorId', '==', user.uid)
        .where('studentId', '==', studentId)
        .limit(1)
        .get();

      if (!bookingCheck.empty) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'You do not have access to this student\'s resources' });
    }

    // Fetch resources for the student
    const resourcesSnapshot = await db.collection('resources')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .get();

    const resources = resourcesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(resources);

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/resources/:id
 * Delete a resource
 * Auth: Tutor who uploaded only
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Get the resource
    const resourceDoc = await db.collection('resources').doc(id).get();

    if (!resourceDoc.exists) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resourceData = resourceDoc.data();

    // Check if user is the uploader or admin
    if (resourceData.uploadedBy !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete resources you uploaded' });
    }

    // Delete the resource
    await db.collection('resources').doc(id).delete();

    return res.status(200).json({ message: 'Resource deleted successfully' });

  } catch (error) {
    next(error);
  }
});

export default router;
