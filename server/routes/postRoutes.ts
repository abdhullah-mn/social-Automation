import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import { createPost, listPosts, refreshPost, cancelPost, reschedulePost } from '../controllers/postController.js'
import { presign, confirmUpload } from '../controllers/mediaController.js'
const router = Router()
router.use(requireAuth)
router.get('/', listPosts)
router.post('/', createPost)
router.post('/media/presign', presign)
router.post('/media/:id/confirm', confirmUpload)
router.post('/:id/refresh', refreshPost)
router.patch('/:id/schedule', reschedulePost)
router.delete('/:id', cancelPost)
export default router
