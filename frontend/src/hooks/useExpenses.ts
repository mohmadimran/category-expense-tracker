import { useState, useEffect, useCallback } from 'react';
import api from '../api/api.js';  // Changed from { api } to default import
import type { Expense, ExpenseFilters, Pagination, ExpenseInput, ApiActionResult } from '../types';
import { getErrorMessage } from '../api/getErrorMessage';

export const useExpenses = (initialFilters: Partial<ExpenseFilters> = {}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<ExpenseFilters>({
    page: 1,
    limit: 20,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getExpenses(filters);
      setExpenses(response.data.data || []);
      setPagination(response.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to fetch expenses');
      setError(errorMsg);
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // Fetching here synchronizes the hook with the server; state updates happen after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchExpenses();
  }, [fetchExpenses]);

  const updateFilters = (newFilters: Partial<ExpenseFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
  };

  const changePage = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const addExpense = async (data: ExpenseInput): Promise<ApiActionResult> => {
    setLoading(true);
    setError(null);
    try {
      await api.createExpense(data);
      await fetchExpenses();
      return { success: true };
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to add expense');
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const updateExpense = async (id: string, data: ExpenseInput): Promise<ApiActionResult> => {
    setLoading(true);
    setError(null);
    try {
      await api.updateExpense(id, data);
      await fetchExpenses();
      return { success: true };
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to update expense');
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string): Promise<ApiActionResult> => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteExpense(id);
      await fetchExpenses();
      return { success: true };
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to delete expense');
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  return {
    expenses,
    pagination,
    filters,
    loading,
    error,
    updateFilters,
    changePage,
    addExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses: fetchExpenses,
  };
};
