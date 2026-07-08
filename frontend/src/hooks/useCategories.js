import { useState, useEffect, useCallback } from 'react';
import api from '../api/api.js';  // Changed from { api } to default import

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCategories();
      setCategories(response.data || []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch categories';
      setError(errorMsg);
      console.error('Fetch categories error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await api.createCategory(data);
      await fetchCategories();
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to add category';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteCategory(id);
      await fetchCategories();
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete category';
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