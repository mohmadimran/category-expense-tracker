import CategoryForm from './CategoryForm';
import CategoryList from './CategoryList';
import LoadingSpinner from './LoadingSpinner';
import type { ApiActionResult, Category, CategoryInput } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  loading: boolean;
  error: string | null;
  onAddCategory: (data: CategoryInput) => Promise<ApiActionResult>;
  onDeleteCategory: (id: string) => Promise<ApiActionResult>;
}

const CategoryManager = ({ 
  categories, 
  loading, 
  error, 
  onAddCategory, 
  onDeleteCategory 
}: CategoryManagerProps) => {
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(
      `Delete category "${name}"?\n\nAll expenses in this category will also be deleted.`
    )) {
      await onDeleteCategory(id);
    }
  };

  if (loading && categories.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <CategoryForm onAddCategory={onAddCategory} />
      
      {error && (
        <div style={{
          padding: '10px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          Error: {error}
        </div>
      )}
      
      <CategoryList 
        categories={categories} 
        onDelete={handleDelete} 
      />
    </div>
  );
};

export default CategoryManager;
