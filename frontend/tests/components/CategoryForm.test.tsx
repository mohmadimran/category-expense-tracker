import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoryForm from '../../src/components/CategoryForm';

describe('CategoryForm', () => {
  it('submits a category with a numeric budget and resets the form', async () => {
    const user = userEvent.setup();
    const onAddCategory = vi.fn().mockResolvedValue({ success: true });
    render(<CategoryForm onAddCategory={onAddCategory} />);

    await user.type(screen.getByPlaceholderText('Category Name'), 'Travel');
    await user.type(screen.getByPlaceholderText('Monthly Budget (optional)'), '450');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    await waitFor(() => expect(onAddCategory).toHaveBeenCalledWith({ name: 'Travel', monthly_budget: 450 }));
    expect(await screen.findByText('Category added successfully!')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Category Name')).toHaveValue('');
  });

  it('prevents submitting a blank category name', async () => {
    const user = userEvent.setup();
    const onAddCategory = vi.fn();
    render(<CategoryForm onAddCategory={onAddCategory} />);

    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('Category name is required')).toBeInTheDocument();
    expect(onAddCategory).not.toHaveBeenCalled();
  });

  it('shows a server error for duplicate categories', async () => {
    const user = userEvent.setup();
    const onAddCategory = vi.fn().mockResolvedValue({ success: false, error: 'Category name already exists' });
    render(<CategoryForm onAddCategory={onAddCategory} />);

    await user.type(screen.getByPlaceholderText('Category Name'), 'Travel');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('Category name already exists')).toBeInTheDocument();
  });
});
