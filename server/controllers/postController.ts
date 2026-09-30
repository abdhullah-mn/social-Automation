import { createHash } from 'node:crypto'
import type { Response } from 'express'
import type { AuthRequest } from '../middleware/requireAuth.js'
import { Post } from '../models/Post.js'
import { Media } from '../models/Media.js'
import { HttpError, zernio, type ProviderPost, type PostBody } from '../config/zernio.js'
import { ownedAccounts, providerId } from '../services/accounts.js'

const objectId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
export function postPayload(post: InstanceType<typeof Post>) {
  return { id: post._id.toString(), content: post.content, accountIds: post.accountIds.map(String),
    mediaIds: post.mediaIds.map(String), mediaItems: post.mediaItems, mode: post.mode,
    scheduledFor: post.scheduledFor, timezone: post.timezone, status: post.status,
    error: post.error, results: post.results, createdAt: post.createdAt, requestId: post.requestId }
}

export async function applyProviderPost(post: InstanceType<typeof Post>, remote: ProviderPost) {
  if (!remote?._id || !remote.status) throw new HttpError(502, 'Provider returned an incomplete post. Retry the same submission.')
  post.zernioPostId = remote._id
  post.status = remote.status
  if (remote.scheduledFor && Number.isFinite(Date.parse(remote.scheduledFor))) post.scheduledFor = new Date(remote.scheduledFor)
  post.error = undefined
  post.results = (remote.platforms || []).map((entry) => ({ platform: entry.platform,
    accountId: providerId(entry.accountId), status: entry.status || 'pending',
    url: entry.platformPostUrl || entry.publishedUrl, error: entry.errorMessage })) as typeof post.results
  post.processingUntil = undefined
  await post.save()
  return post
}

export async function listPosts(req: AuthRequest, res: Response) {
  const posts = await Post.find({ user: req.user!.id }).sort({ createdAt: -1 }).limit(100)
  res.json({ posts: posts.map(postPayload) })
}

export async function createPost(req: AuthRequest, res: Response) {
  const user = req.user!.id
  const { requestId, content, accountIds, mediaIds = [], mode, scheduledFor, timezone = 'UTC' } = req.body || {}
  if (typeof requestId !== 'string' || !/^[a-f\d-]{36}$/i.test(requestId) ||
    typeof content !== 'string' || content.length > 60000 || !['draft', 'now', 'schedule'].includes(mode) ||
    !Array.isArray(accountIds) || accountIds.length > 20 || !accountIds.every(objectId) ||
    new Set(accountIds).size !== accountIds.length || !Array.isArray(mediaIds) || mediaIds.length > 10 ||
    !mediaIds.every(objectId) || new Set(mediaIds).size !== mediaIds.length || (!content.trim() && !mediaIds.length)) {
    throw new HttpError(400, 'Provide content or media and valid account selections.')
  }
  if (typeof timezone !== 'string') throw new HttpError(400, 'Invalid timezone')
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }) }
  catch { throw new HttpError(400, 'Invalid timezone') }
  const date = mode === 'schedule' && typeof scheduledFor === 'string' ? new Date(scheduledFor) : undefined
  if (mode === 'schedule' && (!date || !Number.isFinite(date.getTime()) || !/[zZ]|[+-]\d\d:\d\d$/.test(scheduledFor))) {
    throw new HttpError(400, 'Provide a schedule time with timezone offset.')
  }
  const payloadHash = createHash('sha256').update(JSON.stringify({ content, accountIds, mediaIds, mode, scheduledFor, timezone })).digest('hex')
  let post = await Post.findOne({ user, requestId }).select('+providerBody')
  if (post && post.payloadHash !== payloadHash) throw new HttpError(409, 'This submission ID was already used. Start a new post.')
  if (post?.zernioPostId || post?.status === 'draft') return void res.json({ post: postPayload(post) })
  if (post && Date.now() - post.createdAt.getTime() > 23 * 60 * 60 * 1000) {
    throw new HttpError(409, 'The retry window has expired. Ask support to reconcile this post before posting again.')
  }
  if (date && date.getTime() < Date.now() + 60_000) throw new HttpError(400, 'Schedule at least one minute in the future.')
  const accounts = accountIds.length ? await ownedAccounts(user, accountIds) : []
  if (mode !== 'draft' && !accounts.length) throw new HttpError(400, 'Select at least one connected account.')
  const foundMedia = await Media.find({ user, _id: { $in: mediaIds }, ready: true })
  if (foundMedia.length !== mediaIds.length) throw new HttpError(403, 'One or more uploads are incomplete or do not belong to you.')
  const media = (mediaIds as string[]).map((id) => foundMedia.find((item) => item._id.toString() === id)!)
  if (media.some((item) => (date?.getTime() || Date.now()) - item.createdAt.getTime() > 6 * 86400000)) {
    throw new HttpError(400, 'These temporary uploads will expire before publishing. Re-upload media and schedule within six days.')
  }
  if (mode !== 'draft' && accounts.some((a) => a.platform === 'instagram') && !media.length) {
    throw new HttpError(400, 'Instagram requires an image or video.')
  }
  if (!post) {
    const providerBody: PostBody = { content, platforms: accounts.map((a) => ({ platform: a.platform, accountId: a.zernioAccountId })),
      mediaItems: media.map((m) => ({ type: m.contentType.startsWith('image/') ? 'image' : 'video', url: m.url })),
      isDraft: false, publishNow: mode === 'now', ...(date ? { scheduledFor: date.toISOString() } : {}), timezone }
    try {
      post = await Post.create({ user, requestId, payloadHash, content, accountIds, mediaIds, mode, timezone,
        scheduledFor: date, providerBody, status: mode === 'draft' ? 'draft' : 'pending',
        mediaItems: media.map((m) => ({ type: m.contentType.startsWith('image/') ? 'image' : 'video', url: m.url, filename: m.filename })) })
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new HttpError(409, 'This submission is in progress. Refresh before retrying.')
      throw error
    }
  }
  if (mode === 'draft') return void res.status(201).json({ post: postPayload(post) })
  const claimed = await Post.findOneAndUpdate({ _id: post._id, user, zernioPostId: { $exists: false },
    $or: [{ processingUntil: { $exists: false } }, { processingUntil: { $lt: new Date() } }] },
    { $set: { status: 'submitting', processingUntil: new Date(Date.now() + 120000) } }, { returnDocument: 'after' }).select('+providerBody')
  if (!claimed) throw new HttpError(409, 'This post is already being submitted. Refresh its status shortly.')
  try {
    const remote = await zernio.createPost(claimed.providerBody as PostBody, `${user}:${requestId}`)
    await applyProviderPost(claimed, remote.post)
    res.status(201).json({ post: postPayload(claimed) })
  } catch (error) {
    // Keep the immutable body and key for safe recovery after an ambiguous timeout.
    await Post.updateOne({ _id: claimed._id }, { $set: { status: 'unconfirmed', error: error instanceof Error ? error.message : 'Submission failed' }, $unset: { processingUntil: '' } })
    throw error
  }
}

