import axios from 'axios';
import type { Category, CategoryInput, Expense, ExpenseFilters, ExpenseInput, Pagination, SummaryCategory } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`📤 ${(config.method || 'get').toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

const api = {
  // Expenses
  getExpenses: (params: ExpenseFilters) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    return apiClient.get<{ data: Expense[]; pagination: Pagination }>(`/expenses${queryString ? `?${queryString}` : ''}`);
  },
  
  createExpense: (data: ExpenseInput) => apiClient.post('/expenses', data),
  updateExpense: (id: string, data: ExpenseInput) => apiClient.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => apiClient.delete(`/expenses/${id}`),
  
  // Categories
  getCategories: () => apiClient.get<Category[]>('/categories'),
  createCategory: (data: CategoryInput) => apiClient.post('/categories', data),
  deleteCategory: (id: string) => apiClient.delete(`/categories/${id}`),
  
  // Summary
  getSummary: (params: { month: number; year: number }) => {
    const queryParams = new URLSearchParams();
    queryParams.set('month', String(params.month));
    queryParams.set('year', String(params.year));
    const queryString = queryParams.toString();
    return apiClient.get<SummaryCategory[]>(`/summary${queryString ? `?${queryString}` : ''}`);
  },
};

export default api;
