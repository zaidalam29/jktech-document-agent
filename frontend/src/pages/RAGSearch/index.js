import { useState } from "react";
import api from "../../api/axios";
import Swal from "sweetalert2";

export default function RAGSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      Swal.fire({
        icon: "info",
        title: "Enter a Query",
        text: "Please enter a search query to continue.",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setSearchResponse(null);

    try {
      const response = await api.post(
        `/search?query=${encodeURIComponent(query)}&limit=5`
      );

      setSearchResponse(response.data);
      setResults(response.data.results || []);
    } catch (error) {
      console.error("RAG Search failed:", error);
      Swal.fire({
        icon: "error",
        title: "Search Failed",
        text:
          error.response?.data?.detail ||
          error.message ||
          "Something went wrong during search.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile-specific CSS */}
      <style>
        {`
          /* Desktop View */
          @media (min-width: 992px) {
            .desktop-card {
              border-radius: 12px;
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
              padding: 32px;
              margin: 24px auto;
              max-width: 1000px;
            }
            
            .desktop-title {
              font-size: 2rem;
              color: #2c3e50;
              margin-bottom: 8px;
            }
            
            .desktop-subtitle {
              font-size: 1.1rem;
              margin-bottom: 24px;
            }
            
            .desktop-search-input {
              font-size: 1.1rem;
              padding: 12px 16px;
              border-radius: 8px 0 0 8px;
            }
            
            .desktop-search-btn {
              padding: 12px 32px;
              font-size: 1.1rem;
              border-radius: 0 8px 8px 0;
            }
            
            .desktop-result-card {
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 16px;
              border-left: 4px solid #4dabf7;
            }
            
            .desktop-result-title {
              font-size: 1.25rem;
              margin-bottom: 8px;
            }
            
            .desktop-result-content {
              font-size: 1rem;
              line-height: 1.6;
            }
          }
          
          /* Mobile View - Compact */
          @media (max-width: 991.98px) {
            /* Compact container */
            .mobile-container {
              padding: 12px !important;
              padding-top: 70px !important;
            }
            
            /* Compact card */
            .mobile-card {
              padding: 16px !important;
              margin: 0 !important;
              border-radius: 8px !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
              border: 1px solid #e9ecef !important;
            }
            
            /* Compact header */
            .mobile-header h2 {
              font-size: 1.2rem !important;
              margin-bottom: 6px !important;
              text-align: left !important;
            }
            
            .mobile-subtitle {
              font-size: 0.85rem !important;
              margin-bottom: 20px !important;
              color: #6c757d !important;
            }
            
            /* COMPACT Search Form */
            .mobile-search-form .input-group {
              flex-direction: column !important;
              gap: 10px !important;
            }
            
            .mobile-search-input {
              font-size: 0.9rem !important;
              padding: 10px 14px !important;
              border-radius: 6px !important;
              width: 100% !important;
            }
            
            .mobile-search-btn {
              width: 100% !important;
              padding: 10px !important;
              font-size: 0.9rem !important;
              border-radius: 6px !important;
            }
            
            /* Search Info */
            .mobile-search-info {
              background: #f8f9fa !important;
              border-radius: 6px !important;
              padding: 10px !important;
              margin: 16px 0 !important;
              font-size: 0.85rem !important;
            }
            
            /* COMPACT Results */
            .mobile-result-card {
              padding: 12px !important;
              margin-bottom: 10px !important;
              border-radius: 6px !important;
              border: 1px solid #e9ecef !important;
              border-left: 3px solid #4dabf7 !important;
            }
            
            .mobile-result-header {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 8px !important;
              margin-bottom: 10px !important;
            }
            
            .mobile-result-title {
              font-size: 0.9rem !important;
              font-weight: 600 !important;
              margin: 0 !important;
              line-height: 1.3 !important;
            }
            
            .mobile-result-badge {
              font-size: 0.7rem !important;
              padding: 3px 8px !important;
              border-radius: 10px !important;
              align-self: flex-start !important;
            }
            
            .mobile-result-meta {
              font-size: 0.75rem !important;
              margin-bottom: 8px !important;
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 6px !important;
            }
            
            .mobile-result-meta strong {
              font-size: 0.75rem !important;
            }
            
            .mobile-result-content {
              font-size: 0.8rem !important;
              line-height: 1.4 !important;
              color: #495057 !important;
              display: -webkit-box !important;
              -webkit-line-clamp: 3 !important;
              -webkit-box-orient: vertical !important;
              overflow: hidden !important;
            }
            
            /* Loading state */
            .mobile-loading {
              padding: 20px !important;
            }
            
            .mobile-loading .spinner-border {
              width: 2rem !important;
              height: 2rem !important;
            }
            
            .mobile-loading p {
              font-size: 0.9rem !important;
              margin-top: 10px !important;
            }
            
            /* No results */
            .mobile-no-results {
              padding: 16px !important;
              font-size: 0.85rem !important;
              border-radius: 6px !important;
            }
            
            /* Adjust for very small screens */
            @media (max-width: 576px) {
              .mobile-container {
                padding: 8px !important;
              }
              
              .mobile-card {
                padding: 12px !important;
              }
              
              .mobile-search-input {
                font-size: 0.85rem !important;
                padding: 8px 12px !important;
              }
              
              .mobile-search-btn {
                font-size: 0.85rem !important;
                padding: 8px !important;
              }
              
              .mobile-result-content {
                -webkit-line-clamp: 2 !important;
              }
            }
            
            /* Adjust meta info on small screens */
            @media (max-width: 400px) {
              .mobile-result-meta {
                flex-direction: column !important;
                gap: 2px !important;
              }
            }
          }
        `}
      </style>

      <div className="container-fluid mobile-container">
        {/* Desktop View */}
        <div className="card desktop-card d-none d-lg-block">
          <h2 className="desktop-title text-center">RAG Search</h2>
          <p className="text-center text-muted desktop-subtitle">
            Search through your book collection using semantic search
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="input-group">
              <input
                type="text"
                className="form-control desktop-search-input"
                placeholder="Enter your search query (e.g., genre, author, title)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn btn-primary desktop-search-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    ></span>
                    Searching...
                  </>
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </form>

          {/* Search Info */}
          {searchResponse && (
            <div className="mb-4 p-3 bg-light rounded">
              <p className="mb-1">
                <strong>Query:</strong> "{searchResponse.query}"
              </p>
              <p className="mb-0">
                <strong>Results found:</strong> {results.length}
              </p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 ? (
            <div>
              {results.map((result, idx) => (
                <div
                  key={result.book_id || idx}
                  className="card desktop-result-card"
                >
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="desktop-result-title mb-0">
                      {result.metadata.title}
                    </h5>
                    <span className="badge bg-info px-3 py-2">
                      Similarity: {(result.similarity_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mb-3">
                    <p className="mb-1">
                      <strong>Author:</strong> {result.metadata.author} |{" "}
                      <strong>Genre:</strong> {result.metadata.genre} |{" "}
                      <strong>Book ID:</strong> {result.metadata.book_id}
                    </p>
                  </div>
                  <p className="text-muted desktop-result-content">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            !loading &&
            query &&
            searchResponse && (
              <div className="alert alert-info">
                No results found for "<strong>{query}</strong>". Try searching
                different terms like genre, author names, or book titles.
              </div>
            )
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center py-4">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p>Searching through book collection...</p>
            </div>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-card d-lg-none">
          {/* Header */}
          <div className="mobile-header mb-3">
            <h2 className="fw-bold">
              <i className="bi bi-search me-2"></i>
              RAG Search
            </h2>
            <p className="mobile-subtitle mb-0">
              Search through books using semantic search
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-3 mobile-search-form">
            <input
              type="text"
              className="form-control mobile-search-input mb-2"
              placeholder="Search books by genre, author, title..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary mobile-search-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  ></span>
                  Searching...
                </>
              ) : (
                <>
                  <i className="bi bi-search me-1"></i>
                  Search
                </>
              )}
            </button>
          </form>

          {/* Search Info */}
          {searchResponse && (
            <div className="mobile-search-info">
              <div className="mb-1">
                <strong>Query:</strong> "{searchResponse.query}"
              </div>
              <div>
                <strong>Found:</strong> {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 ? (
            <div>
              {results.map((result, idx) => (
                <div
                  key={result.book_id || idx}
                  className="mobile-result-card"
                >
                  <div className="mobile-result-header">
                    <h6 className="mobile-result-title">
                      {result.metadata.title}
                    </h6>
                    <span className="badge bg-info mobile-result-badge">
                      {(result.similarity_score * 100).toFixed(0)}% match
                    </span>
                  </div>
                  
                  <div className="mobile-result-meta">
                    <span>
                      <strong>Author:</strong> {result.metadata.author}
                    </span>
                    <span>
                      <strong>Genre:</strong> {result.metadata.genre}
                    </span>
                    <span>
                      <strong>ID:</strong> {result.metadata.book_id}
                    </span>
                  </div>
                  
                  <p className="mobile-result-content mb-0">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            !loading &&
            query &&
            searchResponse && (
              <div className="alert alert-info mobile-no-results">
                No results found for "<strong>{query}</strong>".
                Try different search terms.
              </div>
            )
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center mobile-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Searching books...</p>
            </div>
          )}

          {/* Initial state */}
          {!searchResponse && !loading && (
            <div className="text-center py-4">
              <i className="bi bi-search fs-1 text-muted mb-3 d-block"></i>
              <p className="text-muted mb-1">Enter a search query</p>
              <small className="text-muted">
                Try searching for authors, genres, or topics
              </small>
            </div>
          )}
        </div>
      </div>
    </>
  );
}