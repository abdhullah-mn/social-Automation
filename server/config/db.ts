import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI

export default async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(MONGO_URI as string)
    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (error: any) {
    console.error('MongoDB connection error:', error?.message ?? error)
    process.exit(1)
  }
}

