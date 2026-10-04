import { useState, useEffect, useCallback } from 'react';
import api from '../api/api.js';  // Changed from { api } to default import
import type { Category, CategoryInput, ApiActionResult } from '../types';
import { getErrorMessage } from '../api/getErrorMessage';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCategories();
      setCategories(response.data || []);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to fetch categories');
      setError(errorMsg);
      console.error('Fetch categories error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching here synchronizes the hook with the server; state updates happen after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (data: CategoryInput): Promise<ApiActionResult> => {
    setLoading(true);
    setError(null);
    try {
      await api.createCategory(data);
      await fetchCategories();
      return { success: true };
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to add category');
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string): Promise<ApiActionResult> => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteCategory(id);
      await fetchCategories();
      return { success: true };
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to delete category');
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  return {
    categories,
    loading,
    error,
    addCategory,
    deleteCategory,
    refreshCategories: fetchCategories,
  };
};
