import { useState, useEffect, useCallback } from 'react';
import api from '../api/api';  // Changed from { api } to default import

export const useSummary = (initialParams = {}) => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getSummary(params);
      setSummary(response.data || []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch summary';
      setError(errorMsg);
      console.error('Fetch summary error:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const updateParams = (newParams) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
    }));
  };

  const getTotalSpent = () => {
    return summary.reduce((total, item) => total + (item.total_spent || 0), 0);
  };

  const getCategoriesOverBudget = () => {
    return summary.filter((item) => item.is_over_budget);
  };

  return {
    summary,
    loading,
    error,
    updateParams,
    fetchSummary,
    getTotalSpent,
    getCategoriesOverBudget,
  };
};