import { useState, useEffect, useCallback } from 'react';
import api from '../api/api.js';  // Changed from { api } to default import

export const useExpenses = (initialFilters = {}) => {
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const errorMsg = err.response?.data?.error || 'Failed to fetch expenses';
      setError(errorMsg);
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
  };

  const changePage = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const addExpense = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await api.createExpense(data);
      await fetchExpenses();
      return { success: true };
    } catch (err) {
      const errors = err.response?.data?.errors;
      const errorMsg = errors ? errors.join(', ') : err.response?.data?.error || 'Failed to add expense';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const updateExpense = async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      await api.updateExpense(id, data);
      await fetchExpenses();
      return { success: true };
    } catch (err) {
      const errors = err.response?.data?.errors;
      const errorMsg = errors ? errors.join(', ') : err.response?.data?.error || 'Failed to update expense';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteExpense(id);
      await fetchExpenses();
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete expense';
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