import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  })
)

app.use('/api/auth', authRoutes)

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

const port = Number(process.env.PORT ?? 5000)

async function startServer() {
  try {
    await connectDB()
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`)
    })
  } catch (error: any) {
    console.error('Server startup error:', error?.message ?? error)
    process.exit(1)
  }
}

startServer()

export default app
