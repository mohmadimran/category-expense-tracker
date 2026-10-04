import { useState, useEffect, useCallback } from 'react';
import api from '../api/api';  // Changed from { api } to default import
import type { SummaryCategory } from '../types';
import { getErrorMessage } from '../api/getErrorMessage';

export const useSummary = (initialParams: { month: number; year: number }) => {
  const [summary, setSummary] = useState<SummaryCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<{ month: number; year: number }>(initialParams);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getSummary(params);
      setSummary(response.data || []);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to fetch summary');
      setError(errorMsg);
      console.error('Fetch summary error:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    // Fetching here synchronizes the hook with the server; state updates happen after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSummary();
  }, [fetchSummary]);

  const updateParams = (newParams: Partial<{ month: number; year: number }>) => {
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
