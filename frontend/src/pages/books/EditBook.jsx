// src/pages/books/EditBook.jsx
import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBooks } from '../../store/book.context';
import EditBookForm from '../../components/books/EditBookForm';
import Loader from '../../components/common/Loader';
import { ArrowLeft, Edit } from 'lucide-react';
import ROUTES from '../../config/routes';
import './EditBook.css';

const EditBook = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedBook, loading, fetchBookDetails } = useBooks();

  useEffect(() => {
    if (id) {
      fetchBookDetails(id);
    }
  }, [id, fetchBookDetails]);

  const handleSuccess = () => {
    navigate(`${ROUTES.PRIVATE.BOOKS.DETAILS.replace(':id', id)}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader size="large" text="Loading book..." />
      </div>
    );
  }

  if (!selectedBook) {
    return (
      <div className="not-found-container">
        <h2>Book not found</h2>
        <Link to={ROUTES.PRIVATE.BOOKS.MY_BOOKS}>
          Back to My Books
        </Link>
      </div>
    );
  }

  return (
    <div className="edit-book-page">
      <div className="page-container">
        <div className="page-header">
          <Link to={`${ROUTES.PRIVATE.BOOKS.DETAILS.replace(':id', id)}`} className="back-link">
            <ArrowLeft size={18} />
            <span>Back to Book Details</span>
          </Link>
          
          <div className="header-content">
            <Edit size={32} />
            <div>
              <h1>Edit Book</h1>
              <p>Update your book information</p>
            </div>
          </div>
        </div>
        
        <div className="page-content">
          <EditBookForm 
            book={selectedBook}
            onSuccess={handleSuccess}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  );
};

export default EditBook;