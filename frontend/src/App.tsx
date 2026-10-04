import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import CategoryManager from './components/CategoryManager';
import SummaryView from './components/SummaryView';
import { useExpenses } from './hooks/useExpenses';
import { useCategories } from './hooks/useCategories';
import './App.css';
import api, { setCsrfToken, type AuthUser, type ManagedUser } from './api/api';
type Tab = 'expenses' | 'categories' | 'summary';

function Dashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [accounts, setAccounts] = useState<ManagedUser[]>([]);
  const [accountError, setAccountError] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '', role: 'member' as 'admin' | 'member' });
  const loadAccounts = async () => setAccounts((await api.getUsers()).data);
  useEffect(() => {
    if (user.role === 'admin') {
      api.getUsers().then(({ data }) => setAccounts(data)).catch(() => setAccountError('Could not load team accounts'));
    }
  }, [user.role]);
  
  const {
    expenses,
    pagination,
    filters,
    loading: expensesLoading,
    error: expensesError,
    updateFilters,
    changePage,
    addExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses
  } = useExpenses();

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    addCategory,
    deleteCategory,
    refreshCategories
  } = useCategories();

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'expenses') {
      refreshExpenses();
    } else if (tab === 'categories') {
      refreshCategories();
      refreshExpenses();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'expenses':
        return (
          <>
            <ExpenseForm 
              categories={categories} 
              onAddExpense={addExpense}
            />
            <ExpenseList 
              expenses={expenses}
              categories={categories}
              pagination={pagination}
              filters={filters}
              loading={expensesLoading}
              error={expensesError}
              onFilterChange={updateFilters}
              onPageChange={changePage}
              onUpdateExpense={updateExpense}
              onDeleteExpense={deleteExpense}
              canManageExpense={expense => user.role === 'admin' || expense.created_by === user.id}
            />
          </>
        );
      
      case 'categories':
        return (
          <CategoryManager 
            categories={categories}
            loading={categoriesLoading}
            error={categoriesError}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            canManage={user.role === 'admin'}
          />
        );
      
      case 'summary':
        return <SummaryView />;
      
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header" style={{
        textAlign: 'center',
        padding: '20px 0',
        borderBottom: '2px solid #e9ecef',
        marginBottom: '20px'
      }}>
        <span style={{ float: 'right' }}>{user.name} ({user.role}) <button onClick={onLogout}>Sign out</button></span>
        <h1 style={{ fontSize: '2rem', color: '#2c3e50', margin: 0 }}>
          💰 Team Expense Tracker
        </h1>
        <p style={{ color: '#6c757d', fontSize: '0.95rem', marginTop: '5px' }}>
          Track, organize, and analyze team spending
        </p>
      </header>

      <nav className="app-nav" style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e9ecef',
        paddingBottom: 0
      }}>
        <button
          className="app-nav-button"
          style={{
            padding: '10px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'expenses' ? '#007bff' : 'transparent'}`,
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'expenses' ? 'bold' : 'normal',
            color: activeTab === 'expenses' ? '#007bff' : '#6c757d',
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleTabChange('expenses')}
        >
          📋 Expenses
        </button>
        <button
          className="app-nav-button"
          style={{
            padding: '10px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'categories' ? '#007bff' : 'transparent'}`,
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'categories' ? 'bold' : 'normal',
            color: activeTab === 'categories' ? '#007bff' : '#6c757d',
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleTabChange('categories')}
        >
          🏷️ Categories
        </button>
        <button
          className="app-nav-button"
          style={{
            padding: '10px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'summary' ? '#007bff' : 'transparent'}`,
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'summary' ? 'bold' : 'normal',
            color: activeTab === 'summary' ? '#007bff' : '#6c757d',
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleTabChange('summary')}
        >
          📊 Summary
        </button>
      </nav>

      <main className="app-main" style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        minHeight: '400px'
      }}>
        {renderTabContent()}
      </main>

      {user.role === 'admin' && <section className="account-panel">
        <h2>Team accounts</h2>
        {accountError && <p role="alert">{accountError}</p>}
        <form className="account-form" onSubmit={async event => {
          event.preventDefault(); setAccountError('');
          try { await api.createUser(accountForm); setAccountForm({ name: '', email: '', password: '', role: 'member' }); await loadAccounts(); }
          catch { setAccountError('Could not create account. Emails must be unique and passwords need at least 12 characters.'); }
        }}>
          <input aria-label="Name" placeholder="Name" maxLength={100} required value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} />
          <input aria-label="Email" placeholder="Email" type="email" required value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} />
          <input aria-label="Temporary password" placeholder="Temporary password (12+ characters)" type="password" minLength={12} required value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} />
          <select aria-label="Role" value={accountForm.role} onChange={e => setAccountForm({ ...accountForm, role: e.target.value as 'admin' | 'member' })}><option value="member">Member</option><option value="admin">Admin</option></select>
          <button type="submit">Create account</button>
        </form>
        <ul className="account-list">{accounts.map(account => <li key={account.id}><span>{account.name} · {account.email} · {account.role} · {account.isActive ? 'Active' : 'Disabled'}</span>{account.id !== user.id && <span>
          <button onClick={async () => { try { await api.updateUser(account.id, { isActive: !account.isActive }); await loadAccounts(); } catch { setAccountError('Could not update account'); } }}>{account.isActive ? 'Disable' : 'Enable'}</button>
          <button onClick={async () => { try { await api.updateUser(account.id, { role: account.role === 'admin' ? 'member' : 'admin' }); await loadAccounts(); } catch { setAccountError('Could not update account'); } }}>{account.role === 'admin' ? 'Make member' : 'Make admin'}</button>
        </span>}</li>)}</ul>
      </section>}

      <footer className="app-footer" style={{
        textAlign: 'center',
        padding: '20px 0',
        marginTop: '30px',
        color: '#6c757d',
        fontSize: '0.9rem',
        borderTop: '1px solid #e9ecef'
      }}>
        <p>Team Expense Tracker - Built with MERN Stack</p>
      </footer>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  useEffect(() => {
    const handleExpiredSession = () => { setCsrfToken(null); setUser(null); };
    window.addEventListener('auth:session-expired', handleExpiredSession);
    return () => window.removeEventListener('auth:session-expired', handleExpiredSession);
  }, []);
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await api.getSession();
        setUser(data.user); setCsrfToken(data.csrfToken);
      } catch { setCsrfToken(null); }
      finally { setChecking(false); }
    };
    void restoreSession();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    try {
      const { data } = isRegistering
        ? await api.register(name, email, password)
        : await api.login(email, password);
      setUser(data.user); setCsrfToken(data.csrfToken); setPassword('');
    } catch (requestError) {
      const status = axios.isAxiosError(requestError) ? requestError.response?.status : undefined;
      setError(isRegistering
        ? status === 409 ? 'An account with this email already exists.' : status === 429 ? 'Too many registration attempts. Try again later.' : 'Could not create account. Use a valid email and a password of at least 12 characters.'
        : status === 429 ? 'Too many sign-in attempts. Try again later.' : 'Email or password is incorrect.');
    }
  };
  const logout = async () => { try { await api.logout(); } finally { setCsrfToken(null); setUser(null); } };
  if (checking) return <main className="auth-screen"><p>Checking session…</p></main>;
  if (!user) return <main className="auth-screen"><form className="login-card" onSubmit={submit}>
    <h1>Team Expense Tracker</h1><p>{isRegistering ? 'Create an account to start tracking your expenses.' : 'Sign in to manage team expenses.'}</p>
    {error && <p role="alert">{error}</p>}
    {isRegistering && <label>Name<input autoComplete="name" maxLength={100} required value={name} onChange={e => setName(e.target.value)} /></label>}
    <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Password<input type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} minLength={isRegistering ? 12 : undefined} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} />{isRegistering && <small>Use 12–72 UTF-8 bytes.</small>}</label>
    <button type="submit">{isRegistering ? 'Create account' : 'Sign in'}</button>
    <button type="button" className="auth-toggle" onClick={() => { setIsRegistering(!isRegistering); setError(''); }}>{isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
  </form></main>;
  return <Dashboard user={user} onLogout={() => void logout()} />;
}

export default App;
