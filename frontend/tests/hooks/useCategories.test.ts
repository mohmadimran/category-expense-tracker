import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategories } from '../../src/hooks/useCategories';
import type { Category } from '../../src/types';

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  initializeCategories: vi.fn(),
}));

vi.mock('../../src/api/api.js', () => ({
  default: {
    getCategories: mocks.getCategories,
    initializeCategories: mocks.initializeCategories,
  },
}));

describe('useCategories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts to initialize starter categories when the backend list is empty', async () => {
    const starterCategories: Category[] = [
      { _id: 'food-id', name: 'Food & Dining', monthly_budget: null },
      { _id: 'transport-id', name: 'Transportation', monthly_budget: null },
    ];
    mocks.getCategories.mockResolvedValue({ data: [] });
    mocks.initializeCategories.mockResolvedValue({ data: starterCategories });

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.categories).toEqual(starterCategories));
    expect(mocks.getCategories).toHaveBeenCalledOnce();
    expect(mocks.initializeCategories).toHaveBeenCalledOnce();
  });

  it('does not seed or overwrite categories that already exist', async () => {
    const existingCategories: Category[] = [
      { _id: 'custom-id', name: 'Custom', monthly_budget: 500 },
    ];
    mocks.getCategories.mockResolvedValue({ data: existingCategories });

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.categories).toEqual(existingCategories));
    expect(mocks.initializeCategories).not.toHaveBeenCalled();
  });
});
