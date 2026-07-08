import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  monthly_budget: {
    type: Number,
    min: [0, 'Monthly budget cannot be negative'],
    default: null
  }
}, {
  timestamps: true
});

// Index for faster lookups
categorySchema.index({ name: 1 });

export default mongoose.model('Category', categorySchema);