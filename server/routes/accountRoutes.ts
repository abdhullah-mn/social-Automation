import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import { generateAuthUrl, syncAccounts, getConnectedAccounts, disconnectAccount } from '../controllers/socialAuthController.js'
const router = Router()
router.use(requireAuth)
router.get('/', getConnectedAccounts)
router.post('/sync', syncAccounts)
router.post('/connect/:platform', generateAuthUrl)
router.delete('/:accountId', disconnectAccount)
export default router
