import { formatCurrency } from '../utils/formatters';
import type { SummaryCategory } from '../types';

const SummaryCard = ({ item }: { item: SummaryCategory }) => {
  const { 
    category_name, 
    total_spent, 
    monthly_budget, 
    is_over_budget 
  } = item;

  const hasBudget = monthly_budget !== null;
  const utilization = hasBudget
    ? monthly_budget === 0
      ? (total_spent > 0 ? Number.POSITIVE_INFINITY : 0)
      : (total_spent / monthly_budget) * 100
    : 0;
  
  const getUtilizationColor = () => {
    if (utilization > 100) return '#dc3545';
    if (utilization > 80) return '#ffc107';
    return '#28a745';
  };

  return (
    <div style={{
      background: 'white',
      border: `1px solid ${is_over_budget ? '#dc3545' : '#ddd'}`,
      borderRadius: '4px',
      padding: '15px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px'
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '16px' }}>
            {category_name}
            {is_over_budget && (
              <span style={{
                marginLeft: '8px',
                fontSize: '12px',
                background: '#dc3545',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                ⚠️ Over Budget
              </span>
            )}
          </h4>
          {hasBudget && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Budget: {formatCurrency(monthly_budget)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {formatCurrency(total_spent)}
          </div>
          {hasBudget && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Number.isFinite(utilization) ? `${utilization.toFixed(0)}% used` : 'Over budget'}
            </div>
          )}
        </div>
      </div>
      
      {hasBudget && (
        <div style={{
          width: '100%',
          height: '6px',
          background: '#e9ecef',
          borderRadius: '3px',
          overflow: 'hidden',
          marginTop: '10px'
        }}>
          <div style={{
            width: `${Math.min(utilization, 100)}%`,
            height: '100%',
            background: getUtilizationColor(),
            transition: 'width 0.5s ease'
          }} />
        </div>
      )}
      
      {!hasBudget && (
        <div style={{
          fontSize: '12px',
          color: '#999',
          marginTop: '5px'
        }}>
          No budget set
        </div>
      )}
    </div>
  );
};

export default SummaryCard;
