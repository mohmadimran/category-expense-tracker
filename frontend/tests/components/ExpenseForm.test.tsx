import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ExpenseForm from '../../src/components/ExpenseForm';
import type { Category, ExpenseInput } from '../../src/types';

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

  it('shows available categories in the expense dropdown', () => {
    render(<ExpenseForm categories={categories} onAddExpense={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'Food' })).toHaveValue('food-id');
  });

  it('shows a retry action when categories fail to load', async () => {
    const onRetryCategories = vi.fn();
    const user = userEvent.setup();
    render(
      <ExpenseForm
        categories={[]}
        categoriesError="Request failed"
        onRetryCategories={onRetryCategories}
        onAddExpense={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetryCategories).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load categories');
  });

  it('explains when the account has no categories yet', () => {
    render(
      <ExpenseForm
        categories={[]}
        noCategoriesMessage="Ask an administrator to add a category."
        onAddExpense={vi.fn()}
      />
    );

    expect(screen.getByRole('option', { name: 'No categories available' })).toBeDisabled();
    expect(screen.getByText('Ask an administrator to add a category.')).toBeInTheDocument();
  });
});
