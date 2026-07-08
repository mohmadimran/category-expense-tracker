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

app.get('/api/summary', async (req, res) => {
  try {
    
    const { month, year } = req.query;
    
    // Build match stage for date filtering
    let matchStage = {};
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      // Create date range for the specified month
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
      
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
      
      matchStage = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // Get all categories first
    const allCategories = await Category.find().lean();
    console.log(`📂 Found ${allCategories.length} categories`);

    // If no categories exist, return empty array
    if (allCategories.length === 0) {
      return res.json([]);
    }

    // Get expenses with aggregation
    const summary = await Expense.aggregate([
      // Match expenses in the date range
      { $match: matchStage },
      
      // Lookup category details
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      
      // Unwind category info (preserve expenses without category)
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      
      // Group by category
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

    console.log(`📊 Found ${summary.length} categories with expenses`);

    // Format response - include all categories even if they have no expenses
    const formattedSummary = allCategories.map(category => {
      const expenseData = summary.find(item => 
        item._id && item._id.toString() === category._id.toString()
      );
      
      return {
        category_id: category._id,
        category_name: category.name,
        monthly_budget: category.monthly_budget || null,
        total_spent: expenseData ? expenseData.total_spent : 0,
        is_over_budget: expenseData ? expenseData.is_over_budget : false
      };
    });

    res.json(formattedSummary);
    
  } catch (error) {
    console.error('❌ Summary error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'OK',
    server: 'running',
    mongodb: statusMap[dbStatus] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});