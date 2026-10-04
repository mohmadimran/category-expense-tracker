import { useState } from 'react';
import { validateCategory } from '../utils/validators';
import type { ChangeEvent, FormEvent } from 'react';
import type { ApiActionResult, CategoryInput, ValidationErrors } from '../types';

interface CategoryFormProps {
  onAddCategory: (data: CategoryInput) => Promise<ApiActionResult>;
}

const CategoryForm = ({ onAddCategory }: CategoryFormProps) => {
  const [formData, setFormData] = useState<{ name: string; monthly_budget: string }>({
    name: '',
    monthly_budget: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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

    const data = {
      name: formData.name.trim(),
      monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : null
    };

    const validationErrors = validateCategory(data);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onAddCategory(data);
      if (result.success) {
        setSuccess('Category added successfully!');
        setFormData({ name: '', monthly_budget: '' });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors({ submit: result.error || 'Failed to add category' });
      }
    } catch {
      setErrors({ submit: 'Failed to add category' });
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
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Add New Category</h3>
      
      {errors.submit && (
        <div style={{
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
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              name="name"
              placeholder="Category Name"
              value={formData.name}
              onChange={handleChange}
              style={{
                padding: '8px 12px',
                border: `1px solid ${errors.name ? '#dc3545' : '#ddd'}`,
                borderRadius: '4px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            {errors.name && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.name}
              </div>
            )}
          </div>
          
          <div style={{ flex: '1', minWidth: '150px' }}>
            <input
              type="number"
              name="monthly_budget"
              step="0.01"
              placeholder="Monthly Budget (optional)"
              value={formData.monthly_budget}
              onChange={handleChange}
              style={{
                padding: '8px 12px',
                border: `1px solid ${errors.monthly_budget ? '#dc3545' : '#ddd'}`,
                borderRadius: '4px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            {errors.monthly_budget && (
              <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                {errors.monthly_budget}
              </div>
            )}
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 24px',
                background: isSubmitting ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                height: '42px'
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;
