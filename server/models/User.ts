import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  // Only token digests are stored; raw tokens stay in HttpOnly cookies.
  refreshTokens: { type: [String], default: [], select: false },
  zernioProfileId: { type: String },
  zernioBindingVersion: { type: Number },
}, { timestamps: true })

export default mongoose.model('User', UserSchema)
