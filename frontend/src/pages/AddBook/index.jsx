import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { addBook } from "../../api/books";

export default function AddBook() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [book, setBook] = useState({
    title: "",
    author: "",
    genre: "",
    year_published: "",
    summary: "" // Added summary field
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBook((prev) => ({
      ...prev,
      [name]: name === "year_published" ? parseInt(value) || "" : value
    }));
  };

  const handleReset = () => {
    setBook({
      title: "",
      author: "",
      genre: "",
      year_published: "",
      summary: ""
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!book.title || !book.author) {
      Swal.fire({
        icon: "warning",
        title: "Missing Required Fields",
        text: "Title and Author are required.",
        confirmButtonColor: "#667eea"
      });
      return;
    }

    setLoading(true);

    Swal.fire({
      title: "Saving Book",
      text: "Please wait...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      await addBook(book);

      Swal.fire({
        icon: "success",
        title: "Book Created Successfully",
        text: "Redirecting to book list...",
        timer: 1500,
        showConfirmButton: false
      });

      setTimeout(() => navigate("/books"), 1500);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Failed to Create Book",
        text: error.response?.data?.message || "Something went wrong. Please try again.",
        confirmButtonColor: "#dc3545"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      
      {/* PAGE HEADER */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-semibold mb-1">
            <i className="bi bi-plus-circle text-primary me-2"></i>
            Create New Book
          </h3>
          <p className="text-muted mb-3">
            Fill in the details below to add a new book to the library collection.
          </p>

          {/* BREADCRUMB */}
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/books" className="text-decoration-none">
                  <i className="bi bi-house-door me-1"></i>
                  Home
                </Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/books" className="text-decoration-none">
                  <i className="bi bi-book me-1"></i>
                  Books
                </Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Create Book
              </li>
            </ol>
          </nav>
        </div>

        {/* BACK BUTTON */}
        <div>
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate("/books")}
          >
            <i className="bi bi-arrow-left me-1"></i>
            Back to List
          </button>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8 col-xl-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient text-white py-3" 
                 style={{ 
                   background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                 }}>
              <h5 className="mb-0 d-flex align-items-center">
                <i className="bi bi-journal-plus me-2"></i>
                Book Information
              </h5>
            </div>

            <div className="card-body p-4">
              <form onSubmit={submit}>

                {/* TITLE */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Book Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    name="title"
                    value={book.title}
                    onChange={handleChange}
                    placeholder="Enter book title"
                    required
                  />
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    The main title of the book
                  </small>
                </div>

                {/* AUTHOR */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Author <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    name="author"
                    value={book.author}
                    onChange={handleChange}
                    placeholder="Enter author name"
                    required
                  />
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Full name of the book's author
                  </small>
                </div>

                {/* GENRE & YEAR ROW */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Genre</label>
                    <select
                      className="form-select form-select-lg"
                      name="genre"
                      value={book.genre}
                      onChange={handleChange}
                    >
                      <option value="">Select Genre</option>
                      <option value="Fiction">Fiction</option>
                      <option value="Non-Fiction">Non-Fiction</option>
                      <option value="Science Fiction">Science Fiction</option>
                      <option value="Fantasy">Fantasy</option>
                      <option value="Mystery">Mystery</option>
                      <option value="Thriller">Thriller</option>
                      <option value="Romance">Romance</option>
                      <option value="Biography">Biography</option>
                      <option value="History">History</option>
                      <option value="Self-Help">Self-Help</option>
                      <option value="Business">Business</option>
                      <option value="Technology">Technology</option>
                    </select>
                    <small className="text-muted">
                      <i className="bi bi-tag me-1"></i>
                      Book category or genre
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Published Year
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      name="year_published"
                      value={book.year_published}
                      onChange={handleChange}
                      placeholder="e.g., 2024"
                      min="1000"
                      max={new Date().getFullYear()}
                    />
                    <small className="text-muted">
                      <i className="bi bi-calendar-event me-1"></i>
                      Year of publication
                    </small>
                  </div>
                </div>

                {/* SUMMARY */}
                

                {/* REQUIRED FIELDS NOTE */}
                <div className="alert alert-light border d-flex align-items-center mb-4">
                  <i className="bi bi-exclamation-circle text-primary me-2 fs-5"></i>
                  <small className="mb-0">
                    Fields marked with <span className="text-danger">*</span> are required
                  </small>
                </div>

                {/* ACTION BUTTONS */}
                <div className="d-flex gap-2 justify-content-end flex-wrap">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Reset
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger px-4"
                    onClick={() => navigate("/books")}
                    disabled={loading}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary px-4"
                    disabled={loading}
                    style={{
                      background: loading 
                        ? "#6c757d" 
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none"
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Create Book
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* HELPFUL TIPS CARD */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">
                <i className="bi bi-lightbulb text-warning me-2"></i>
                Quick Tips
              </h6>
              <ul className="mb-0 small text-muted">
                <li className="mb-2">
                  <strong>Title & Author</strong> are mandatory fields to create a book entry
                </li>
                <li className="mb-2">
                  <strong>Genre</strong> helps in categorizing and filtering books
                </li>
                
                <li>
                  You can always edit these details later from the book list
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ==================== Optional: Custom CSS for additional styling ====================
// Add this to your AddBook.css or global CSS file

/*
.form-control:focus,
.form-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
}

.form-control-lg {
  padding: 0.75rem 1rem;
  font-size: 1rem;
}

.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.15) !important;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline-secondary:hover,
.btn-outline-danger:hover {
  transform: translateY(-2px);
}

@media (max-width: 767.98px) {
  .card-body {
    padding: 1.5rem !important;
  }
  
  .form-control-lg {
    font-size: 0.95rem;
  }
}
*/