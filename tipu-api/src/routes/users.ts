import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as userService from '../services/userService'

const router = Router()

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.params.id)
    res.json(user)
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Only allow users to update their own profile (or admin)
    if (req.params.id !== req.user!.uid && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await userService.updateUserProfile(req.params.id, req.body)
    return res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    next(error)
  }
})

router.get('/tutors/all', authenticate, async (_req, res, next) => {
  try {
    const tutors = await userService.getAllTutors()
    res.json({ tutors })
  } catch (error) {
    next(error)
  }
})

router.get('/tutors/subject/:subject', authenticate, async (req, res, next) => {
  try {
    const tutors = await userService.getTutorsBySubject(req.params.subject)
    res.json({ tutors })
  } catch (error) {
    next(error)
  }
})

export default router
