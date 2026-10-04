import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
