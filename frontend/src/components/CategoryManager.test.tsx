import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoryManager from './CategoryManager';
import type { Category } from '../types';

const categories: Category[] = [{ _id: 'food-id', name: 'Food', monthly_budget: null }];

describe('CategoryManager', () => {
  it('deletes a category only after the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const onDeleteCategory = vi.fn().mockResolvedValue({ success: true });
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    render(
      <CategoryManager
        categories={categories}
        loading={false}
        error={null}
        onAddCategory={vi.fn().mockResolvedValue({ success: true })}
        onDeleteCategory={onDeleteCategory}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('All expenses in this category will also be deleted'));
    expect(onDeleteCategory).toHaveBeenCalledWith('food-id');
  });

  it('does not delete when the confirmation is rejected', async () => {
    const user = userEvent.setup();
    const onDeleteCategory = vi.fn();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    render(
      <CategoryManager
        categories={categories}
        loading={false}
        error={null}
        onAddCategory={vi.fn().mockResolvedValue({ success: true })}
        onDeleteCategory={onDeleteCategory}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDeleteCategory).not.toHaveBeenCalled();
  });
});
