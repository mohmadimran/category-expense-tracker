import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);

// Summary endpoint - Using MongoDB Aggregation Pipeline
app.get('/api/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let matchStage = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      matchStage = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    const summary = await Expense.aggregate([
      // Match expenses in the date range
      { $match: matchStage },
      
      // Group by category and calculate total spent
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      
      {
        $group: {
          _id: '$category',
          category_name: { $first: '$categoryInfo.name' },
          monthly_budget: { $first: '$categoryInfo.monthly_budget' },
          total_spent: { $sum: '$amount' }
        }
      },
      
      // Calculate if over budget
      {
        $addFields: {
          is_over_budget: {
            $and: [
              { $ne: ['$monthly_budget', null] },
              { $gt: ['$total_spent', '$monthly_budget'] }
            ]
          }
        }
      },
      
      // Sort by category name
      { $sort: { category_name: 1 } }
    ]);

    // Format response
    const formattedSummary = summary.map(item => ({
      category_id: item._id,
      category_name: item.category_name || 'Uncategorized',
      monthly_budget: item.monthly_budget,
      total_spent: item.total_spent || 0,
      is_over_budget: item.is_over_budget || false
    }));

    res.json(formattedSummary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});