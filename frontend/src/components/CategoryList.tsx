import { formatCurrency } from '../utils/formatters';
import type { Category } from '../types';

const CategoryList = ({ categories, onDelete }: { categories: Category[]; onDelete: (id: string, name: string) => void }) => {
  if (categories.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '30px',
        color: '#666',
        background: '#f8f9fa',
        borderRadius: '4px'
      }}>
        No categories created yet
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
              Name
            </th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
              Monthly Budget
            </th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat._id}>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                <strong>{cat.name}</strong>
              </td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                {cat.monthly_budget !== null ? (
                  <span style={{ 
                    background: '#d4edda', 
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    display: 'inline-block'
                  }}>
                    {formatCurrency(cat.monthly_budget)}
                  </span>
                ) : (
                  <span style={{ color: '#666', fontSize: '14px' }}>No budget set</span>
                )}
              </td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                <button
                  onClick={() => onDelete(cat._id, cat.name)}
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryList;
