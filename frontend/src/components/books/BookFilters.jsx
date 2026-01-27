// src/components/books/BookFilters.jsx
import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  Calendar, 
  SortAsc, 
  SortDesc,
  X,
  Star,
  Clock
} from 'lucide-react';
import './BookFilters.css';

const BookFilters = ({ 
  onFilterChange,
  initialFilters = {}
}) => {
  const [filters, setFilters] = useState({
    search: '',
    genre: '',
    yearFrom: '',
    yearTo: '',
    sortBy: 'newest',
    sortOrder: 'desc',
    hasReviews: false,
    hasSummary: false,
    ...initialFilters
  });

  // Available genres (you can fetch these from API)
  const genres = [
    'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy',
    'Mystery', 'Romance', 'Biography', 'History',
    'Science', 'Technology', 'Philosophy', 'Poetry',
    'Drama', 'Comedy', 'Horror', 'Adventure'
  ];

  // Sort options
  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: <Clock size={14} /> },
    { value: 'oldest', label: 'Oldest First', icon: <Clock size={14} /> },
    { value: 'title_asc', label: 'Title A-Z', icon: <SortAsc size={14} /> },
    { value: 'title_desc', label: 'Title Z-A', icon: <SortDesc size={14} /> },
    { value: 'year_asc', label: 'Year (Old to New)', icon: <Calendar size={14} /> },
    { value: 'year_desc', label: 'Year (New to Old)', icon: <Calendar size={14} /> },
    { value: 'rating', label: 'Highest Rated', icon: <Star size={14} /> }
  ];

  // Current year for year filter
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, i) => currentYear - i
  );

  // Handle filter changes
  const handleChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Handle search input with debounce
  const [searchTimeout, setSearchTimeout] = useState(null);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);

    // Debounce search to avoid too many API calls
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      onFilterChange(newFilters);
    }, 500);
    setSearchTimeout(timeout);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters = {
      search: '',
      genre: '',
      yearFrom: '',
      yearTo: '',
      sortBy: 'newest',
      sortOrder: 'desc',
      hasReviews: false,
      hasSummary: false
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy' && value === 'newest') return false;
    if (key === 'sortOrder' && value === 'desc') return false;
    return value !== '' && value !== false;
  }).length;

  // Effect for cleanup
  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  return (
    <div className="book-filters">
      <div className="filters-header">
        <div className="header-left">
          <Filter size={20} />
          <h3>Filters</h3>
          {activeFilterCount > 0 && (
            <span className="active-count">
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        {activeFilterCount > 0 && (
          <button 
            className="clear-all-btn"
            onClick={clearAllFilters}
          >
            <X size={16} />
            Clear All
          </button>
        )}
      </div>

      {/* Search Filter */}
      <div className="filter-section">
        <label className="filter-label">Search</label>
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search by title, author, or content..."
            value={filters.search}
            onChange={handleSearchChange}
            className="search-input"
          />
          {filters.search && (
            <button
              className="clear-search"
              onClick={() => handleChange('search', '')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Genre Filter */}
      <div className="filter-section">
        <label className="filter-label">Genre</label>
        <div className="genre-filter">
          <select
            value={filters.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
            className="genre-select"
          >
            <option value="">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Year Range Filter */}
      <div className="filter-section">
        <label className="filter-label">Year Published</label>
        <div className="year-range">
          <div className="year-input-group">
            <Calendar size={16} />
            <select
              value={filters.yearFrom}
              onChange={(e) => handleChange('yearFrom', e.target.value)}
              className="year-select"
            >
              <option value="">From Year</option>
              {years.map(year => (
                <option key={`from-${year}`} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <span className="year-separator">to</span>
          
          <div className="year-input-group">
            <Calendar size={16} />
            <select
              value={filters.yearTo}
              onChange={(e) => handleChange('yearTo', e.target.value)}
              className="year-select"
            >
              <option value="">To Year</option>
              {years.map(year => (
                <option key={`to-${year}`} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sort Filter */}
      <div className="filter-section">
        <label className="filter-label">Sort By</label>
        <div className="sort-filter">
          <select
            value={filters.sortBy}
            onChange={(e) => handleChange('sortBy', e.target.value)}
            className="sort-select"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="sort-order">
            <button
              className={`order-btn ${filters.sortOrder === 'asc' ? 'active' : ''}`}
              onClick={() => handleChange('sortOrder', 'asc')}
              title="Ascending"
            >
              <SortAsc size={16} />
            </button>
            <button
              className={`order-btn ${filters.sortOrder === 'desc' ? 'active' : ''}`}
              onClick={() => handleChange('sortOrder', 'desc')}
              title="Descending"
            >
              <SortDesc size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Additional Filters */}
      <div className="filter-section">
        <label className="filter-label">Additional Filters</label>
        <div className="additional-filters">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.hasReviews}
              onChange={(e) => handleChange('hasReviews', e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-custom"></span>
            <span className="checkbox-text">
              <Star size={14} />
              Has Reviews
            </span>
          </label>
          
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.hasSummary}
              onChange={(e) => handleChange('hasSummary', e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-custom"></span>
            <span className="checkbox-text">
              Has AI Summary
            </span>
          </label>
        </div>
      </div>

      {/* Active Filters Tags */}
      {activeFilterCount > 0 && (
        <div className="active-filters">
          <div className="active-filters-header">
            <span>Active Filters:</span>
          </div>
          <div className="filter-tags">
            {filters.search && (
              <span className="filter-tag">
                Search: "{filters.search}"
                <button onClick={() => handleChange('search', '')}>
                  <X size={12} />
                </button>
              </span>
            )}
            
            {filters.genre && (
              <span className="filter-tag">
                Genre: {filters.genre}
                <button onClick={() => handleChange('genre', '')}>
                  <X size={12} />
                </button>
              </span>
            )}
            
            {filters.yearFrom && (
              <span className="filter-tag">
                From: {filters.yearFrom}
                <button onClick={() => handleChange('yearFrom', '')}>
                  <X size={12} />
                </button>
              </span>
            )}
            
            {filters.yearTo && (
              <span className="filter-tag">
                To: {filters.yearTo}
                <button onClick={() => handleChange('yearTo', '')}>
                  <X size={12} />
                </button>
              </span>
            )}
            
            {filters.sortBy !== 'newest' && (
              <span className="filter-tag">
                Sort: {sortOptions.find(o => o.value === filters.sortBy)?.label}
                <button onClick={() => handleChange('sortBy', 'newest')}>
                  <X size={12} />
                </button>
              </span>
            )}
            
            {filters.hasReviews && (
              <span className="filter-tag">
                Has Reviews
                <button onClick={() => handleChange('hasReviews', false)}>
                  <X size={12} />
                </button>
              </span>
            )}
            
            {filters.hasSummary && (
              <span className="filter-tag">
                Has AI Summary
                <button onClick={() => handleChange('hasSummary', false)}>
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookFilters;