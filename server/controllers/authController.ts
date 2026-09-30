import bcrypt from 'bcrypt'
import type { Request, Response, NextFunction } from 'express'
import User from '../models/User.js'
import type { AuthRequest } from '../middleware/requireAuth.js'
import { cookieOptions, createAccessToken, createRefreshToken, readRefreshCookie,
  refreshMaxAge, tokenHash, verifyToken } from '../config/auth.js'

function userPayload(user: { _id: { toString(): string }; name: string; email: string }) {
  return { id: user._id.toString(), name: user.name, email: user.email }
}

function credentials(body: unknown) {
  if (!body || typeof body !== 'object') return null
  const { email, password } = body as Record<string, unknown>
  if (typeof email !== 'string' || typeof password !== 'string') return null
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !password.length || Buffer.byteLength(password, 'utf8') > 72) return null
  return { email: normalizedEmail, password }
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, { ...cookieOptions(), maxAge: refreshMaxAge })
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = credentials(req.body)
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!input || input.password.length < 8 || !name || name.length > 100) {
      return res.status(400).json({ message: 'Provide a name (1–100 characters), valid email, and password (at least 8 characters, at most 72 UTF-8 bytes)' })
    }
    if (await User.findOne({ email: input.email })) {
      return res.status(409).json({ message: 'Email already exists' })
    }
    const user = new User({ name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) })
    const refreshToken = createRefreshToken(user._id.toString())
    user.refreshTokens = [tokenHash(refreshToken)]
    await user.save()
    setRefreshCookie(res, refreshToken)
    return res.status(201).json({ user: userPayload(user), accessToken: createAccessToken(user._id.toString()) })
  } catch (error) { next(error) }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = credentials(req.body)
    if (!input) return res.status(400).json({ message: 'Valid email and password are required' })
    const user = await User.findOne({ email: input.email }).select('+passwordHash')
    if (!user?.passwordHash || !await bcrypt.compare(input.password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const refreshToken = createRefreshToken(user._id.toString())
    // Atomic append preserves concurrent logins and bounds stored sessions.
    await User.updateOne({ _id: user._id }, {
      $push: { refreshTokens: { $each: [tokenHash(refreshToken)], $slice: -10 } },
    })
    setRefreshCookie(res, refreshToken)
    return res.json({ user: userPayload(user), accessToken: createAccessToken(user._id.toString()) })
  } catch (error) { next(error) }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = readRefreshCookie(req)
    if (!token) return res.status(401).json({ message: 'Refresh token missing' })
    let id: string
    try { id = verifyToken(token, 'refresh') }
    catch {
      res.clearCookie('refreshToken', cookieOptions())
      return res.status(401).json({ message: 'Invalid or expired refresh token' })
    }
    const replacement = createRefreshToken(id)
    // Compare and replace atomically: a token can only be consumed once.
    const user = await User.findOneAndUpdate({ _id: id, refreshTokens: tokenHash(token) },
      { $set: { 'refreshTokens.$': tokenHash(replacement) } }, { returnDocument: 'after' })
    if (!user) {
      res.clearCookie('refreshToken', cookieOptions())
      return res.status(401).json({ message: 'Refresh session not found' })
    }
    setRefreshCookie(res, replacement)
    return res.json({ user: userPayload(user), accessToken: createAccessToken(id) })
  } catch (error) { next(error) }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = readRefreshCookie(req)
    if (token) await User.updateOne({ refreshTokens: tokenHash(token) },
      { $pull: { refreshTokens: tokenHash(token) } })
    res.clearCookie('refreshToken', cookieOptions())
    return res.json({ message: 'Logged out' })
  } catch (error) { next(error) }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findById(req.user.id)
    if (!user) return res.status(401).json({ message: 'User no longer exists' })
    return res.json({ user: userPayload(user) })
  } catch (error) { next(error) }
}
