import { useEffect, useState } from "react";
import { getBooks, deleteBook, getBookById, getReviews, addReview } from "../../api/books";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import { useNavigate, Link } from "react-router-dom";

export default function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("all");
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loadingBook, setLoadingBook] = useState(false);

  // Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookForReview, setSelectedBookForReview] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newReview, setNewReview] = useState({
    review_text: "",
    rating: 5
  });

  // Get current user ID from localStorage
  const getCurrentUserId = () => {
    const user_id = localStorage.getItem("user_id");
    return user_id ? parseInt(user_id) : null;
  };

  const handleView = async (id) => {
    setShowModal(true);
    setLoadingBook(true);
    setSelectedBook(null);

    try {
      const res = await getBookById(id);
      if (res?.data) {
        setSelectedBook(res.data);
      } else {
        throw new Error("Book not found");
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load book details"
      });
      setShowModal(false);
    } finally {
      setLoadingBook(false);
    }
  };

  const handleReview = async (book) => {
    console.log('Opening review modal for book:', book);
    setSelectedBookForReview(book);
    setShowReviewModal(true);
    setNewReview({
      review_text: "",
      rating: 5
    });

    // Load existing reviews for this book
    console.log(`Loading reviews for book ID: ${book.id}`);
    await loadReviews(book.id);
  };

  const loadReviews = async (bookId) => {
    setLoadingReviews(true);
    try {
      const reviewsData = await getReviews(bookId);
      console.log('Reviews data (direct array):', reviewsData);

      // Check if it's an array
      if (Array.isArray(reviewsData)) {
        setReviews(reviewsData);
      } else if (reviewsData && reviewsData.data && Array.isArray(reviewsData.data)) {
        // If it's an object with data property
        setReviews(reviewsData.data);
      } else {
        console.warn('Unexpected reviews data structure:', reviewsData);
        setReviews([]);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please login to submit a review"
      });
      return;
    }

    if (!newReview.review_text.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please enter your review"
      });
      return;
    }

    if (newReview.rating < 1 || newReview.rating > 5) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Rating",
        text: "Rating must be between 1 and 5"
      });
      return;
    }

    try {
      const reviewData = {
        user_id: userId,
        review_text: newReview.review_text,
        rating: parseFloat(newReview.rating)
      };

      await addReview(selectedBookForReview.id, reviewData);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Review submitted successfully!"
      });

      // Reset form and reload reviews
      setNewReview({ review_text: "", rating: 5 });
      await loadReviews(selectedBookForReview.id);

    } catch (err) {
      console.error("Failed to submit review:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to submit review: " + (err.response?.data?.message || err.message)
      });
    }
  };

  const loadBooks = async () => {
    try {
      const res = await getBooks();
      setBooks(res.data);
    } catch (err) {
      Swal.fire("Error", "Failed to load books", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This book will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Yes, delete",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteBook(id);
      Swal.fire("Deleted!", "Book deleted successfully", "success");
      loadBooks();
    } catch (err) {
      Swal.fire("Error", "Delete failed", "error");
    }
  };

  const genres = ["all", ...new Set(books.map(b => b.genre).filter(Boolean))];

  const filteredBooks = books.filter(b => {
    const matchSearch =
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.author?.toLowerCase().includes(search.toLowerCase());
    const matchGenre = genre === "all" || b.genre === genre;
    return matchSearch && matchGenre;
  });

  // Responsive columns for DataTable
  const columns = [
    {
      name: "Title",
      selector: row => row.title,
      sortable: true,
      wrap: true,
      minWidth: "150px"
    },
    {
      name: "Author",
      selector: row => row.author,
      sortable: true,
      wrap: true,
      minWidth: "120px",
      omit: window.innerWidth < 576
    },
    {
      name: "Genre",
      selector: row => row.genre || "N/A",
      omit: window.innerWidth < 768
    },
    {
      name: "Year",
      selector: row => row.year_published || "N/A",
      omit: window.innerWidth < 768
    },
    {
      name: "Actions",
      cell: row => (
        <div className="d-flex gap-1 flex-wrap">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => handleView(row.id)}
            title="View Details"
          >
            <i className="bi bi-eye"></i>
            {/* <span className="d-none d-sm-inline ms-1">View</span> */}
          </button>
          <button
            className="btn btn-sm btn-outline-success"
            onClick={() => handleReview(row)}
            title="Add Review"
          >
            <i className="bi bi-chat-text"></i>
            {/* <span className="d-none d-sm-inline ms-1">Review</span> */}
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDelete(row.id)}
            title="Delete Book"
          >
            <i className="bi bi-trash"></i>
            {/* <span className="d-none d-sm-inline ms-1">Delete</span> */}
          </button>
        </div>
      ),
      center: true,
      minWidth: "180px"
    },
  ];

  const customStyles = {
    headCells: {
      style: {
        fontSize: '14px',
        fontWeight: '600',
        backgroundColor: '#f8f9fa',
      },
    },
    cells: {
      style: {
        fontSize: '13px',
      },
    },
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3 mb-md-4 flex-wrap gap-2 gap-md-3">
        <div className="flex-grow-1">
          <h3 className="fw-semibold mb-2 fs-4 fs-md-3">
            <i className="bi bi-book-half text-primary me-2"></i>
            Book List
          </h3>

          <nav aria-label="breadcrumb" className="d-none d-sm-block">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item">
                <Link to="/books" className="text-decoration-none">
                  <i className="bi bi-house-door me-1"></i>
                  Home
                </Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Books
              </li>
            </ol>
          </nav>
        </div>

        <div>
          <button
            className="btn btn-primary btn-sm btn-md-md"
            onClick={() => navigate("/add-book")}
          >
            <i className="bi bi-plus-circle me-1"></i>
            <span className="d-none d-sm-inline">Add Book</span>
            <span className="d-inline d-sm-none">Add</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-3 mb-md-4 g-2 g-md-3">
        <div className="col-4 col-md-4">
          <div className="card text-center border-0 shadow-sm h-100">
            <div className="card-body p-2 p-md-3">
              <h6 className="text-muted mb-1 small">Total Books</h6>
              <h4 className="text-primary fw-bold mb-0 fs-5 fs-md-4">
                {books.length}
              </h4>
            </div>
          </div>
        </div>
        <div className="col-4 col-md-4">
          <div className="card text-center border-0 shadow-sm h-100">
            <div className="card-body p-2 p-md-3">
              <h6 className="text-muted mb-1 small">Authors</h6>
              <h4 className="text-success fw-bold mb-0 fs-5 fs-md-4">
                {new Set(books.map(b => b.author)).size}
              </h4>
            </div>
          </div>
        </div>
        <div className="col-4 col-md-4">
          <div className="card text-center border-0 shadow-sm h-100">
            <div className="card-body p-2 p-md-3">
              <h6 className="text-muted mb-1 small">Genres</h6>
              <h4 className="text-info fw-bold mb-0 fs-5 fs-md-4">
                {genres.length - 1}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3 border-0 shadow-sm">
        <div className="card-body p-2 p-md-3">
          <div className="row g-2 g-md-3">
            <div className="col-12 col-md-7 col-lg-5">
              <div className="input-group input-group-sm input-group-md-md">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by title or author"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setSearch("")}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="col-12 col-md-5 col-lg-4">
              <div className="input-group input-group-sm input-group-md-md">
                <span className="input-group-text">
                  <i className="bi bi-funnel"></i>
                </span>
                <select
                  className="form-select"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  {genres.map(g => (
                    <option key={g} value={g}>
                      {g === "all" ? "All Genres" : g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(search || genre !== "all") && (
            <div className="mt-2 d-flex gap-2 flex-wrap">
              <small className="text-muted">Active filters:</small>
              {search && (
                <span className="badge bg-primary">
                  Search: {search}
                  <i
                    className="bi bi-x ms-1"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSearch("")}
                  ></i>
                </span>
              )}
              {genre !== "all" && (
                <span className="badge bg-info">
                  Genre: {genre}
                  <i
                    className="bi bi-x ms-1"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setGenre("all")}
                  ></i>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-2">
        <small className="text-muted">
          Showing {filteredBooks.length} of {books.length} books
        </small>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0 p-md-2">
          <DataTable
            columns={columns}
            data={filteredBooks}
            progressPending={loading}
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={[5, 10, 15, 20]}
            highlightOnHover
            striped
            responsive
            noDataComponent={
              <div className="text-center py-4">
                <i className="bi bi-inbox fs-1 text-muted"></i>
                <p className="text-muted mt-2">No books found</p>
              </div>
            }
            customStyles={customStyles}
          />
        </div>
      </div>

      {/* Book Details Modal */}
      {showModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fs-md-5">
                    <i className="bi bi-book me-2"></i>
                    Book Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body">
                  {loadingBook && (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary mb-3"></div>
                      <p className="text-muted">Loading book details...</p>
                    </div>
                  )}

                  {!loadingBook && selectedBook && (
                    <div className="row g-3">
                      <div className="col-12">
                        <div className="card bg-light border-0">
                          <div className="card-body">
                            <div className="row g-3">
                              <div className="col-12">
                                <label className="text-muted small mb-1">
                                  <i className="bi bi-book me-1"></i>
                                  Title
                                </label>
                                <h5 className="mb-0">{selectedBook.title}</h5>
                              </div>

                              <div className="col-md-6">
                                <label className="text-muted small mb-1">
                                  <i className="bi bi-person me-1"></i>
                                  Author
                                </label>
                                <p className="mb-0 fw-semibold">{selectedBook.author}</p>
                              </div>

                              <div className="col-md-3 col-6">
                                <label className="text-muted small mb-1">
                                  <i className="bi bi-tag me-1"></i>
                                  Genre
                                </label>
                                <p className="mb-0">
                                  <span className="badge bg-primary">
                                    {selectedBook.genre || "N/A"}
                                  </span>
                                </p>
                              </div>

                              <div className="col-md-3 col-6">
                                <label className="text-muted small mb-1">
                                  <i className="bi bi-calendar-event me-1"></i>
                                  Year
                                </label>
                                <p className="mb-0">
                                  <span className="badge bg-secondary">
                                    {selectedBook.year_published || "N/A"}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedBook.summary && (
                        <div className="col-12">
                          <label className="text-muted small mb-2">
                            <i className="bi bi-card-text me-1"></i>
                            Summary
                          </label>
                          <div className="border rounded p-3 bg-light">
                            <p className="mb-0" style={{ textAlign: 'justify' }}>
                              {selectedBook.summary}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fs-md-5">
                    <i className="bi bi-chat-text me-2"></i>
                    Review for "{selectedBookForReview?.title}"
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowReviewModal(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body">
                  {/* Review Form */}
                  <div className="card mb-4 border-0 shadow-sm">
                    <div className="card-body">
                      <h6 className="card-title mb-3">
                        <i className="bi bi-pencil me-2"></i>
                        Add Your Review
                      </h6>

                      <div className="mb-3">
                        <label className="form-label">
                          Rating <span className="text-danger">*</span>
                        </label>
                        <div className="d-flex align-items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className="btn p-0 me-1"
                              onClick={() => setNewReview({ ...newReview, rating: star })}
                            >
                              <i
                                className={`bi ${star <= newReview.rating ? 'bi-star-fill' : 'bi-star'} fs-4`}
                                style={{
                                  color: star <= newReview.rating ? '#ffc107' : '#6c757d'
                                }}
                              ></i>
                            </button>
                          ))}
                          <span className="ms-2 text-muted small">
                            ({newReview.rating}/5)
                          </span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          Review <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows="4"
                          placeholder="Write your review here..."
                          value={newReview.review_text}
                          onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                        />
                      </div>

                      <button
                        className="btn btn-primary"
                        onClick={handleSubmitReview}
                        disabled={!newReview.review_text.trim()}
                      >
                        <i className="bi bi-send me-1"></i>
                        Submit Review
                      </button>
                    </div>
                  </div>

                  {/* Existing Reviews */}
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <h6 className="card-title mb-3">
                        <i className="bi bi-chat-left-text me-2"></i>
                        Existing Reviews ({reviews.length})
                      </h6>

                      {loadingReviews ? (
                        <div className="text-center py-3">
                          <div className="spinner-border spinner-border-sm text-primary"></div>
                          <p className="text-muted mt-2">Loading reviews...</p>
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="text-center py-4">
                          <i className="bi bi-chat-square-text fs-1 text-muted"></i>
                          <p className="text-muted mt-2">No reviews yet. Be the first to review!</p>
                        </div>
                      ) : (
                        <div className="reviews-list">
                          {reviews.map((review, index) => (
                            <div
                              key={review.id || index}
                              className="border-bottom pb-3 mb-3"
                            >
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <strong className="d-block">
                                    User #{review.user_id}
                                  </strong>
                                  <small className="text-muted">
                                    {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recently'}
                                  </small>
                                </div>
                                <div className="d-flex align-items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <i
                                      key={i}
                                      className={`bi ${i < review.rating ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
                                    ></i>
                                  ))}
                                  <span className="ms-1 fw-semibold">
                                    {review.rating}/5
                                  </span>
                                </div>
                              </div>
                              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                                {review.review_text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowReviewModal(false)}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
}