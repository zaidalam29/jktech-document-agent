// src/pages/books/Books.jsx
import React, { useState, useEffect } from 'react';
import { useBooks } from '../../store/book.context';
import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import BookDetailsModal from '../../components/books/BookDetailsModal';
import CreateBookModal from '../../components/books/CreateBookModal';
import { 
  BookOpen, 
  Plus, 
  RefreshCw, 
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  Printer,
  Star,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import './Books.css';

const Books = () => {
  const { user } = useAuth();
  const { addNotification } = useApp();
  const { 
    allBooks, 
    myBooks, 
    loading, 
    fetchAllBooks, 
    fetchMyBooks,
    deleteBook,
    regenerateSummary
  } = useBooks();
  
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      await Promise.all([
        fetchAllBooks(),
        user && fetchMyBooks()
      ]);
    } catch (error) {
      console.error('Failed to load books:', error);
      addNotification({
        type: 'error',
        message: 'Failed to load books'
      });
    }
  };

  // Handle book actions
  const handleDeleteBook = async (bookId, bookTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${bookTitle}"?`)) return;
    
    try {
      await deleteBook(bookId);
      addNotification({
        type: 'success',
        message: 'Book deleted successfully'
      });
    } catch (error) {
      console.error('Delete failed:', error);
      addNotification({
        type: 'error',
        message: 'Failed to delete book'
      });
    }
  };

  const handleRegenerateSummary = async (bookId, bookTitle) => {
    try {
      await regenerateSummary(bookId);
      addNotification({
        type: 'success',
        message: `Summary regenerated for "${bookTitle}"`
      });
    } catch (error) {
      console.error('Regenerate failed:', error);
      addNotification({
        type: 'error',
        message: 'Failed to regenerate summary'
      });
    }
  };

  const handleRefresh = () => {
    loadBooks();
    addNotification({
      type: 'info',
      message: 'Refreshing books...'
    });
  };

  // Get books based on active tab
  const getBooks = () => {
    return activeTab === 'my' ? myBooks : allBooks;
  };

  // Get unique genres for filter dropdown
  const getUniqueGenres = () => {
    const books = getBooks();
    const genres = books
      .map(book => book.genre)
      .filter((genre, index, self) => 
        genre && self.indexOf(genre) === index
      )
      .sort();
    return ['all', ...genres];
  };

  // Get unique years for filter dropdown
  const getUniqueYears = () => {
    const books = getBooks();
    const years = books
      .map(book => book.year_published)
      .filter((year, index, self) => 
        year && self.indexOf(year) === index
      )
      .sort((a, b) => b - a);
    return years;
  };

  // Filter books based on all criteria
  const getFilteredBooks = () => {
    let books = [...getBooks()];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      books = books.filter(book => 
        (book.title && book.title.toLowerCase().includes(query)) ||
        (book.author && book.author.toLowerCase().includes(query)) ||
        (book.genre && book.genre.toLowerCase().includes(query)) ||
        (book.content && book.content.toLowerCase().includes(query))
      );
    }
    
    // Apply genre filter
    if (filterGenre !== 'all') {
      books = books.filter(book => book.genre === filterGenre);
    }
    
    // Apply year filters
    if (filterYearFrom) {
      books = books.filter(book => book.year_published >= parseInt(filterYearFrom));
    }
    if (filterYearTo) {
      books = books.filter(book => book.year_published <= parseInt(filterYearTo));
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      books = books.filter(book => book.status === filterStatus);
    }
    
    return books;
  };

  // Sort books
  const getSortedBooks = (books) => {
    return [...books].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];
      
      // Handle null/undefined values
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Handle number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
  };

  // Handle column sort
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Render sort indicator
  const renderSortIndicator = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // Render rating stars
  const renderRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="rating-stars">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <Star key={index} size={14} className="star-filled" fill="currentColor" />;
          } else if (index === fullStars && hasHalfStar) {
            return <Star key={index} size={14} className="star-filled" fill="currentColor" />;
          } else {
            return <Star key={index} size={14} className="star-empty" fill="none" />;
          }
        })}
        <span style={{ marginLeft: '4px', fontSize: '0.85rem' }}>
          {rating?.toFixed(1) || '0.0'}
        </span>
      </div>
    );
  };

  // Pagination
  const filteredBooks = getFilteredBooks();
  const sortedBooks = getSortedBooks(filteredBooks);
  const totalPages = Math.ceil(sortedBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBooks = sortedBooks.slice(startIndex, endIndex);

  const genres = getUniqueGenres();
  const years = getUniqueYears();

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterGenre('all');
    setFilterYearFrom('');
    setFilterYearTo('');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  if (loading && allBooks.length === 0) {
    return (
      <div className="books-loading">
        <Loader size="large" text="Loading books..." />
      </div>
    );
  }

  return (
    <div className="books-container">
      {/* Header */}
      <div className="books-header">
        <div className="header-title">
          <BookOpen size={32} />
          <div>
            <h1>Book Library</h1>
            <p>Manage and explore your book collection</p>
          </div>
        </div>
        
        <div className="header-actions">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </Button>
          
          {user && (
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />
              <span>Add New Book</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="books-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('all');
            setCurrentPage(1);
          }}
        >
          All Books ({allBooks.length})
        </button>
        
        {user && (
          <button
            className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('my');
              setCurrentPage(1);
            }}
          >
            My Books ({myBooks.length})
          </button>
        )}
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-row">
          {/* Search */}
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>

          {/* Genre Filter */}
          <div className="filter-group">
            <label className="filter-label">Genre</label>
            <select
              value={filterGenre}
              onChange={(e) => {
                setFilterGenre(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Genres</option>
              {genres.filter(g => g !== 'all').map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {/* Year From Filter */}
          <div className="filter-group">
            <label className="filter-label">Year From</label>
            <select
              value={filterYearFrom}
              onChange={(e) => {
                setFilterYearFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">Any Year</option>
              {years.map(year => (
                <option key={`from-${year}`} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Year To Filter */}
          <div className="filter-group">
            <label className="filter-label">Year To</label>
            <select
              value={filterYearTo}
              onChange={(e) => {
                setFilterYearTo(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">Any Year</option>
              {years.map(year => (
                <option key={`to-${year}`} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-row" style={{ marginTop: '16px' }}>
          {/* Items per page */}
          <div className="filter-group">
            <label className="filter-label">Items per page</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="filter-buttons">
            <Button
              variant="outline"
              onClick={clearAllFilters}
              disabled={!searchQuery && filterGenre === 'all' && !filterYearFrom && !filterYearTo && filterStatus === 'all'}
            >
              <Filter size={16} />
              <span>Clear Filters</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              <span>Print</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // Export functionality
                const dataStr = JSON.stringify(sortedBooks, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'books-export.json';
                link.click();
              }}
            >
              <Download size={16} />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="books-table-container">
        {filteredBooks.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={64} />
            <h3>No books found</h3>
            <p>
              {searchQuery || filterGenre !== 'all' || filterYearFrom || filterYearTo 
                ? 'No books match your filters. Try adjusting your criteria.' 
                : activeTab === 'my' 
                  ? 'You haven\'t added any books yet.' 
                  : 'No books available in the library.'}
            </p>
            {activeTab === 'my' && user && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />
                <span>Add Your First Book</span>
              </Button>
            )}
          </div>
        ) : (
          <>
            <table className="books-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')}>
                    ID
                    <span className="sort-indicator">
                      {renderSortIndicator('id')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('title')}>
                    Book Details
                    <span className="sort-indicator">
                      {renderSortIndicator('title')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('author')}>
                    <User size={14} />
                    Author
                    <span className="sort-indicator">
                      {renderSortIndicator('author')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('genre')}>
                    Genre
                    <span className="sort-indicator">
                      {renderSortIndicator('genre')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('year_published')}>
                    <Calendar size={14} />
                    Year
                    <span className="sort-indicator">
                      {renderSortIndicator('year_published')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('average_rating')}>
                    <Star size={14} />
                    Rating
                    <span className="sort-indicator">
                      {renderSortIndicator('average_rating')}
                    </span>
                  </th>
                  <th onClick={() => handleSort('page_count')}>
                    <FileText size={14} />
                    Pages
                    <span className="sort-indicator">
                      {renderSortIndicator('page_count')}
                    </span>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBooks.map(book => (
                  <tr key={book.id}>
                    <td>#{book.id}</td>
                    <td>
                      <div className="book-info-cell">
                        <div className="book-cover-small">
                          {book.cover_image ? (
                            <img 
                              src={book.cover_image} 
                              alt={book.title}
                              className="book-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="cover-placeholder">
                              <BookOpen size={20} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="book-title">{book.title}</div>
                          {book.subtitle && (
                            <div className="book-subtitle">{book.subtitle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="book-author">{book.author || 'Unknown'}</div>
                    </td>
                    <td>
                      {book.genre ? (
                        <span className="genre-tag">{book.genre}</span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      {book.year_published || 'N/A'}
                    </td>
                    <td>
                      {renderRatingStars(book.average_rating || 0)}
                    </td>
                    <td>
                      {book.page_count || 'N/A'}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="action-btn view"
                          onClick={() => setSelectedBookId(book.id)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {activeTab === 'my' && user && (
                          <>
                            <button
                              className="action-btn edit"
                              onClick={() => {
                                // Handle edit
                                console.log('Edit book:', book.id);
                              }}
                              title="Edit Book"
                            >
                              <Edit size={16} />
                            </button>
                            
                            <button
                              className="action-btn"
                              onClick={() => handleRegenerateSummary(book.id, book.title)}
                              title="Regenerate Summary"
                            >
                              <RefreshCw size={16} />
                            </button>
                            
                            <button
                              className="action-btn delete"
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              title="Delete Book"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {startIndex + 1} to {Math.min(endIndex, sortedBooks.length)} of {sortedBooks.length} books
                </div>
                <div className="pagination-controls">
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <Loader text="Loading..." />
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateBookModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadBooks();
            addNotification({
              type: 'success',
              message: 'Book created successfully'
            });
          }}
        />
      )}

      {selectedBookId && (
        <BookDetailsModal
          bookId={selectedBookId}
          onClose={() => setSelectedBookId(null)}
          onUpdate={() => {
            setSelectedBookId(null);
            loadBooks();
          }}
        />
      )}
    </div>
  );
};

export default Books;