import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestId: { type: String, required: true }, payloadHash: { type: String, required: true },
  content: { type: String, default: '' },
  accountIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }],
  mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
  mediaItems: [{ type: { type: String }, url: String, filename: String }],
  mode: { type: String, enum: ['draft', 'now', 'schedule'], required: true },
  scheduledFor: Date, timezone: { type: String, default: 'UTC' },
  providerBody: { type: mongoose.Schema.Types.Mixed, select: false },
  zernioPostId: { type: String, index: true, unique: true, sparse: true },
  status: { type: String, default: 'pending' }, error: String,
  processingUntil: Date,
  results: [{ platform: String, accountId: String, status: String, url: String, error: String }],
}, { timestamps: true })
schema.index({ user: 1, requestId: 1 }, { unique: true })
export const Post = mongoose.model('Post', schema)
