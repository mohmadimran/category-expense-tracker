import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const mocks = vi.hoisted(() => ({
  setCsrfToken: vi.fn(),
  api: {
    register: vi.fn(), login: vi.fn(), getSession: vi.fn(), refresh: vi.fn(), logout: vi.fn(),
    getUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(),
  },
  useExpenses: vi.fn(),
  useCategories: vi.fn(),
}));

vi.mock('../../src/api/api', () => ({ default: mocks.api, setCsrfToken: mocks.setCsrfToken }));
vi.mock('../../src/hooks/useExpenses', () => ({ useExpenses: mocks.useExpenses }));
vi.mock('../../src/hooks/useCategories', () => ({ useCategories: mocks.useCategories }));

const member = { id: 'member-id', name: 'New Member', email: 'new@example.test', role: 'member' as const };

describe('authentication screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.api.getSession.mockRejectedValue(new Error('No current access session'));
    mocks.api.refresh.mockRejectedValue(new Error('No refresh session'));
    mocks.useExpenses.mockReturnValue({
      expenses: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      filters: { page: 1, limit: 20 }, loading: false, error: null,
      updateFilters: vi.fn(), changePage: vi.fn(), addExpense: vi.fn(),
      updateExpense: vi.fn(), deleteExpense: vi.fn(), refreshExpenses: vi.fn(),
    });
    mocks.useCategories.mockReturnValue({
      categories: [], loading: false, error: null,
      addCategory: vi.fn(), deleteCategory: vi.fn(), refreshCategories: vi.fn(),
    });
  });

  it('registers a member and signs them in', async () => {
    const user = userEvent.setup();
    mocks.api.register.mockResolvedValue({ data: { user: member, csrfToken: 'csrf-value' } });
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'New here? Create an account' }));
    await user.type(screen.getByLabelText('Name'), member.name);
    await user.type(screen.getByLabelText('Email'), member.email);
    await user.type(screen.getByLabelText(/Password/), 'a-long-test-password-123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(mocks.api.register).toHaveBeenCalledWith(member.name, member.email, 'a-long-test-password-123'));
    expect(mocks.setCsrfToken).toHaveBeenCalledWith('csrf-value');
    expect(await screen.findByText('New Member (member)')).toBeInTheDocument();
  });

  it('signs in an existing account', async () => {
    const user = userEvent.setup();
    mocks.api.login.mockResolvedValue({ data: { user: member, csrfToken: 'login-csrf' } });
    render(<App />);

    await user.type(await screen.findByLabelText('Email'), member.email);
    await user.type(screen.getByLabelText('Password'), 'existing-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mocks.api.login).toHaveBeenCalledWith(member.email, 'existing-password'));
    expect(await screen.findByText('New Member (member)')).toBeInTheDocument();
  });

  it('restores an existing authenticated session', async () => {
    mocks.api.getSession.mockResolvedValue({ data: { user: member, csrfToken: 'session-csrf' } });
    render(<App />);

    expect(await screen.findByText('New Member (member)')).toBeInTheDocument();
    expect(mocks.api.getSession).toHaveBeenCalledOnce();
    expect(mocks.setCsrfToken).toHaveBeenCalledWith('session-csrf');
  });
});
