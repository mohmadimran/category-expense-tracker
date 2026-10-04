import express from 'express';
import Expense from '../models/Expense.js';
import Category from '../models/Category.js';
import { validateExpense } from '../middelware/validation.js';
import { sendServerError } from '../utils/httpError.js';

const router = express.Router();
const isValidDateOnly = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// GET /api/expenses - List expenses with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      category_id, 
      start_date, 
      end_date, 
      page = 1, 
      limit = 50 
    } = req.query;

    const pageNumber = Number(page);
    const pageLimit = Number(limit);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100) {
      return res.status(400).json({ error: 'Page must be positive and limit must be between 1 and 100' });
    }
    if (category_id && (typeof category_id !== 'string' || !/^[a-f\d]{24}$/i.test(category_id))) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    for (const dateValue of [start_date, end_date]) {
      if (dateValue && !isValidDateOnly(dateValue)) {
        return res.status(400).json({ error: 'Dates must use YYYY-MM-DD format' });
      }
    }
    if (start_date && end_date && start_date > end_date) {
      return res.status(400).json({ error: 'start_date must be on or before end_date' });
    }

    const filter = {};
    
    if (category_id) {
      filter.category = category_id;
    }
    
    if (start_date || end_date) {
      filter.date = {};
      if (start_date) {
        filter.date.$gte = new Date(start_date);
      }
      if (end_date) {
        // Treat a date-only end_date as inclusive by matching before the next day.
        const endDateExclusive = new Date(end_date);
        endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);
        filter.date.$lt = endDateExclusive;
      }
    }

    const skip = (pageNumber - 1) * pageLimit;
    
    // Get total count for pagination
    const total = await Expense.countDocuments(filter);
    
    // Fetch expenses with category populated
    const expenses = await Expense.find(filter)
      .populate('category', 'name monthly_budget')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    // Format the response to match expected structure
    const formattedExpenses = expenses.map(exp => ({
      id: exp._id,
      amount: exp.amount,
      description: exp.description,
      date: exp.date.toISOString().split('T')[0],
      category_id: exp.category?._id || null,
      category_name: exp.category?.name || 'Uncategorized',
      monthly_budget: exp.category?.monthly_budget ?? null
    }));

    res.json({
      data: formattedExpenses,
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    return sendServerError(res, error, 'List expenses failed');
  }
});

// POST /api/expenses - Create new expense
router.post('/', validateExpense, async (req, res) => {
  try {
    const { amount, description, category_id, date } = req.body;

    // Verify category exists
    const category = await Category.findById(category_id);
    if (!category) {
      return res.status(400).json({ error: 'Category does not exist' });
    }

    const expense = new Expense({
      amount,
      description: description.trim(),
      category: category_id,
      date
    });

    await expense.save();
    
    res.status(201).json({ 
      id: expense._id,
      message: 'Expense created successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }
    return sendServerError(res, error, 'Create expense failed');
  }
});

// PUT /api/expenses/:id - Update expense
router.put('/:id', validateExpense, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, category_id, date } = req.body;

    // Check if expense exists
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify category exists
    const category = await Category.findById(category_id);
    if (!category) {
      return res.status(400).json({ error: 'Category does not exist' });
    }

    expense.amount = amount;
    expense.description = description.trim();
    expense.category = category_id;
    expense.date = date;

    await expense.save();
    
    res.json({ message: 'Expense updated successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }
    return sendServerError(res, error, 'Update expense failed');
  }
});

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Expense.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    return sendServerError(res, error, 'Delete expense failed');
  }
});

export default router;
