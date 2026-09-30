import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../config/auth.js'

export type AuthRequest = Request & { user?: { id: string } }

export default function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const match = req.headers.authorization?.match(/^Bearer (\S+)$/i)
  if (!match) return res.status(401).json({ message: 'Authorization token missing' })
  try {
    req.user = { id: verifyToken(match[1], 'access') }
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
