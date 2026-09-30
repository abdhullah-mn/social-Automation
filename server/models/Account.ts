import mongoose from 'mongoose'

const accountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform: { type: String, enum: ['facebook', 'twitter', 'instagram', 'linkedin'], required: true },
  handle: { type: String, required: true },
  zernioAccountId: { type: String, required: true, unique: true },
  profileId: { type: String, required: true },
  status: { type: String, enum: ['Connected', 'Disconnected'], default: 'Connected' },
  avatarUrl: String,
}, { timestamps: true })

export const Account = mongoose.model('Account', accountSchema)
