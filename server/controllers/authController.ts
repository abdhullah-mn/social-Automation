// Use require and any to avoid missing type declarations for bcrypt and jsonwebtoken
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express'
import User from '../models/User.js'

type UserDocument = {
  _id: any
  name: string
  email: string
  passwordHash: string
  refreshTokens: string[]
  save: () => Promise<any>
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string

function createAccessToken(userId: string) {
  return jwt.sign({ id: userId }, JWT_ACCESS_SECRET, { expiresIn: '15m' })
}

function createRefreshToken(userId: string) {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

function getCookieToken(req: Request) {
  return (req as Request & { cookies?: Record<string, string> }).cookies?.refreshToken
}

function createUserPayload(user: { _id: any; name: string; email: string }) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' })
    }
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = new User({ name, email, passwordHash }) as unknown as UserDocument
    const refreshToken = createRefreshToken(user._id.toString())
    user.refreshTokens.push(refreshToken)
    await user.save()
    const accessToken = createAccessToken(user._id.toString())
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })
    res.status(201).json({ user: createUserPayload(user), accessToken })
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    const user = (await User.findOne({ email })) as unknown as UserDocument | null
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const accessToken = createAccessToken(user._id.toString())
    const refreshToken = createRefreshToken(user._id.toString())
    user.refreshTokens.push(refreshToken)
    await user.save()
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })
    res.status(200).json({ user: createUserPayload(user), accessToken })
  } catch (error) {
    next(error)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getCookieToken(req)
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing' })
    }
    let payload: { id: string }
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string }
    } catch {
      return res.status(403).json({ message: 'Invalid refresh token' })
    }
    const user = (await User.findById(payload.id)) as unknown as UserDocument | null
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: 'Refresh token not recognized' })
    }
    const accessToken = createAccessToken(user._id.toString())
    res.status(200).json({ accessToken })
  } catch (error) {
    next(error)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getCookieToken(req)
    if (refreshToken) {
      const user = (await User.findOne({ refreshTokens: refreshToken })) as unknown as UserDocument | null
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken)
        await user.save()
      }
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    })
    res.status(200).json({ message: 'Logged out' })
  } catch (error) {
    next(error)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as Request & { user?: { id: string; name: string; email: string } }).user
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    res.status(200).json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    next(error)
  }
}
