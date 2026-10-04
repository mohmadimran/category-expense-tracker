import axios from 'axios';
import type { Category, CategoryInput, Expense, ExpenseFilters, ExpenseInput, Pagination, SummaryCategory } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
let csrfToken: string | null = null;
export const setCsrfToken = (token: string | null) => { csrfToken = token; };

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes((config.method || 'get').toLowerCase())) {
      config.headers.set('X-CSRF-Token', csrfToken);
    }
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
  login: (email: string, password: string) => apiClient.post<{ user: AuthUser; csrfToken: string }>('/auth/login', { email, password }),
  getSession: () => apiClient.get<{ user: AuthUser; csrfToken: string }>('/auth/session'),
  logout: () => apiClient.post('/auth/logout'),
  getUsers: () => apiClient.get<ManagedUser[]>('/auth/users'),
  createUser: (data: { name: string; email: string; password: string; role: 'admin' | 'member' }) => apiClient.post('/auth/users', data),
  updateUser: (id: string, data: { role?: 'admin' | 'member'; isActive?: boolean }) => apiClient.patch(`/auth/users/${id}`, data),
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

export interface AuthUser { id: string; name: string; email: string; role: 'admin' | 'member'; }
export interface ManagedUser extends AuthUser { isActive: boolean; createdAt: string; }

export default api;
