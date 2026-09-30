import express from 'express'
import type { ErrorRequestHandler } from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'
import { authConfig } from './config/auth.js'
import accountRoutes from './routes/accountRoutes.js'
import postRoutes from './routes/postRoutes.js'
import { HttpError } from './config/zernio.js'
import { webhook } from './controllers/webhookController.js'

export function createApp() {
  const { origin } = authConfig()
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin, credentials: true }))
  // CORS alone does not prevent cross-origin requests that mutate cookies.
  app.post('/api/webhooks/zernio', express.raw({ type: 'application/json', limit: '1mb' }), webhook)
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== origin) {
      return res.status(403).json({ message: 'Origin not allowed' })
    }
    next()
  })
  app.use(express.json({ limit: '128kb' }))
  app.use(express.urlencoded({ extended: false, limit: '16kb' }))
  app.use('/api/auth', authRoutes)
  app.use('/api/accounts', accountRoutes)
  app.use('/api/posts', postRoutes)
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.use((_req, res) => res.status(404).json({ message: 'Route not found' }))
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof HttpError) return void res.status(error.status).json({ message: error.message })
    if (error?.code === 11000) return void res.status(409).json({ message: _req.path.startsWith('/api/auth') ? 'Email already exists' : 'A record with this identifier already exists.' })
    if (error?.type === 'entity.parse.failed') return void res.status(400).json({ message: 'Invalid JSON body' })
    if (error?.type === 'entity.too.large') return void res.status(413).json({ message: 'Request body too large' })
    if (error?.name === 'ValidationError') return void res.status(400).json({ message: 'Invalid request data' })
    console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error')
    res.status(500).json({ message: 'Internal server error' })
  }
  app.use(onError)
  return app
}
