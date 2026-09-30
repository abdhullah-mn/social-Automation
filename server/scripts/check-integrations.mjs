import 'dotenv/config'
import mongoose from 'mongoose'

// Read-only diagnostics. Never print credentials or account/user data.
const key = process.env.ZERNIO_API_KEY || process.env.ZERNIO_API
console.log(JSON.stringify({ keyConfigured: Boolean(key), mongoConfigured: Boolean(process.env.MONGO_URI), frontend: process.env.FRONTEND_URL, port: process.env.PORT }))
if (key) {
  try {
    const response = await fetch('https://zernio.com/api/v1/profiles', {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000),
    })
    const data = await response.json()
    console.log(JSON.stringify({ zernioStatus: response.status, profileCount: Array.isArray(data.profiles) ? data.profiles.length : null }))
    if (!response.ok) process.exitCode = 1
  } catch { console.log('Zernio network request failed'); process.exitCode = 1 }
}
if (process.env.MONGO_URI) {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000, autoIndex: false })
    await mongoose.connection.db.admin().ping()
    const legacyUsers = await mongoose.connection.db.collection('users').countDocuments({ passwordHash: { $exists: false } })
    console.log(JSON.stringify({ mongoReachable: true, usersWithoutPasswordHash: legacyUsers }))
  } catch (error) { console.log(JSON.stringify({ mongoReachable: false, errorType: error.name, errorCode: error.code || error.cause?.code, networkCode: error.reason?.code })); process.exitCode = 1 }
  finally { await mongoose.disconnect() }
}
