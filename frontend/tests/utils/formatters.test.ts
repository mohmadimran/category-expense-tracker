import { describe, expect, it } from 'vitest';
import { formatDate, formatDateInput } from '../../src/utils/formatters';

describe('date formatting', () => {
  it('keeps date-only strings on the same calendar date', () => {
    expect(formatDateInput('2025-01-02')).toBe('2025-01-02');
    expect(formatDate('2025-01-02')).toMatch(/Jan 2, 2025/);
  });
});
