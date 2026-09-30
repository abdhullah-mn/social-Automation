import 'dotenv/config'
import { createApp } from './app.js'
import connectDB from './config/db.js'
import User from './models/User.js'
import { Account } from './models/Account.js'
import { Post } from './models/Post.js'
import { Media } from './models/Media.js'
const app = createApp()

const port = Number(process.env.PORT ?? 5000)

async function startServer() {
  try {
    await connectDB()
    await Promise.all([User.init(), Account.init(), Post.init(), Media.init()])
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
