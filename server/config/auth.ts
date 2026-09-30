import type { CookieOptions, Request } from 'express'
import { createHash, randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'

export const refreshMaxAge = 7 * 24 * 60 * 60 * 1000

export function authConfig() {
  const accessSecret = process.env.JWT_ACCESS_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET
  if (!accessSecret || !refreshSecret || accessSecret === refreshSecret) {
    throw new Error('Set distinct JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values')
  }
  const frontendUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:5173')
  if (!['http:', 'https:'].includes(frontendUrl.protocol)) {
    throw new Error('FRONTEND_URL must use HTTP or HTTPS')
  }
  const secure = process.env.NODE_ENV === 'production'
  const sameSite = process.env.COOKIE_SAME_SITE || 'lax'
  if (!['lax', 'strict', 'none'].includes(sameSite) || (sameSite === 'none' && !secure)) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none (none requires production HTTPS)')
  }
  return { accessSecret, refreshSecret, origin: frontendUrl.origin, secure,
    sameSite: sameSite as 'lax' | 'strict' | 'none' }
}

export function cookieOptions(): CookieOptions {
  const { secure, sameSite } = authConfig()
  return { httpOnly: true, secure, sameSite, path: '/' }
}

export function readRefreshCookie(req: Request): string | undefined {
  for (const part of (req.headers.cookie || '').split(';')) {
    const separator = part.indexOf('=')
    if (part.slice(0, separator).trim() !== 'refreshToken') continue
    try { return decodeURIComponent(part.slice(separator + 1).trim()) || undefined }
    catch { return undefined }
  }
}

export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createAccessToken(id: string) {
  return jwt.sign({ id, kind: 'access' }, authConfig().accessSecret,
    { algorithm: 'HS256', expiresIn: '15m' })
}

export function createRefreshToken(id: string) {
  return jwt.sign({ id, kind: 'refresh' }, authConfig().refreshSecret,
    { algorithm: 'HS256', expiresIn: '7d', jwtid: randomUUID() })
}

export function verifyToken(token: string, kind: 'access' | 'refresh'): string {
  const config = authConfig()
  const payload = jwt.verify(token, kind === 'access' ? config.accessSecret : config.refreshSecret,
    { algorithms: ['HS256'] })
  if (typeof payload === 'string' || payload.kind !== kind ||
      typeof payload.id !== 'string' || !/^[a-f\d]{24}$/i.test(payload.id)) {
    throw new Error('Invalid token payload')
  }
  return payload.id
}
