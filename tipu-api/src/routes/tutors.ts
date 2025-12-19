import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { db } from '../config/firebase'
import { ApiError } from '../middleware/errorHandler'

const router = Router()

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
        const totalLessons = bookingsSnapshot.docs.filter(
          (b) => b.data().studentId === studentId && b.data().status === 'completed'
        ).length

        const upcomingLessons = bookingsSnapshot.docs.filter(
          (b) => b.data().studentId === studentId && b.data().status === 'confirmed'
        ).length

        return {
          uid: studentId,
          email: studentData.email,
          displayName: studentData.displayName,
          photoURL: studentData.photoURL,
          enrolledSubjects: studentData.enrolledSubjects || [],
          totalLessons,
          upcomingLessons,
        }
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

export default router
