import { useState } from 'react';
import { validateExpense } from '../utils/validators';
import { formatDateInput } from '../utils/formatters';
import type { ChangeEvent, FormEvent } from 'react';
import type { Category, ExpenseInput, ApiActionResult, ValidationErrors } from '../types';

interface ExpenseFormProps {
  categories: Category[];
  onAddExpense: (data: ExpenseInput) => Promise<ApiActionResult>;
}

const ExpenseForm = ({ categories, onAddExpense }: ExpenseFormProps) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category_id: '',
    date: formatDateInput(new Date())
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    
    const validationErrors = validateExpense(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const data = {
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category_id: formData.category_id,
        date: formData.date
      };
      
      const result = await onAddExpense(data);
      
      if (result.success) {
        setSuccess('Expense added successfully!');
        setFormData({
          amount: '',
          description: '',
          category_id: '',
          date: formatDateInput(new Date())
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors({ submit: result.error || 'Failed to add expense' });
      }
    } catch {
      setErrors({ submit: 'Failed to add expense' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      marginBottom: '30px',
      padding: '20px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Add New Expense</h3>
      
      {errors.submit && (
        <div className="expense-form-grid" style={{
          padding: '10px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {errors.submit}
        </div>
      )}
      
      {success && (
        <div style={{
          padding: '10px',
          background: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1.5fr 1fr auto',
          gap: '10px',
          alignItems: 'start'
        }}>
          <div>
            <input
              type="number"
              name="amount"
              step="0.01"
              placeholder="Amount"
              value={formData.amount}
              onChange={handleChange}
              style={{
                padding: '8px 12px',
                border: `1px solid ${errors.amount ? '#dc3545' : '#ddd'}`,
                borderRadius: '4px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            {errors.amount && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.amount}
              </div>
            )}
          </div>
          
          <div>
            <input
              type="text"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              style={{
                padding: '8px 12px',
                border: `1px solid ${errors.description ? '#dc3545' : '#ddd'}`,
                borderRadius: '4px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            {errors.description && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.description}
              </div>
            )}
          </div>
          
          <div>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              style={{
                padding: '8px 12px',
                border: `1px solid ${errors.category_id ? '#dc3545' : '#ddd'}`,
                borderRadius: '4px',
                width: '100%',
                boxSizing: 'border-box',
                background: 'white'
              }}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.category_id}
              </div>
            )}
          </div>
          
          <div>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              style={{
                padding: '8px 12px',
                border: `1px solid ${errors.date ? '#dc3545' : '#ddd'}`,
                borderRadius: '4px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            {errors.date && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.date}
              </div>
            )}
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                background: isSubmitting ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                width: '100%',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
