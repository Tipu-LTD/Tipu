import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as userService from '../services/userService'

const router = Router()

router.post('/register', async (req, res, next) => {
  try {
    const { uid, email, displayName, role, dateOfBirth, parentId } = req.body

    const user = await userService.createUser(uid, {
      email,
      displayName,
      role,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      parentId,
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
