import { describe, expect, it } from 'vitest';
import { validateCategory, validateExpense } from '../../src/utils/validators';

describe('validateExpense', () => {
  it('accepts an expense with all required valid fields', () => {
    expect(validateExpense({
      amount: '12.5',
      description: 'Taxi',
      category_id: 'food-id',
      date: '2024-01-15',
    })).toEqual({});
  });

  it('reports invalid amount, blank description, and missing category', () => {
    expect(validateExpense({
      amount: '0',
      description: '   ',
      category_id: '',
      date: '2024-01-15',
    })).toMatchObject({
      amount: 'Amount must be greater than 0',
      description: 'Description is required',
      category_id: 'Category is required',
    });
  });

  it('rejects descriptions over 255 characters', () => {
    const errors = validateExpense({
      amount: 1,
      description: 'x'.repeat(256),
      category_id: 'food-id',
      date: '2024-01-15',
    });

    expect(errors.description).toBe('Description must be less than 255 characters');
  });
});

describe('validateCategory', () => {
  it('accepts a category with no budget', () => {
    expect(validateCategory({ name: 'Travel', monthly_budget: null })).toEqual({});
  });

  it('rejects a blank name and negative budget', () => {
    expect(validateCategory({ name: ' ', monthly_budget: -10 })).toMatchObject({
      name: 'Category name is required',
      monthly_budget: 'Monthly budget cannot be negative',
    });
  });
});
