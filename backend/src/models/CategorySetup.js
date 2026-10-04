import mongoose from 'mongoose';

const categorySetupSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  completedAt: { type: Date, default: Date.now },
}, { versionKey: false });

export default mongoose.model('CategorySetup', categorySetupSchema);
