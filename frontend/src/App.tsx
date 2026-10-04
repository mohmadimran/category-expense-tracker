import { useState } from 'react';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import CategoryManager from './components/CategoryManager';
import SummaryView from './components/SummaryView';
import { useExpenses } from './hooks/useExpenses';
import { useCategories } from './hooks/useCategories';
type Tab = 'expenses' | 'categories' | 'summary';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  
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
          />
        );
      
      case 'summary':
        return <SummaryView />;
      
      default:
        return null;
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f4f6f8',
      minHeight: '100vh'
    }}>
      <header style={{
        textAlign: 'center',
        padding: '20px 0',
        borderBottom: '2px solid #e9ecef',
        marginBottom: '20px'
      }}>
        <h1 style={{ fontSize: '2rem', color: '#2c3e50', margin: 0 }}>
          💰 Team Expense Tracker
        </h1>
        <p style={{ color: '#6c757d', fontSize: '0.95rem', marginTop: '5px' }}>
          Track, organize, and analyze team spending
        </p>
      </header>

      <nav style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e9ecef',
        paddingBottom: 0
      }}>
        <button
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

      <main style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        minHeight: '400px'
      }}>
        {renderTabContent()}
      </main>

      <footer style={{
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

export default App;
