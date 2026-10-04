import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { Category, CategoryInput, Expense, ExpenseFilters, ExpenseInput, Pagination, SummaryCategory } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
let csrfToken: string | null = null;
export const setCsrfToken = (token: string | null) => { csrfToken = token; };

const readCsrfCookie = () => {
  if (typeof document === 'undefined') return null;
  const value = document.cookie.split('; ').find(cookie => cookie.startsWith('csrf='))?.slice(5);
  return value ? decodeURIComponent(value) : null;
};

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});
let refreshInFlight: Promise<string> | null = null;

type RetryConfig = InternalAxiosRequestConfig & { authRetry?: boolean };

const refreshAccessToken = async () => {
  const refresh = async () => {
    try {
      const { data } = await apiClient.get<{ user: AuthUser; csrfToken: string }>('/auth/session');
      csrfToken = data.csrfToken;
      return csrfToken;
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
    }
    const { data: csrfData } = await apiClient.get<{ csrfToken: string | null }>('/auth/csrf');
    if (!csrfData.csrfToken) throw new Error('CSRF session is missing');
    csrfToken = csrfData.csrfToken;
    const { data } = await apiClient.post<{ user: AuthUser; csrfToken: string }>('/auth/refresh');
    csrfToken = data.csrfToken;
    return csrfToken;
  };

  if (!refreshInFlight) {
    const run = () => refresh();
    const pendingRefresh = typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('category-expense-session-refresh', async () => await run()) as unknown as Promise<string>
      : run();
    refreshInFlight = pendingRefresh.finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
};

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    const isRefreshRequest = config.url?.includes('/auth/refresh');
    const requestCsrfToken = isRefreshRequest ? readCsrfCookie() || csrfToken : csrfToken || readCsrfCookie();
    if (requestCsrfToken && ['post', 'put', 'patch', 'delete'].includes((config.method || 'get').toLowerCase())) {
      config.headers.set('X-CSRF-Token', requestCsrfToken);
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
  async (error) => {
    const original = error.config as RetryConfig | undefined;
    const url = original?.url || '';
    const isPublicAuthRequest = ['/auth/session', '/auth/login', '/auth/register', '/auth/refresh'].some(path => url.includes(path));
    const isSessionFailure = error.response?.status === 401 ||
      error.response?.status === 403 && error.response?.data?.error === 'CSRF validation failed';
    if (isSessionFailure && original && !original.authRetry && !isPublicAuthRequest) {
      original.authRetry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.set('X-CSRF-Token', token);
        return await apiClient(original);
      } catch (refreshError) {
        const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
        if (typeof window !== 'undefined' && (status === 401 || status === 403 || refreshError instanceof Error && refreshError.message === 'CSRF session is missing')) {
          window.dispatchEvent(new Event('auth:session-expired'));
        }
        return Promise.reject(refreshError);
      }
    }
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
  register: (name: string, email: string, password: string) => apiClient.post<{ user: AuthUser; csrfToken: string }>('/auth/register', { name, email, password }),
  login: (email: string, password: string) => apiClient.post<{ user: AuthUser; csrfToken: string }>('/auth/login', { email, password }),
  getSession: async () => {
    try {
      return await apiClient.get<{ user: AuthUser; csrfToken: string }>('/auth/session');
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
      await refreshAccessToken();
      return apiClient.get<{ user: AuthUser; csrfToken: string }>('/auth/session');
    }
  },
  getCsrf: () => apiClient.get<{ csrfToken: string | null }>('/auth/csrf'),
  refresh: () => apiClient.post<{ user: AuthUser; csrfToken: string }>('/auth/refresh'),
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
  initializeCategories: () => apiClient.post<Category[]>('/categories/initialize'),
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
