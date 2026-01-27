// src/components/books/BookGrid.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ useNavigate import करें
import BookCard from '../../pages/books/BookCard';
import Loader from '../common/Loader';
import Button from '../common/Button';
import './BookGrid.css';
import { 
  Grid, 
  List, 
  Filter, 
  Search,
  ChevronLeft,
  ChevronRight,
  Plus, // ✅ Plus icon import करें
  BookOpen
} from 'lucide-react';

const BookGrid = ({ 
  books, 
  loading, 
  showActions = false,
  emptyMessage = "No books found.",
  itemsPerPage = 12
}) => {
  const navigate = useNavigate(); // ✅ useNavigate hook
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState([]);

  // Filter books based on search and genres
  const filteredBooks = books.filter(book => {
    const matchesSearch = searchQuery === '' || 
      book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.genre?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = selectedGenres.length === 0 || 
      selectedGenres.includes(book.genre);
    
    return matchesSearch && matchesGenre;
  });

  // Get unique genres
  const genres = [...new Set(books.map(book => book.genre).filter(Boolean))];

  // Pagination
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBooks = filteredBooks.slice(startIndex, startIndex + itemsPerPage);

  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ Navigate to create book page
  const handleCreateBook = () => {
    navigate('/books/create');
  };

  if (loading) {
    return (
      <div className="book-grid-loading">
        <Loader size="large" text="Loading books..." />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="book-grid-empty">
        <div className="empty-state">
          <BookOpen size={64} className="empty-icon" />
          <h3>{emptyMessage}</h3>
          <p>Start by adding your first book to the library.</p>
          
          {/* ✅ Create Book Button in Empty State */}
          <Button
            variant="primary"
            onClick={handleCreateBook}
            className="create-book-btn"
          >
            <Plus size={18} />
            <span>Create Your First Book</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="book-grid-container">
      {/* ✅ Header with Create Button */}
      <div className="book-grid-header">
        <div className="header-left">
          <h2>Book Library</h2>
          <p>Showing {books.length} books in your collection</p>
        </div>
        
        <div className="header-right">
          <Button
            variant="primary"
            onClick={handleCreateBook}
            className="create-book-btn"
          >
            <Plus size={18} />
            <span>Create New Book</span>
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="book-grid-controls">
        {/* Search */}
        <div className="search-container">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search books..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          
          <div className="result-count">
            Showing {paginatedBooks.length} of {filteredBooks.length} books
          </div>
        </div>

        {/* View Toggle */}
        <div className="view-controls">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Genre Filters */}
      {genres.length > 0 && (
        <div className="genre-filters">
          <div className="filter-header">
            <Filter size={16} />
            <span>Filter by Genre:</span>
          </div>
          <div className="genre-tags">
            {genres.map(genre => (
              <button
                key={genre}
                className={`genre-tag ${selectedGenres.includes(genre) ? 'active' : ''}`}
                onClick={() => handleGenreToggle(genre)}
              >
                {genre}
                {selectedGenres.includes(genre) && ' ✕'}
              </button>
            ))}
            {selectedGenres.length > 0 && (
              <button
                className="genre-tag clear-all"
                onClick={() => setSelectedGenres([])}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Books Grid/List */}
      <div className={`book-grid ${viewMode}`}>
        {paginatedBooks.map(book => (
          <BookCard
            key={book.id}
            book={book}
            viewMode={viewMode}
            showActions={showActions}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <Button
            variant="outline"
            size="small"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          
          <div className="page-numbers">
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              // Show first, last, and pages around current
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    className={`page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return <span key={page} className="page-dots">...</span>;
              }
              return null;
            })}
          </div>
          
          <Button
            variant="outline"
            size="small"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookGrid;