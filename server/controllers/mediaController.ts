import type { Response } from 'express'
import type { AuthRequest } from '../middleware/requireAuth.js'
import { Media } from '../models/Media.js'
import { HttpError, zernio } from '../config/zernio.js'

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
export async function presign(req: AuthRequest, res: Response) {
  const { filename, contentType, size } = req.body || {}
  if (typeof filename !== 'string' || !filename.trim() || filename.length > 180 ||
    !allowedTypes.includes(contentType) || !Number.isInteger(size) || size < 1 || size > 50 * 1024 * 1024) {
    throw new HttpError(400, 'Upload JPEG, PNG, WebP or MP4 files up to 50 MB each.')
  }
  const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const { uploadUrl, publicUrl } = await zernio.presign({ filename: cleanName, contentType, size })
  if (!uploadUrl?.startsWith('https://') || !publicUrl?.startsWith('https://')) throw new HttpError(502, 'Invalid upload URL')
  const media = await Media.create({ user: req.user!.id, filename: cleanName, contentType, size, url: publicUrl })
  res.json({ id: media._id, uploadUrl })
}

export async function confirmUpload(req: AuthRequest, res: Response) {
  if (typeof req.params.id !== 'string' || !/^[a-f\d]{24}$/i.test(req.params.id)) throw new HttpError(404, 'Upload not found')
  const media = await Media.findOne({ _id: req.params.id, user: req.user!.id })
  if (!media) throw new HttpError(404, 'Upload not found')
  // URL comes from the provider, never from user input. Confirm actual uploaded size.
  const response = await fetch(media.url, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
  if (!response.ok || Number(response.headers.get('content-length')) !== media.size ||
    response.headers.get('content-type')?.split(';')[0] !== media.contentType) {
    throw new HttpError(400, 'Upload is incomplete or does not match the selected file.')
  }
  media.ready = true
  await media.save()
  res.json({ media: { id: media._id, filename: media.filename, url: media.url, type: media.contentType.startsWith('image/') ? 'image' : 'video' } })
}
