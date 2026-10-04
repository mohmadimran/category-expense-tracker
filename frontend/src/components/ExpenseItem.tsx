import { useState } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { FormEvent, MouseEvent } from 'react';
import type { ApiActionResult, Category, Expense, ExpenseInput } from '../types';

interface ExpenseItemProps {
  expense: Expense;
  categories: Category[];
  isEditing: boolean;
  onEdit: (expense: Expense) => void;
  onUpdate: (id: string, data: ExpenseInput) => Promise<ApiActionResult>;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

const ExpenseItem = ({ 
  expense, 
  categories, 
  isEditing, 
  onEdit, 
  onUpdate, 
  onDelete, 
  onCancel 
}: ExpenseItemProps) => {
  const [editData, setEditData] = useState({
    amount: expense.amount,
    description: expense.description,
    category_id: expense.category_id || '',
    date: expense.date
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError('');
    
    if (editData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!editData.description.trim()) {
      setError('Description is required');
      return;
    }
    if (!editData.category_id) {
      setError('Category is required');
      return;
    }
    
    onUpdate(expense.id, editData);
  };

  if (isEditing) {
    return (
      <tr>
        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
          <input
            type="date"
            value={editData.date}
            onChange={(e) => setEditData({...editData, date: e.target.value})}
            style={{ padding: '5px', width: '100%' }}
          />
        </td>
        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
          <input
            type="text"
            value={editData.description}
            onChange={(e) => setEditData({...editData, description: e.target.value})}
            style={{ padding: '5px', width: '100%' }}
          />
        </td>
        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
          <select
            value={editData.category_id}
            onChange={(e) => setEditData({...editData, category_id: e.target.value})}
            style={{ padding: '5px', width: '100%' }}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </td>
        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
          <input
            type="number"
            step="0.01"
            value={editData.amount}
            onChange={(e) => setEditData({...editData, amount: parseFloat(e.target.value) || 0})}
            style={{ padding: '5px', width: '100%' }}
          />
        </td>
        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
          {error && <div style={{ color: 'red', fontSize: '12px', marginBottom: '5px' }}>{error}</div>}
          <button 
            onClick={handleSubmit}
            style={{ 
              marginRight: '5px',
              padding: '5px 10px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Save
          </button>
          <button 
            onClick={onCancel}
            style={{
              padding: '5px 10px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
        {formatDate(expense.date)}
      </td>
      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
        {expense.description}
      </td>
      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
        <span style={{
          background: '#e9ecef',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          display: 'inline-block'
        }}>
          {expense.category_name || 'Uncategorized'}
        </span>
      </td>
      <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>
        {formatCurrency(expense.amount)}
      </td>
      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
        <button 
          onClick={() => onEdit(expense)}
          style={{ 
            marginRight: '5px',
            padding: '5px 12px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Edit
        </button>
        <button 
          onClick={() => onDelete(expense.id)}
          style={{
            padding: '5px 12px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

export default ExpenseItem;
