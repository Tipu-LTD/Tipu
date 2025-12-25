import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as userService from '../services/userService'
import { updateUserSchema, createChildSchema } from '../schemas/user.schema'
import { auth } from '../config/firebase'
import { ZodError } from 'zod'

const router = Router()

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const currentUser = req.user!
    const targetUserId = req.params.id

    // Fetch target user first (needed for authorization check)
    const targetUser = await userService.getUserProfile(targetUserId)

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Authorization check
    const isOwner = currentUser.uid === targetUserId
    const isAdmin = currentUser.role === 'admin'
    const isParentOfChild = currentUser.role === 'parent' &&
                            currentUser.childrenIds?.includes(targetUserId)
    const isTutorProfile = targetUser.role === 'tutor' && targetUser.isApproved
    const isTutorViewingStudent = currentUser.role === 'tutor' && targetUser.role === 'student'

    if (!isOwner && !isAdmin && !isParentOfChild && !isTutorProfile && !isTutorViewingStudent) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    res.json(targetUser)
  } catch (error) {
    return next(error)
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const currentUser = req.user!
    const targetUserId = req.params.id

    // Only allow users to update their own profile (or admin)
    if (targetUserId !== currentUser.uid && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Validate input
    const validatedData = updateUserSchema.parse(req.body)

    await userService.updateUserProfile(
      targetUserId,
      validatedData,
      currentUser.role!,
      currentUser.uid
    )

    return res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    return next(error)
  }
})

router.get('/tutors/all', authenticate, async (_req, res, next) => {
  try {
    const tutors = await userService.getAllTutors()
    res.json({ tutors })
  } catch (error) {
    return next(error)
  }
})

router.get('/tutors/subject/:subject', authenticate, async (req, res, next) => {
  try {
    const tutors = await userService.getTutorsBySubject(req.params.subject)
    res.json({ tutors })
  } catch (error) {
    return next(error)
  }
})

export default router
