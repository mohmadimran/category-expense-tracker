import express from 'express';
import Expense from '../models/Expense.js';
import Category from '../models/Category.js';
import { validateExpense } from '../middelware/validation.js';

const router = express.Router();

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
        if (/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
          endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);
          filter.date.$lt = endDateExclusive;
        } else {
          filter.date.$lte = endDateExclusive;
        }
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const total = await Expense.countDocuments(filter);
    
    // Fetch expenses with category populated
    const expenses = await Expense.find(filter)
      .populate('category', 'name monthly_budget')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Format the response to match expected structure
    const formattedExpenses = expenses.map(exp => ({
      id: exp._id,
      amount: exp.amount,
      description: exp.description,
      date: exp.date.toISOString().split('T')[0],
      category_id: exp.category?._id || null,
      category_name: exp.category?.name || 'Uncategorized',
      monthly_budget: exp.category?.monthly_budget || null
    }));

    res.json({
      data: formattedExpenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

export default router;
