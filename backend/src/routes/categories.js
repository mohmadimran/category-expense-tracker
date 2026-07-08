import express from 'express';
import Category from '../models/Category.js';
import Expense from '../models/Expense.js';
import { validateCategory } from '../middelware/validation.js';

const router = express.Router();

// GET /api/categories - List all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/categories - Create new category
router.post('/', validateCategory, async (req, res) => {
  try {
    const { name, monthly_budget } = req.body;

    // Check if category name already exists
    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    const category = new Category({
      name: name.trim(),
      monthly_budget: monthly_budget || null
    });

    await category.save();
    
    res.status(201).json({ 
      id: category._id,
      message: 'Category created successfully'
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

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Delete all expenses with this category
    // Or set category to null - we'll delete them to maintain data integrity
    // Decision: Delete all associated expenses when category is deleted
    const deleteResult = await Expense.deleteMany({ category: id });
    
    // Delete the category
    await Category.findByIdAndDelete(id);

    res.json({ 
      message: `Category deleted successfully. ${deleteResult.deletedCount} associated expenses were also deleted.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;