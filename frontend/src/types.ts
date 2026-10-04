export interface Category {
  _id: string;
  name: string;
  monthly_budget: number | null;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_id: string | null;
  category_name: string;
  monthly_budget: number | null;
  created_by?: string | null;
}

export interface ExpenseInput {
  amount: number;
  description: string;
  category_id: string;
  date: string;
}

export interface CategoryInput {
  name: string;
  monthly_budget: number | null;
}

export interface SummaryCategory {
  category_id: string;
  category_name: string;
  monthly_budget: number | null;
  total_spent: number;
  is_over_budget: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExpenseFilters {
  page: number;
  limit: number;
  category_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface ApiActionResult {
  success: boolean;
  error?: string;
}

export type ValidationErrors = Record<string, string>;
