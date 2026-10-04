import type { ExpenseInput, CategoryInput, ValidationErrors } from '../types';
import { formatDateInput } from './formatters';

type ExpenseFormData = Omit<ExpenseInput, 'amount'> & { amount: number | string };
type CategoryFormData = Omit<CategoryInput, 'monthly_budget'> & { monthly_budget: number | string | null };

export const validateExpense = (data: ExpenseFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  const amount = Number(data.amount);
  if (!data.amount || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than 0';
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Description is required';
  } else if (data.description.length > 255) {
    errors.description = 'Description must be less than 255 characters';
  }
  
  if (!data.category_id) {
    errors.category_id = 'Category is required';
  }
  
  if (!data.date) {
    errors.date = 'Date is required';
  } else {
    const today = formatDateInput(new Date());
    if (data.date > today) {
      errors.date = 'Date cannot be in the future';
    }
  }
  
  return errors;
};

export const validateCategory = (data: CategoryFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Category name is required';
  } else if (data.name.length > 100) {
    errors.name = 'Category name must be less than 100 characters';
  }
  
  if (data.monthly_budget !== null && data.monthly_budget !== '' &&
      (!Number.isFinite(Number(data.monthly_budget)) || Number(data.monthly_budget) < 0)) {
    errors.monthly_budget = 'Monthly budget cannot be negative';
  }
  
  return errors;
};
