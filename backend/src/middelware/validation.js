import { body, validationResult } from 'express-validator';

export const validateExpense = [
  body('amount')
    .exists().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
    .toFloat(),
  
  body('description')
    .exists().withMessage('Description is required')
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Description must be between 1 and 255 characters'),
  
  body('category_id')
    .exists().withMessage('Category ID is required')
    .isMongoId().withMessage('Invalid category ID'),
  
  body('date')
    .exists().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format')
    .toDate()
    .custom((date) => {
      if (date > new Date()) {
        throw new Error('Date cannot be in the future');
      }
      return true;
    }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array().map(err => err.msg) 
      });
    }
    next();
  }
];

export const validateCategory = [
  body('name')
    .exists().withMessage('Category name is required')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Category name must be between 1 and 100 characters'),
  
  body('monthly_budget')
    .optional()
    .isFloat({ min: 0 }).withMessage('Monthly budget cannot be negative')
    .toFloat(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array().map(err => err.msg) 
      });
    }
    next();
  }
];