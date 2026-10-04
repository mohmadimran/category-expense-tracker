import axios from 'axios';

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError<{ error?: string; errors?: string[] }>(error)) return fallback;
  const response = error.response?.data;
  if (response?.errors?.length) return response.errors.join(', ');
  return response?.error || fallback;
};
