import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ExpenseForm from './ExpenseForm';
import type { Category, ExpenseInput } from '../types';

const categories: Category[] = [{ _id: 'food-id', name: 'Food', monthly_budget: 300 }];

describe('ExpenseForm', () => {
  it('submits normalized expense details and shows success', async () => {
    const user = userEvent.setup();
    const onAddExpense = vi.fn().mockResolvedValue({ success: true });
    render(<ExpenseForm categories={categories} onAddExpense={onAddExpense} />);

    await user.type(screen.getByPlaceholderText('Amount'), '25.50');
    await user.type(screen.getByPlaceholderText('Description'), '  Lunch  ');
    await user.selectOptions(screen.getByRole('combobox'), 'food-id');
    await user.click(screen.getByRole('button', { name: 'Add Expense' }));

    await waitFor(() => expect(onAddExpense).toHaveBeenCalledOnce());
    const submitted = onAddExpense.mock.calls[0][0] as ExpenseInput;
    expect(submitted).toMatchObject({
      amount: 25.5,
      description: 'Lunch',
      category_id: 'food-id',
    });
    expect(submitted.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await screen.findByText('Expense added successfully!')).toBeInTheDocument();
  });

  it('shows required field errors without calling the API', async () => {
    const user = userEvent.setup();
    const onAddExpense = vi.fn();
    render(<ExpenseForm categories={categories} onAddExpense={onAddExpense} />);

    await user.click(screen.getByRole('button', { name: 'Add Expense' }));

    expect(await screen.findByText('Amount must be greater than 0')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(onAddExpense).not.toHaveBeenCalled();
  });

  it('shows an API error when submission fails', async () => {
    const user = userEvent.setup();
    const onAddExpense = vi.fn().mockResolvedValue({ success: false, error: 'Category does not exist' });
    render(<ExpenseForm categories={categories} onAddExpense={onAddExpense} />);

    await user.type(screen.getByPlaceholderText('Amount'), '4');
    await user.type(screen.getByPlaceholderText('Description'), 'Coffee');
    await user.selectOptions(screen.getByRole('combobox'), 'food-id');
    await user.click(screen.getByRole('button', { name: 'Add Expense' }));

    expect(await screen.findByText('Category does not exist')).toBeInTheDocument();
  });
});
