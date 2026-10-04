import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import authRoutes from './routes/auth.js';
import { requireAuth, requireCsrf } from './middleware/auth.js';
import Expense from './models/Expense.js';
import Category from './models/Category.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const trustedProxyHops = process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : undefined;

app.disable('x-powered-by');
if (trustedProxyHops !== undefined) {
  if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0) {
    throw new Error('TRUST_PROXY must be a non-negative integer');
  }
  app.set('trust proxy', trustedProxyHops);
}
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0) {
      return callback(null, true);
    }
    return callback(null, false);
  }
}));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', requireAuth, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return requireCsrf(req, res, next);
  return next();
}, expenseRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);

app.get('/api/summary', requireAuth, async (req, res) => {
  try {
    
    const { month, year } = req.query;
    if (Boolean(month) !== Boolean(year)) {
      return res.status(400).json({ error: 'Month and year must be provided together' });
    }
    
    // Build match stage for date filtering
    let matchStage = {};
    if (month && year) {
      const monthNum = Number(month);
      const yearNum = Number(year);
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12 || !Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 9999) {
        return res.status(400).json({ error: 'Month must be 1-12 and year must be a valid four-digit year' });
      }
      
      // Create date range for the specified month
      const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
      const endDate = new Date(Date.UTC(yearNum, monthNum, 1));
      
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
      
      matchStage = {
        date: {
          $gte: startDate,
          $lt: endDate
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
        monthly_budget: category.monthly_budget ?? null,
        total_spent: expenseData ? expenseData.total_spent : 0,
        is_over_budget: expenseData ? expenseData.is_over_budget : false
      };
    });

    res.json(formattedSummary);
    
  } catch (error) {
    console.error('❌ Summary error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to generate summary' });
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
  
  const healthy = dbStatus === 1;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'OK' : 'NOT_READY',
    server: 'running',
    mongodb: statusMap[dbStatus] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err.stack);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured before the server can start');
  }
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');
  const { default: User } = await import('./models/User.js');
  if (!await User.exists({ role: 'admin', isActive: true })) {
    throw new Error('No active admin exists. Run npm run bootstrap:admin to create the initial admin account');
  }
  const server = app.listen(port, () => console.log(`Server running on port ${port}`));

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => {
        mongoose.disconnect().finally(() => process.exit(0));
      });
    });
  }
};

startServer().catch(error => {
  console.error('Backend startup failed:', error.message);
  process.exit(1);
});
