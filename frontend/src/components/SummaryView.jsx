import React, { useState } from 'react';
import SummaryCard from './SummaryCard';
import LoadingSpinner from './LoadingSpinner';
import { formatCurrency } from '../utils/formatters';
import { useSummary } from '../hooks/useSummary';

const SummaryView = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const { 
    summary, 
    loading, 
    error, 
    updateParams,
    getTotalSpent,
    getCategoriesOverBudget
  } = useSummary({ month, year });

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    setMonth(newMonth);
    updateParams({ month: newMonth, year });
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setYear(newYear);
    updateParams({ month, year: newYear });
  };

  const totalSpent = getTotalSpent();
  const overBudgetCategories = getCategoriesOverBudget();

  const getMonthName = (m) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[m - 1];
  };

  if (loading && summary.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Spending Summary</h2>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>
            {getMonthName(month)} {year}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={month} 
            onChange={handleMonthChange}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
          
          <select 
            value={year} 
            onChange={handleYearChange}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '15px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          Error: {error}
        </div>
      )}

      {/* Total and alerts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Spent</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {formatCurrency(totalSpent)}
          </div>
        </div>
        
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Categories</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {summary.length}
          </div>
        </div>
        
        {overBudgetCategories.length > 0 && (
          <div style={{
            background: '#f8d7da',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #dc3545',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '12px', color: '#721c24' }}>⚠️ Over Budget</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#721c24' }}>
              {overBudgetCategories.length}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#f8f9fa',
          borderRadius: '4px',
          color: '#666'
        }}>
          <p style={{ fontSize: '18px' }}>No expenses found for this period</p>
          <p style={{ fontSize: '14px' }}>Add some expenses to see the summary</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '15px'
        }}>
          {summary.map((item, index) => (
            <SummaryCard key={index} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SummaryView;