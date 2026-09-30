import mongoose from 'mongoose'
export const Media = mongoose.model('Media', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename: { type: String, required: true }, contentType: { type: String, required: true },
  size: { type: Number, required: true }, url: { type: String, required: true },
  ready: { type: Boolean, default: false },
}, { timestamps: true }))
