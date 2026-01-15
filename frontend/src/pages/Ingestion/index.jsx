import { useEffect, useState } from "react";
import api from "../../api/axios";
import Swal from "sweetalert2";

export default function Ingestion() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [stats, setStats] = useState({
    totalBooks: 0,
    processedToday: 0,
    failedJobs: 0,
  });

  useEffect(() => {
    loadBookData();
  }, []);

  const loadBookData = async () => {
    try {
      const res = await api.get("/documents");
      const data = res.data || [];
      setBooks(data);

      const jobPromises = data.slice(0, 5).map(async (book) => {
        try {
          const statusRes = await api.get(`/ingestion/status/${book.id}`);
          const status = statusRes.data.status || "pending";
          return {
            id: book.id,
            name: `Processing ${book.filename}`,
            status,
            progress:
              status === "completed"
                ? 100
                : status === "running"
                ? 75
                : status === "failed"
                ? 45
                : 0,
            startTime: new Date(book.uploaded_at).toLocaleString(),
          };
        } catch {
          return {
            id: book.id,
            name: `Processing ${book.filename}`,
            status: "pending",
            progress: 0,
            startTime: new Date(book.uploaded_at).toLocaleString(),
          };
        }
      });

      const jobs = await Promise.all(jobPromises);
      setJobs(jobs);

      const total = data.length;
      const todayStr = new Date().toDateString();
      const processedToday = data.filter(
        (b) => new Date(b.uploaded_at).toDateString() === todayStr
      ).length;
      const failedJobs = jobs.filter((j) => j.status === "failed").length;

      setStats({ totalBooks: total, processedToday, failedJobs });
    } catch (error) {
      console.error("Failed to load book data:", error);
      Swal.fire({
        icon: "info",
        title: "Info",
        text: "Failed to load book data. Showing mock data.",
      });

      // fallback mock data
      setJobs([
        { id: 1, name: "PDF Book Processing", status: "Running", progress: 75, startTime: "2024-01-15 10:30" },
        { id: 2, name: "Text Extraction", status: "Completed", progress: 100, startTime: "2024-01-15 09:15" },
        { id: 3, name: "Index Building", status: "Failed", progress: 45, startTime: "2024-01-15 08:00" },
      ]);
      setStats({ totalBooks: 1234, processedToday: 56, failedJobs: 3 });
    }
  };

  const startBookIngestion = async () => {
    if (!selectedBook) {
      Swal.fire({
        icon: "info",
        title: "Info",
        text: "Please select a book to ingest",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/ingestion/trigger/${selectedBook}`);
      Swal.fire({
        icon: "success",
        title: "Book Ingestion Started",
        text: `Job ID: ${res.data.job_id}`,
        timer: 2000,
        showConfirmButton: false,
      });
      await loadBookData();
    } catch (err) {
      console.error("Failed to start book ingestion:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to start book ingestion. Backend not available.",
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
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
              padding: 32px;
              margin: 24px auto;
              max-width: 1200px;
            }
            
            .desktop-title {
              font-size: 2rem;
              color: #2c3e50;
              margin-bottom: 24px;
            }
            
            .desktop-controls {
              background: #f8f9fa;
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 24px;
            }
            
            .desktop-stats .card {
              border-radius: 10px;
              transition: transform 0.2s;
              height: 100%;
            }
            
            .desktop-stats .card:hover {
              transform: translateY(-5px);
              box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
            }
            
            .desktop-jobs .list-group-item {
              border-radius: 8px;
              margin-bottom: 12px;
              padding: 16px;
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
              margin-bottom: 16px !important;
              text-align: left !important;
            }
            
            /* COMPACT Controls Section */
            .mobile-controls {
              background: #f8f9fa !important;
              border-radius: 8px !important;
              padding: 12px !important;
              margin-bottom: 16px !important;
            }
            
            .mobile-select {
              font-size: 0.85rem !important;
              padding: 8px !important;
              height: 40px !important;
              border-radius: 6px !important;
            }
            
            .mobile-start-btn {
              font-size: 0.85rem !important;
              padding: 8px 16px !important;
              height: 40px !important;
              border-radius: 6px !important;
              white-space: nowrap !important;
            }
            
            /* COMPACT Stats Cards */
            .mobile-stats .card {
              padding: 12px 8px !important;
              margin-bottom: 8px !important;
              border-radius: 6px !important;
              border: 1px solid #e9ecef !important;
            }
            
            .mobile-stats h5 {
              font-size: 0.75rem !important;
              margin-bottom: 4px !important;
              color: #6c757d !important;
            }
            
            .mobile-stats h3 {
              font-size: 1.25rem !important;
              margin: 0 !important;
              font-weight: 600 !important;
            }
            
            /* COMPACT Jobs Section */
            .mobile-jobs h4 {
              font-size: 1rem !important;
              margin-bottom: 12px !important;
            }
            
            .mobile-job-item {
              padding: 12px !important;
              margin-bottom: 8px !important;
              border-radius: 6px !important;
              border: 1px solid #e9ecef !important;
            }
            
            .mobile-job-name {
              font-size: 0.85rem !important;
              font-weight: 600 !important;
              margin-bottom: 4px !important;
            }
            
            .mobile-job-time {
              font-size: 0.7rem !important;
              color: #6c757d !important;
            }
            
            .mobile-badge {
              font-size: 0.7rem !important;
              padding: 3px 8px !important;
              border-radius: 10px !important;
            }
            
            .mobile-progress {
              height: 16px !important;
              margin-top: 8px !important;
              border-radius: 8px !important;
            }
            
            .mobile-progress-bar {
              font-size: 0.7rem !important;
              line-height: 16px !important;
            }
            
            /* Stack controls vertically on very small screens */
            @media (max-width: 576px) {
              .mobile-controls .d-flex {
                flex-direction: column !important;
                gap: 10px !important;
              }
              
              .mobile-controls .form-select,
              .mobile-controls .btn {
                width: 100% !important;
              }
              
              .mobile-container {
                padding: 8px !important;
              }
              
              .mobile-card {
                padding: 12px !important;
              }
            }
            
            /* Adjust stats layout */
            @media (max-width: 768px) {
              .mobile-stats .row > div {
                margin-bottom: 8px !important;
              }
            }
          }
        `}
      </style>

      <div className="container-fluid mobile-container">
        {/* Main Card - Different for mobile/desktop */}
        <div className="card desktop-card d-none d-lg-block">
          <h2 className="desktop-title text-center">Book Ingestion</h2>

          {/* Book selection + start button - Desktop */}
          <div className="desktop-controls">
            <div className="d-flex gap-3 justify-content-center align-items-center">
              <select
                className="form-select"
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                style={{ minWidth: "300px" }}
              >
                <option value="">Select book to ingest...</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.filename}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary px-4"
                onClick={startBookIngestion}
                disabled={loading || !selectedBook}
                style={{ minWidth: "200px" }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Starting...
                  </>
                ) : (
                  "Start Book Ingestion"
                )}
              </button>
            </div>
          </div>

          {/* Stats - Desktop */}
          <div className="row text-center mb-4 desktop-stats">
            <div className="col-md-4 mb-3">
              <div className="card bg-light p-4">
                <h5 className="text-muted">Total Books</h5>
                <h3 className="display-6">{stats.totalBooks.toLocaleString()}</h3>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card bg-light p-4">
                <h5 className="text-muted">Processed Today</h5>
                <h3 className="display-6">{stats.processedToday}</h3>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card bg-light p-4">
                <h5 className="text-muted">Failed Jobs</h5>
                <h3 className="display-6">{stats.failedJobs}</h3>
              </div>
            </div>
          </div>

          {/* Jobs List - Desktop */}
          <h4 className="mb-4">Recent Book Jobs</h4>
          <div className="desktop-jobs">
            {jobs.map((job) => (
              <div key={job.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="mb-1">{job.name}</h6>
                    <small className="text-muted">Started: {job.startTime}</small>
                  </div>
                  <span
                    className={`badge bg-${
                      job.status.toLowerCase() === "failed"
                        ? "danger"
                        : job.status.toLowerCase() === "running"
                        ? "info"
                        : "success"
                    } px-3 py-2`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="progress" style={{ height: "24px" }}>
                  <div
                    className={`progress-bar ${
                      job.status.toLowerCase() === "failed"
                        ? "bg-danger"
                        : job.status.toLowerCase() === "running"
                        ? "bg-info progress-bar-striped progress-bar-animated"
                        : "bg-success"
                    }`}
                    role="progressbar"
                    style={{ width: `${job.progress}%` }}
                    aria-valuenow={job.progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {job.progress}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile View */}
        <div className="mobile-card d-lg-none">
          {/* Header */}
          <div className="mobile-header">
            <h2 className="fw-bold">
              <i className="bi bi-database-fill-add me-2"></i>
              Book Ingestion
            </h2>
          </div>

          {/* Book selection + start button - Mobile */}
          <div className="mobile-controls mb-3">
            <div className="d-flex gap-2 flex-wrap">
              <select
                className="form-select mobile-select flex-grow-1"
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
              >
                <option value="">Select book...</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.filename.length > 30 ? b.filename.substring(0, 30) + '...' : b.filename}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary mobile-start-btn"
                onClick={startBookIngestion}
                disabled={loading || !selectedBook}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    <span className="d-none d-sm-inline">Starting</span>
                    <span className="d-sm-none">...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-fill me-1 d-none d-sm-inline"></i>
                    <span className="d-none d-sm-inline">Start</span>
                    <span className="d-sm-none">
                      <i className="bi bi-play-fill"></i>
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats - Mobile */}
          <div className="row text-center mb-3 mobile-stats">
            <div className="col-4">
              <div className="card bg-light">
                <div className="card-body p-2">
                  <h5>Total</h5>
                  <h3>{stats.totalBooks.toLocaleString()}</h3>
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="card bg-light">
                <div className="card-body p-2">
                  <h5>Today</h5>
                  <h3>{stats.processedToday}</h3>
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="card bg-light">
                <div className="card-body p-2">
                  <h5>Failed</h5>
                  <h3>{stats.failedJobs}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs List - Mobile */}
          <div className="mobile-jobs">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="mb-0">Recent Jobs</h4>
              <small className="text-muted">{jobs.length} jobs</small>
            </div>
            
            <div>
              {jobs.map((job) => (
                <div key={job.id} className="mobile-job-item">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="flex-grow-1">
                      <div className="mobile-job-name text-truncate" title={job.name}>
                        {job.name.length > 40 ? job.name.substring(0, 40) + '...' : job.name}
                      </div>
                      <div className="mobile-job-time">
                        <i className="bi bi-clock me-1"></i>
                        {job.startTime.split(',')[0]}
                      </div>
                    </div>
                    <span
                      className={`badge mobile-badge bg-${
                        job.status.toLowerCase() === "failed"
                          ? "danger"
                          : job.status.toLowerCase() === "running"
                          ? "info"
                          : "success"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="progress mobile-progress">
                    <div
                      className={`progress-bar mobile-progress-bar ${
                        job.status.toLowerCase() === "failed"
                          ? "bg-danger"
                          : job.status.toLowerCase() === "running"
                          ? "bg-info progress-bar-striped progress-bar-animated"
                          : "bg-success"
                      }`}
                      role="progressbar"
                      style={{ width: `${job.progress}%` }}
                      aria-valuenow={job.progress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {job.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {jobs.length === 0 && (
              <div className="text-center py-4">
                <i className="bi bi-inbox fs-4 text-muted mb-3 d-block"></i>
                <p className="text-muted mb-0">No jobs yet</p>
                <small className="text-muted">Start ingestion to see jobs</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}