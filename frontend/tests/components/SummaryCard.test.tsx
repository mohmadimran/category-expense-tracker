import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SummaryCard from '../../src/components/SummaryCard';
import type { SummaryCategory } from '../../src/types';

describe('SummaryCard', () => {
  it('shows budget usage and over-budget status', () => {
    const item: SummaryCategory = {
      category_id: 'food-id',
      category_name: 'Food',
      monthly_budget: 100,
      total_spent: 125,
      is_over_budget: true,
    };

    render(<SummaryCard item={item} />);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/Over Budget/)).toBeInTheDocument();
    expect(screen.getByText('125% used')).toBeInTheDocument();
    expect(screen.getByText('Budget: $100.00')).toBeInTheDocument();
  });

  it('explains when a category has no budget', () => {
    render(<SummaryCard item={{
      category_id: 'travel-id',
      category_name: 'Travel',
      monthly_budget: null,
      total_spent: 20,
      is_over_budget: false,
    }} />);

    expect(screen.getByText('No budget set')).toBeInTheDocument();
  });
});
