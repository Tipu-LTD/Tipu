import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as userService from '../services/userService'
import { calculateAge } from '../utils/ageCheck'

const router = Router()

router.post('/register', async (req, res, next) => {
  try {
    const { uid, email, displayName, role, dateOfBirth, parentId, bio, subjects, hourlyRates } = req.body

    // ✅ ENFORCE PARENT REQUIREMENT FOR STUDENTS UNDER 18
    if (role === 'student' && dateOfBirth) {
      const age = calculateAge(new Date(dateOfBirth))

      if (age < 18 && !parentId) {
        return res.status(400).json({
          error: 'Students under 18 must be registered by a parent',
          code: 'PARENT_REQUIRED',
          message: 'Please ask your parent to register and add you as their child.',
        })
      }
    }

    const user = await userService.createUser(uid, {
      email,
      displayName,
      role,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      parentId,
      bio,
      subjects,
      hourlyRates,
    })

    res.status(201).json({
      user,
      message: 'User registered successfully',
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user!.uid)

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

export default router
