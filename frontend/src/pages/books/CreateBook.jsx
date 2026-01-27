// src/pages/books/CreateBook.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBooks } from '../../store/book.context';
import { useApp } from '../../store/app.context';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { 
  ArrowLeft, 
  Save, 
  BookOpen,
  User,
  Calendar,
  Tag,
  FileText,
  AlertCircle
} from 'lucide-react';
import ROUTES from '../../config/routes';
import './CreateBook.css';

const CreateBook = () => {
  const navigate = useNavigate();
  const { createBook } = useBooks();
  const { addNotification } = useApp();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    year_published: '',
    content: ''
  });

  // Genres options
  const genres = [
    'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery',
    'Romance', 'Biography', 'History', 'Science', 'Technology',
    'Philosophy', 'Poetry', 'Drama', 'Comedy', 'Horror', 'Adventure',
    'Thriller', 'Self-Help', 'Business', 'Art', 'Cookbook', 'Travel',
    'Religion', 'Health', 'Education', 'Children', 'Young Adult'
  ];

  const currentYear = new Date().getFullYear();

  const handleChange = (e) => {
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
      errors.push('Please select a genre');
    }
    
    if (formData.year_published) {
      const year = parseInt(formData.year_published);
      if (year < 1000 || year > currentYear) {
        errors.push(`Year must be between 1000 and ${currentYear}`);
      }
    }
    
    if (!formData.content.trim()) {
      errors.push('Book content is required');
    } else if (formData.content.trim().length < 50) {
      errors.push('Book content should be at least 50 characters');
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

    setLoading(true);
    
    try {
      // Show loading message with AI info
      addNotification({
        type: 'info',
        message: 'Creating book and generating AI summary... Please wait'
      });

      // Prepare data
      const bookData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        genre: formData.genre,
        year_published: formData.year_published ? parseInt(formData.year_published) : null,
        content: formData.content.trim()
      };

      // Create book
      const response = await createBook(bookData);
      
      // Show success message with AI summary info
      addNotification({
        type: 'success',
        message: 'Book created successfully! AI is generating summary. You can view it on details page.'
      });

      // Navigate to book details page
      if (response && response.id) {
        navigate(`${ROUTES.PRIVATE.BOOKS.DETAILS.replace(':id', response.id)}`);
      } else {
        navigate(ROUTES.PRIVATE.BOOKS.LIST);
      }
      
    } catch (error) {
      console.error('Failed to create book:', error);
      addNotification({
        type: 'error',
        message: error.message || 'Failed to create book. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-book-page">
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <Link to={ROUTES.PRIVATE.BOOKS.LIST} className="back-link">
            <ArrowLeft size={18} />
            <span>Back to Books</span>
          </Link>
          
          <div className="header-content">
            <BookOpen size={32} />
            <div>
              <h1>Create New Book</h1>
              
            </div>
          </div>
        </div>
        
        {/* AI Info Banner */}
        <div className="ai-info-banner">
          <div className="banner-content">
            <AlertCircle size={20} />
            <div>
              <h3>AI Summary Generation</h3>
              <p>
                After submission, our AI will automatically generate a summary for your book. 
                You can view and regenerate it on the book details page.
              </p>
            </div>
          </div>
        </div>
        
        {/* Form */}
        <div className="create-book-form">
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="form-section">
              <h2>Book Information</h2>
              
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
                    placeholder={`e.g., ${currentYear}`}
                    min="1000"
                    max={currentYear}
                    className="form-input"
                  />
                  <p className="field-info">Optional - Max: {currentYear}</p>
                </div>
              </div>
            </div>
            
            {/* Content Section */}
            <div className="form-section">
              <h2>Book Content</h2>
              
              <div className="form-group">
                <label htmlFor="content">
                  <FileText size={16} />
                  <span>Book Content *</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Enter the book content or excerpt..."
                  rows={12}
                  className="form-textarea"
                  required
                  minLength={50}
                />
                <div className="char-counter">
                  <span className={`char-count ${formData.content.length < 50 ? 'error' : ''}`}>
                    {formData.content.length}
                  </span>
                  <span>/ Minimum 50 characters</span>
                </div>
                <p className="field-info">
                  The content will be used by AI to generate a summary
                </p>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                <ArrowLeft size={16} />
                <span>Cancel</span>
              </Button>
              
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
              >
                <Save size={16} />
                <span>{loading ? 'Creating Book...' : 'Create Book'}</span>
              </Button>
            </div>
            
            {/* AI Processing Info */}
            {loading && (
              <div className="ai-processing-info">
                <div className="processing-content">
                  <Loader size="small" />
                  <div>
                    <h4>AI Processing</h4>
                    <p>
                      Book is being created and AI is generating a summary. 
                      This may take a few moments. You'll be redirected to the book details page.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBook;