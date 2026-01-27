// src/components/books/EditBookForm.jsx
import React, { useState } from 'react';
import { useBooks } from '../../store/book.context';
import { useApp } from '../../store/app.context';
import Button from '../common/Button';
import { 
  Save, 
  X, 
  Upload, 
  BookOpen, 
  User, 
  Calendar,
  FileText,
  Tag
} from 'lucide-react';
import './EditBookForm.css';

const EditBookForm = ({ book, onSuccess, onCancel }) => {
  const { updateBook } = useBooks();
  const { addNotification } = useApp();
  const [loading, setLoading] = useState(false);
  
  // Only include fields that API accepts
  const [formData, setFormData] = useState({
    title: book.title || '',
    author: book.author || '',
    genre: book.genre || '',
    year_published: book.year_published || '',
    content: book.content || '',
    summary: book.summary || ''
  });

  // Genres options
  const genres = [
    'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery',
    'Romance', 'Biography', 'History', 'Science', 'Technology',
    'Philosophy', 'Poetry', 'Drama', 'Comedy', 'Horror', 'Adventure',
    'Thriller', 'Self-Help', 'Business', 'Art', 'Cookbook', 'Travel',
    'Religion', 'Health', 'Education', 'Children', 'Young Adult'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTextareaChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = [];
    
    if (!formData.title.trim()) {
      errors.push('Book title is required');
    }
    
    if (!formData.author.trim()) {
      errors.push('Author name is required');
    }
    
    if (!formData.genre) {
      errors.push('Genre is required');
    }
    
    if (formData.year_published) {
      const year = parseInt(formData.year_published);
      const currentYear = new Date().getFullYear();
      if (year < 1000 || year > currentYear) {
        errors.push(`Year must be between 1000 and ${currentYear}`);
      }
    }
    
    if (errors.length > 0) {
      errors.forEach(error => {
        addNotification({
          type: 'error',
          message: error
        });
      });
      return;
    }

    // Prepare data for API
    const submitData = {
      title: formData.title.trim(),
      author: formData.author.trim(),
      genre: formData.genre,
      year_published: formData.year_published ? parseInt(formData.year_published) : null,
      content: formData.content.trim(),
      summary: formData.summary.trim()
    };

    setLoading(true);
    try {
      await updateBook(book.id, submitData);
      addNotification({
        type: 'success',
        message: 'Book updated successfully!'
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update book:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update book. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-book-form">
      <form onSubmit={handleSubmit}>
        {/* Basic Information Section */}
        <div className="form-section">
          <h2>
            <BookOpen size={20} />
            <span>Book Details</span>
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">
                <BookOpen size={16} />
                <span>Book Title *</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter book title"
                required
                className="form-input"
                maxLength={200}
              />
              <p className="field-info">Required field</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="author">
                <User size={16} />
                <span>Author *</span>
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleChange}
                placeholder="Enter author name"
                required
                className="form-input"
                maxLength={100}
              />
              <p className="field-info">Required field</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="genre">
                <Tag size={16} />
                <span>Genre *</span>
              </label>
              <select
                id="genre"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="">Select a genre</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
              <p className="field-info">Required field</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="year_published">
                <Calendar size={16} />
                <span>Year Published</span>
              </label>
              <input
                type="number"
                id="year_published"
                name="year_published"
                value={formData.year_published}
                onChange={handleChange}
                placeholder="e.g., 2024"
                min="1000"
                max={new Date().getFullYear()}
                className="form-input"
              />
              <p className="field-info">Optional</p>
            </div>
          </div>
        </div>
        
        {/* Summary Section */}
        <div className="form-section">
          <h2>Book Summary</h2>
          
          <div className="form-group">
            <label htmlFor="summary">
              Summary *
            </label>
            <textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleTextareaChange}
              placeholder="Write a brief summary of the book..."
              rows={6}
              className="form-textarea"
              required
              maxLength={2000}
            />
            <div className="char-counter">
              <span className="char-count">{formData.summary.length}</span>
              <span>/ 2000 characters</span>
            </div>
            <p className="field-info">Brief description of the book</p>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="form-section">
          <h2>Book Content</h2>
          
          <div className="form-group">
            <label htmlFor="content">
              <FileText size={16} />
              <span>Content *</span>
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleTextareaChange}
              placeholder="Enter the book content..."
              rows={10}
              className="form-textarea"
              required
              maxLength={10000}
            />
            <div className="char-counter">
              <span className="char-count">{formData.content.length}</span>
              <span>/ 10000 characters</span>
            </div>
            <p className="field-info">Main content of the book</p>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            <X size={16} />
            <span>Cancel</span>
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            <Save size={16} />
            <span>Update Book</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditBookForm;