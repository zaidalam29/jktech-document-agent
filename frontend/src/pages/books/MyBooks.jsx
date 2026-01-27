// MyBooks.jsx में
import React, { useEffect, useState } from 'react';
import { useBooks } from '../../store/book.context';
import { useAuth } from '../../store/auth.context';
import BookFilters from '../../components/books/BookFilters';
import BookGrid from '../../components/books/BookGrid';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import ROUTES from '../../config/routes';
import './Books.css';

const MyBooks = () => {
  const { myBooks, loading, fetchMyBooks } = useBooks();
  const { user } = useAuth();
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    if (user) {
      fetchMyBooks();
    }
  }, [user, fetchMyBooks]);

  useEffect(() => {
    if (myBooks.length === 0) return;

    let result = [...myBooks];
    
    // Apply filters (same logic as above)
    // ... filter logic here ...

    setFilteredBooks(result);
  }, [myBooks, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="my-books-page">
      <div className="page-header">
        <div>
          <h1>My Books</h1>
          <p>Manage your personal book collection</p>
        </div>
        
        <Link to={ROUTES.PRIVATE.BOOKS.CREATE}>
          <Button variant="primary">
            <Plus size={16} />
            <span>Add New Book</span>
          </Button>
        </Link>
      </div>

      <BookFilters 
        onFilterChange={handleFilterChange}
        initialFilters={{ sortBy: 'newest' }}
      />
      
      <BookGrid 
        books={filteredBooks}
        loading={loading}
        showActions={true}
        emptyMessage={
          <div className="empty-state">
            <h3>No books yet</h3>
            <p>Start by adding your first book!</p>
            <Link to={ROUTES.PRIVATE.BOOKS.CREATE}>
              <Button variant="primary">
                <Plus size={16} />
                <span>Create Your First Book</span>
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
};

export default MyBooks;