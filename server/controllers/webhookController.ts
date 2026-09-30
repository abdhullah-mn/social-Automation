import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import { HttpError, zernio } from '../config/zernio.js'
import { Post } from '../models/Post.js'
import User from '../models/User.js'
import { applyProviderPost } from './postController.js'
import { syncUserAccounts } from '../services/accounts.js'

export async function webhook(req: Request, res: Response) {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET
  if (!secret) throw new HttpError(503, 'Webhook not configured')
  const signature = req.get('X-Zernio-Signature') || ''
  if (!/^[a-f\d]{64}$/.test(signature) || !Buffer.isBuffer(req.body)) throw new HttpError(401, 'Invalid signature')
  const expected = createHmac('sha256', secret).update(req.body).digest()
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new HttpError(401, 'Invalid signature')
  let event
  try { event = JSON.parse(req.body.toString('utf8')) }
  catch { throw new HttpError(400, 'Invalid JSON') }
  // Retrieve current provider state, so duplicate/out-of-order deliveries do not regress status.
  if (typeof event.event === 'string' && event.event.startsWith('post.')) {
    const id = event.post?.id || event.post?._id
    if (typeof id === 'string') {
      const post = await Post.findOne({ zernioPostId: id })
      if (post && post.status !== 'cancelled') await applyProviderPost(post, (await zernio.getPost(id)).post)
    }
  } else if (['account.connected', 'account.disconnected'].includes(event.event)) {
    const id = event.account?.profileId
    if (typeof id === 'string') {
      const user = await User.findOne({ zernioProfileId: id, zernioBindingVersion: 1 })
      if (user) await syncUserAccounts(user._id.toString())
    }
  }
  res.json({ received: true })
}
