import React, { useState } from 'react';
import { useBooks } from '../../store/book.context';
import Button from '../common/Button';
import Input from '../common/Input';
import TextArea from '../common/TextArea';
import Loader from '../common/Loader';
import { X, BookOpen, Sparkles } from 'lucide-react';
import './CreateBookModal.css';

const CreateBookModal = ({ onClose, onSuccess }) => {
  const { createBook, loading } = useBooks();
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    year_published: new Date().getFullYear(),
    content: '',
  });
  const [errors, setErrors] = useState({});
  const [showAIInfo, setShowAIInfo] = useState(true);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, i) => currentYear - i
  );

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }
    
    if (!formData.genre.trim()) {
      newErrors.genre = 'Genre is required';
    }
    
    if (!formData.year_published) {
      newErrors.year_published = 'Year is required';
    } else if (formData.year_published > currentYear) {
      newErrors.year_published = 'Year cannot be in the future';
    } else if (formData.year_published < 1900) {
      newErrors.year_published = 'Year must be after 1900';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Book content is required';
    } else if (formData.content.length < 50) {
      newErrors.content = 'Content should be at least 50 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await createBook(formData);
      onSuccess();
    } catch (error) {
      console.error('Create book error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="create-book-modal">
        <div className="modal-header">
          <div className="header-left">
            <BookOpen size={24} />
            <h2>Create New Book</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        {showAIInfo && (
          <div className="ai-info-banner">
            <div className="ai-info-content">
              <Sparkles size={18} />
              <div>
                <strong>AI Summary Generation</strong>
                <p>After creating the book, our AI (LLaMA 3 via OpenRouter) will automatically generate a professional summary. This may take a few seconds.</p>
              </div>
            </div>
            <button 
              className="close-info-btn"
              onClick={() => setShowAIInfo(false)}
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="book-form">
          <div className="form-grid">
            <div className="form-group">
              <Input
                label="Book Title *"
                name="title"
                value={formData.title}
                onChange={handleChange}
                error={errors.title}
                placeholder="Enter book title"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <Input
                label="Author *"
                name="author"
                value={formData.author}
                onChange={handleChange}
                error={errors.author}
                placeholder="Enter author name"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <Input
                label="Genre *"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                error={errors.genre}
                placeholder="e.g., Fiction, Science, History"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label className="input-label">
                Year Published *
                <select
                  name="year_published"
                  value={formData.year_published}
                  onChange={handleChange}
                  className={`input-field ${errors.year_published ? 'error' : ''}`}
                  disabled={loading}
                >
                  <option value="">Select Year</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              {errors.year_published && (
                <span className="error-text">{errors.year_published}</span>
              )}
            </div>
          </div>
          
          <div className="form-group">
            <TextArea
              label="Book Content *"
              name="content"
              value={formData.content}
              onChange={handleChange}
              error={errors.content}
              placeholder="Enter the book content, summary, or description..."
              rows={6}
              required
              disabled={loading}
              helperText="Minimum 50 characters. This content will be used by AI to generate the summary."
            />
          </div>
          
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
            >
              {loading ? (
                <>
                  <Loader size="small" />
                  <span>Creating with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Create Book with AI Summary</span>
                </>
              )}
            </Button>
          </div>
          
          <div className="form-note">
            <p>
              <Sparkles size={14} />
              <strong>Note:</strong> After submission, please wait while our AI generates a professional summary. This process is automatic and may take 5-10 seconds.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBookModal;