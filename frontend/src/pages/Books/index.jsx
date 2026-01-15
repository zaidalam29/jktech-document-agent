import { useEffect, useState } from "react";
import { getBooks, deleteBook, getBookById } from "../../api/books";
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
      wrap: true, // Wrap text on mobile
      minWidth: "150px"
    },
    { 
      name: "Author", 
      selector: row => row.author, 
      sortable: true,
      wrap: true,
      minWidth: "120px",
      omit: window.innerWidth < 576 // Hide on very small screens
    },
    { 
      name: "Genre", 
      selector: row => row.genre || "N/A",
      omit: window.innerWidth < 768 // Hide on tablets and below
    },
    { 
      name: "Year", 
      selector: row => row.year_published || "N/A",
      omit: window.innerWidth < 768 // Hide on tablets and below
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
            <span className="d-none d-sm-inline ms-1">View</span>
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDelete(row.id)}
            title="Delete Book"
          >
            <i className="bi bi-trash"></i>
            <span className="d-none d-sm-inline ms-1">Delete</span>
          </button>
        </div>
      ),
      center: true,
      minWidth: "130px"
    },
  ];

  // Custom styles for DataTable
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
          
          {/* Breadcrumb - hide on very small screens */}
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

      {/* Stats Cards - Responsive Grid */}
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
          
          {/* Active Filters Display */}
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

      {/* Modal - Responsive */}
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
    </div>
  );
}


// ==================== Additional CSS (Optional) ====================
// Add this to Books.css or your global CSS

/*
@media (max-width: 575.98px) {
  .container-fluid {
    padding-left: 0.75rem !important;
    padding-right: 0.75rem !important;
  }
  
  .card-body {
    padding: 0.75rem !important;
  }
  
  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  h3, .fs-4 {
    font-size: 1.25rem !important;
  }
}

@media (max-width: 767.98px) {
  .modal-dialog {
    margin: 0.5rem;
  }
}

.input-group-text {
  background-color: #f8f9fa;
  border-right: none;
}

.input-group .form-control {
  border-left: none;
}

.input-group .form-control:focus {
  border-color: #ced4da;
  box-shadow: none;
}

.input-group:focus-within .input-group-text {
  border-color: #86b7fe;
}

.badge {
  font-weight: 500;
  padding: 0.35em 0.65em;
}

.badge i {
  cursor: pointer;
}

.badge i:hover {
  opacity: 0.8;
}
*/