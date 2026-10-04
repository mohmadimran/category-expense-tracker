import { useState } from 'react';
import ExpenseItem from './ExpenseItem';
import LoadingSpinner from './LoadingSpinner';
import type { ApiActionResult, Category, Expense, ExpenseFilters, ExpenseInput, Pagination } from '../types';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  pagination: Pagination;
  filters: ExpenseFilters;
  loading: boolean;
  error: string | null;
  onFilterChange: (filters: Partial<ExpenseFilters>) => void;
  onPageChange: (page: number) => void;
  onUpdateExpense: (id: string, data: ExpenseInput) => Promise<ApiActionResult>;
  onDeleteExpense: (id: string) => Promise<ApiActionResult>;
}

const ExpenseList = ({ 
  expenses, 
  categories, 
  pagination, 
  filters,
  loading,
  error,
  onFilterChange, 
  onPageChange,
  onUpdateExpense,
  onDeleteExpense
}: ExpenseListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
  };

  const handleUpdate = async (id: string, data: ExpenseInput) => {
    const result = await onUpdateExpense(id, data);
    if (result.success) {
      setEditingId(null);
    }
    return result;
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await onDeleteExpense(id);
    }
  };

  const handleClearFilters = () => {
    onFilterChange({ 
      category_id: '', 
      start_date: '', 
      end_date: '' 
    });
  };

  if (loading && expenses.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        background: '#f8d7da', 
        color: '#721c24',
        borderRadius: '4px',
        marginTop: '20px'
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '4px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center'
      }}>
        <select
          value={filters.category_id || ''}
          onChange={(e) => onFilterChange({ category_id: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '150px'
          }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.start_date || ''}
          onChange={(e) => onFilterChange({ start_date: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
          placeholder="Start Date"
        />

        <input
          type="date"
          value={filters.end_date || ''}
          onChange={(e) => onFilterChange({ end_date: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
          placeholder="End Date"
        />

        <button
          onClick={handleClearFilters}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Expense Table */}
      {expenses.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#f8f9fa',
          borderRadius: '4px',
          color: '#666'
        }}>
          <p style={{ fontSize: '18px' }}>No expenses found</p>
          <p style={{ fontSize: '14px' }}>
            {(filters.category_id || filters.start_date || filters.end_date)
              ? 'Try adjusting your filters' 
              : 'Add your first expense using the form above'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              marginTop: '10px'
            }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                    Date
                  </th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                    Description
                  </th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                    Category
                  </th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                    Amount
                  </th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    categories={categories}
                    isEditing={editingId === expense.id}
                    onEdit={handleEdit}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onCancel={() => setEditingId(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              padding: '10px 0'
            }}>
              <div style={{ color: '#666', fontSize: '14px' }}>
                Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} expenses
              </div>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: pagination.page <= 1 ? '#e9ecef' : 'white',
                    cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const start = Math.max(1, pagination.page - 2);
                  const pageNum = start + i;
                  if (pageNum > pagination.totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: pageNum === pagination.page ? '#007bff' : 'white',
                        color: pageNum === pagination.page ? 'white' : 'black',
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: pagination.page >= pagination.totalPages ? '#e9ecef' : 'white',
                    cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExpenseList;
