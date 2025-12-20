import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { ApiError } from '../middleware/errorHandler'
import { z } from 'zod'

const router = Router()

const suggestLessonSchema = z.object({
  studentId: z.string().min(1, 'Student ID required'),
  subject: z.enum(['Maths', 'Physics', 'Computer Science', 'Python']),
  level: z.enum(['GCSE', 'A-Level']),
  scheduledAt: z.string().datetime('Invalid date format'),
  duration: z.number().int().min(15).max(300).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/v1/tutors/my-students
 * Get all students this tutor has taught or is teaching
 * Returns student profiles with statistics (total lessons, upcoming lessons)
 */
router.get('/my-students', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const tutorId = req.user!.uid

    if (req.user!.role !== 'tutor') {
      throw new ApiError('Only tutors can access this endpoint', 403)
    }

    // Get all bookings for this tutor
    const bookingsSnapshot = await db
      .collection('bookings')
      .where('tutorId', '==', tutorId)
      .orderBy('createdAt', 'desc')
      .get()

    // Get unique student IDs
    const studentIds = [
      ...new Set(bookingsSnapshot.docs.map((doc) => doc.data().studentId)),
    ]

    // Fetch student profiles
    const studentDocs = await Promise.all(
      studentIds.map((id) => db.collection('users').doc(id).get())
    )

    const students = studentDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const studentData = doc.data()!
        const studentId = doc.id

        // Calculate statistics
        const now = new Date()
        const totalLessons = bookingsSnapshot.docs.filter(
          (b) => b.data().studentId === studentId && b.data().status === 'completed'
        ).length

        const upcomingLessons = bookingsSnapshot.docs.filter(
          (b) => b.data().studentId === studentId &&
                 b.data().status === 'confirmed' &&
                 b.data().scheduledAt.toDate() >= now
        ).length

        return {
          uid: studentId,
          email: studentData.email || '',
          displayName: studentData.displayName || 'Unknown Student',
          photoURL: studentData.photoURL,
          enrolledSubjects: studentData.enrolledSubjects || [],
          totalLessons,
          upcomingLessons,
        }
      })
      .sort((a, b) => {
        // Sort by upcoming lessons (descending), then total lessons (descending)
        if (b.upcomingLessons !== a.upcomingLessons) {
          return b.upcomingLessons - a.upcomingLessons;
        }
        return b.totalLessons - a.totalLessons;
      })

    res.json(students)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/v1/tutors/students/:studentId/lesson-reports
 * Get all lesson reports for a specific student taught by this tutor
 * Returns completed bookings with lesson reports
 */
router.get('/students/:studentId/lesson-reports', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const tutorId = req.user!.uid
    const { studentId } = req.params

    if (req.user!.role !== 'tutor') {
      throw new ApiError('Only tutors can access this endpoint', 403)
    }

    // Verify tutor has taught this student
    const verifyBooking = await db
      .collection('bookings')
      .where('tutorId', '==', tutorId)
      .where('studentId', '==', studentId)
      .limit(1)
      .get()

    if (verifyBooking.empty) {
      throw new ApiError('You have not taught this student', 403)
    }

    // Get all completed bookings with lesson reports
    const bookingsSnapshot = await db
      .collection('bookings')
      .where('tutorId', '==', tutorId)
      .where('studentId', '==', studentId)
      .where('status', '==', 'completed')
      .orderBy('scheduledAt', 'desc')
      .get()

    const reports = bookingsSnapshot.docs
      .filter((doc) => doc.data().lessonReport)
      .map((doc) => {
        const booking = doc.data()
        return {
          bookingId: doc.id,
          scheduledAt: booking.scheduledAt,
          subject: booking.subject,
          level: booking.level,
          duration: booking.duration,
          ...booking.lessonReport,
        }
      })

    res.json(reports)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/v1/tutors/suggest-lesson
 * Tutor suggests a lesson time to a student (requires parent approval)
 */
router.post('/suggest-lesson', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const tutorId = req.user!.uid

    if (req.user!.role !== 'tutor') {
      throw new ApiError('Only tutors can suggest lessons', 403)
    }

    // Validate input
    const validatedInput = suggestLessonSchema.parse(req.body)

    // Verify tutor has taught this student before
    const previousBookings = await db
      .collection('bookings')
      .where('tutorId', '==', tutorId)
      .where('studentId', '==', validatedInput.studentId)
      .limit(1)
      .get()

    if (previousBookings.empty) {
      throw new ApiError('Can only suggest lessons to students you have taught before', 400)
    }

    // Get student's parent
    const studentDoc = await db.collection('users').doc(validatedInput.studentId).get()

    if (!studentDoc.exists) {
      throw new ApiError('Student not found', 404)
    }

    const student = studentDoc.data()

    if (!student?.parentId) {
      throw new ApiError('Student must have a parent to approve booking', 400)
    }

    // Calculate price based on tutor's rates
    const tutorDoc = await db.collection('users').doc(tutorId).get()
    const tutor = tutorDoc.data()
    const price = tutor?.hourlyRates?.[validatedInput.level] || (validatedInput.level === 'GCSE' ? 4500 : 6000)

    // Create booking with tutor-suggested status
    const bookingRef = await db.collection('bookings').add({
      studentId: validatedInput.studentId,
      tutorId,
      subject: validatedInput.subject,
      level: validatedInput.level,
      scheduledAt: new Date(validatedInput.scheduledAt),
      duration: validatedInput.duration || 60,
      price,
      status: 'tutor-suggested',
      initiatedBy: 'tutor',
      suggestedAt: FieldValue.serverTimestamp(),
      tutorNotes: validatedInput.notes,
      isPaid: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.status(201).json({
      id: bookingRef.id,
      message: 'Lesson suggestion sent to parent for approval',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }
    next(error)
  }
})

export default router
