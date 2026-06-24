import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as { id: string; iat: number; exp: number }
    ;(req as Request & { user?: { id: string } }).user = { id: payload.id }
    next()
  } catch {
    res.status(403).json({ message: 'Invalid or expired token' })
  }
}