async function ownedPost(req: AuthRequest) {
  if (!objectId(req.params.id)) throw new HttpError(404, 'Post not found')
  const post = await Post.findOne({ _id: req.params.id, user: req.user!.id })
  if (!post) throw new HttpError(404, 'Post not found')
  return post
}
export async function refreshPost(req: AuthRequest, res: Response) {
  const post = await ownedPost(req)
  if (post.zernioPostId) await applyProviderPost(post, (await zernio.getPost(post.zernioPostId)).post)
  res.json({ post: postPayload(post) })
}
export async function cancelPost(req: AuthRequest, res: Response) {
  const post = await ownedPost(req)
  if (post.zernioPostId) await applyProviderPost(post, (await zernio.getPost(post.zernioPostId)).post)
  if (!['draft', 'scheduled'].includes(post.status)) throw new HttpError(409, 'Only drafts and scheduled posts can be cancelled here.')
  if (post.zernioPostId) await zernio.deletePost(post.zernioPostId)
  post.status = 'cancelled'
  await post.save()
  res.json({ post: postPayload(post) })
}

export async function reschedulePost(req: AuthRequest, res: Response) {
  const post = await ownedPost(req)
  const { scheduledFor, timezone } = req.body || {}
  if (typeof scheduledFor !== 'string' || !/(?:Z|[+-]\d\d:\d\d)$/i.test(scheduledFor) ||
    !Number.isFinite(Date.parse(scheduledFor)) || Date.parse(scheduledFor) < Date.now() + 60000 || typeof timezone !== 'string') {
    throw new HttpError(400, 'Choose a schedule time at least one minute in the future, with a timezone offset.')
  }
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }) }
  catch { throw new HttpError(400, 'Invalid timezone') }
  if (!post.zernioPostId || post.status === 'cancelled') throw new HttpError(409, 'Only scheduled posts can be rescheduled.')
  await applyProviderPost(post, (await zernio.getPost(post.zernioPostId)).post)
  if (post.status !== 'scheduled') throw new HttpError(409, 'This post is no longer scheduled.')
  await ownedAccounts(req.user!.id, post.accountIds.map(String))
  const media = await Media.find({ user: req.user!.id, _id: { $in: post.mediaIds } })
  if (media.some((item) => Date.parse(scheduledFor) - item.createdAt.getTime() > 6 * 86400000)) {
    throw new HttpError(400, 'Uploads will expire before that time. Create a new post with fresh uploads.')
  }
  const remote = await zernio.reschedulePost(post.zernioPostId, new Date(scheduledFor).toISOString(), timezone)
  post.timezone = timezone
  await applyProviderPost(post, remote.post)
  res.json({ post: postPayload(post) })
}
