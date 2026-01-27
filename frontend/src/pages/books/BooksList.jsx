// BooksList.jsx में
import React, { useState, useEffect } from 'react';
import { useBooks } from '../../store/book.context';
import BookFilters from '../../components/books/BookFilters';
import BookGrid from '../../components/books/BookGrid';
import Loader from '../../components/common/Loader';
import './Books.css';

const BooksList = () => {
  const { allBooks, loading, fetchAllBooks } = useBooks();
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [filters, setFilters] = useState({});

  // Initial load
  useEffect(() => {
    fetchAllBooks();
  }, [fetchAllBooks]);

  // Apply filters when books or filters change
  useEffect(() => {
    if (allBooks.length === 0) return;

    let result = [...allBooks];

    // Apply search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(book =>
        book.title?.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query) ||
        book.genre?.toLowerCase().includes(query) ||
        book.content?.toLowerCase().includes(query)
      );
    }

    // Apply genre filter
    if (filters.genre) {
      result = result.filter(book => book.genre === filters.genre);
    }

    // Apply year range filter
    if (filters.yearFrom) {
      result = result.filter(book => book.year_published >= parseInt(filters.yearFrom));
    }
    if (filters.yearTo) {
      result = result.filter(book => book.year_published <= parseInt(filters.yearTo));
    }

    // Apply additional filters
    if (filters.hasReviews) {
      result = result.filter(book => book.total_reviews > 0);
    }
    if (filters.hasSummary) {
      result = result.filter(book => book.summary && book.summary.length > 0);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => b.id - a.id);
        break;
      case 'oldest':
        result.sort((a, b) => a.id - b.id);
        break;
      case 'title_asc':
        result.sort((a, b) => a.title?.localeCompare(b.title));
        break;
      case 'title_desc':
        result.sort((a, b) => b.title?.localeCompare(a.title));
        break;
      case 'year_asc':
        result.sort((a, b) => a.year_published - b.year_published);
        break;
      case 'year_desc':
        result.sort((a, b) => b.year_published - a.year_published);
        break;
      case 'rating':
        result.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        break;
      default:
        break;
    }

    // Apply sort order
    if (filters.sortOrder === 'asc' && !['title_asc', 'year_asc'].includes(filters.sortBy)) {
      result.reverse();
    }

    setFilteredBooks(result);
  }, [allBooks, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="books-list-page">
      <div className="page-header">
        <h1>Book Library</h1>
        <p>Explore books from our community</p>
      </div>

      <BookFilters onFilterChange={handleFilterChange} />
      
      <BookGrid 
        books={filteredBooks}
        loading={loading}
        showActions={false}
        emptyMessage="No books match your filters. Try adjusting your criteria."
      />
    </div>
  );
};

export default BooksList;