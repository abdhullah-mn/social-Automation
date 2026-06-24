import { Router } from 'express'
import { register, login, refresh, logout, getMe } from '../controllers/authController.js'
import requireAuth from '../middleware/requireAuth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.get('/me', requireAuth, getMe)

export default router
