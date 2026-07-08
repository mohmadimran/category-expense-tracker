export const validateExpense = (data) => {
  const errors = {};
  
  if (!data.amount || data.amount <= 0) {
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expenseDate = new Date(data.date);
    if (expenseDate > today) {
      errors.date = 'Date cannot be in the future';
    }
  }
  
  return errors;
};

export const validateCategory = (data) => {
  const errors = {};
  
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Category name is required';
  } else if (data.name.length > 100) {
    errors.name = 'Category name must be less than 100 characters';
  }
  
  if (data.monthly_budget && data.monthly_budget < 0) {
    errors.monthly_budget = 'Monthly budget cannot be negative';
  }
  
  return errors;
};