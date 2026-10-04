import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  familyId: { type: String, required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userTokenVersion: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  usedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

refreshTokenSchema.index({ familyId: 1, usedAt: 1, revokedAt: 1, expiresAt: 1 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
