import { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import api from "../../api/axios";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/documents");
      setDocuments(Array.isArray(response.data) ? response.data : []);
      setErrorMessage(null);
    } catch (error) {
      setDocuments([]);
      setErrorMessage(`Failed to load documents: ${error.response?.status || "Network Error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Delete document
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/documents/${id}`);
        await fetchDocuments();
        Swal.fire("Deleted!", "Document has been deleted.", "success");
      } catch (error) {
        Swal.fire(
          "Failed",
          `Delete failed: ${error.response?.status || "Network Error"}`,
          "error"
        );
      }
    }
  };

  // Download document
  const handleDownload = async (id, filename) => {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `document-${id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire(
        "Download Failed",
        `Could not download: ${error.response?.status || "Network Error"}`,
        "error"
      );
    }
  };

  // Upload document
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      Swal.fire("Error", "Please select a file to upload", "warning");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      await api.post("/documents/upload", formData);
      setSelectedFile(null);
      document.querySelector('input[type="file"]').value = "";
      await fetchDocuments();
      Swal.fire("Success", "File uploaded successfully", "success");
    } catch (error) {
      Swal.fire(
        "Upload Failed",
        error.response?.data?.detail || "Network Error",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  // Columns configuration
  const columns = [
    {
      name: "Document",
      selector: (row) => row.filename || "Unknown",
      sortable: true,
      cell: (row) => (
        <div className="text-truncate" style={{ maxWidth: "150px" }}>
          {row.filename || "Unknown"}
        </div>
      ),
    },
    {
      name: "Size",
      selector: (row) => {
        const size = row.file_size;
        if (!size) return "Unknown";
        if (typeof size === "number") {
          if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
          if (size > 1024) return `${(size / 1024).toFixed(1)} KB`;
          return `${size} bytes`;
        }
        return size.toString();
      },
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => (row.uploaded_at ? new Date(row.uploaded_at).toLocaleDateString() : "Unknown"),
      sortable: true,
    },
    {
      name: "Status",
      cell: (row) => (
        <span
          className={`badge ${(row.status || "active").toLowerCase() === "active" ? "bg-success" : "bg-secondary"}`}
        >
          {row.status || "Active"}
        </span>
      ),
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="d-flex gap-1">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => handleDownload(row.id, row.filename)}
            title="Download"
          >
            <i className="bi bi-download"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDelete(row.id)}
            title="Delete"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      ),
    },
  ];

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
              margin-bottom: 24px;
              padding: 24px;
            }
            
            .desktop-upload-section {
              background: #f8f9fa;
              border: 1px solid #dee2e6;
            }
            
            .desktop-title {
              font-size: 1.75rem;
              color: #2c3e50;
            }
          }
          
          /* Mobile View - Compact */
          @media (max-width: 991.98px) {
            /* Compact container */
            .mobile-container {
              padding: 12px !important;
              padding-top: 70px !important;
            }
            
            /* Compact header */
            .mobile-header h3 {
              font-size: 1.1rem !important;
              margin-bottom: 8px !important;
            }
            
            .mobile-breadcrumb {
              font-size: 0.75rem !important;
              margin-bottom: 16px !important;
            }
            
            /* COMPACT Upload Card - Small and simple */
            .mobile-upload-card {
              padding: 12px !important;
              margin-bottom: 16px !important;
              border-radius: 8px !important;
              background: #f8f9fa !important;
              border: 1px solid #e9ecef !important;
            }
            
            .mobile-upload-card .card-title {
              font-size: 0.9rem !important;
              font-weight: 600 !important;
              margin-bottom: 12px !important;
              color: #495057 !important;
            }
            
            .mobile-upload-card .form-control {
              font-size: 0.85rem !important;
              padding: 8px 12px !important;
              height: 38px !important;
              border-radius: 6px !important;
            }
            
            .mobile-upload-card .btn {
              font-size: 0.85rem !important;
              padding: 8px 16px !important;
              height: 38px !important;
              border-radius: 6px !important;
            }
            
            .mobile-file-info {
              font-size: 0.8rem !important;
              margin-top: 8px !important;
            }
            
            /* COMPACT Table Card */
            .mobile-table-card {
              padding: 0 !important;
              border-radius: 8px !important;
              overflow: hidden !important;
              border: 1px solid #e9ecef !important;
            }
            
            .mobile-table-card .card-body {
              padding: 0 !important;
            }
            
            /* COMPACT Table Styling */
            .mobile-table-container {
              max-height: 60vh !important;
              overflow-y: auto !important;
            }
            
            .rdt_Table {
              min-width: 500px !important;
            }
            
            .rdt_TableHead {
              font-size: 0.8rem !important;
              background: #f8f9fa !important;
            }
            
            .rdt_TableCell {
              font-size: 0.85rem !important;
              padding: 8px 12px !important;
            }
            
            /* COMPACT No Data Message */
            .mobile-no-data {
              padding: 40px 20px !important;
            }
            
            .mobile-no-data i {
              font-size: 2rem !important;
              margin-bottom: 12px !important;
            }
            
            .mobile-no-data h6 {
              font-size: 0.9rem !important;
              margin-bottom: 6px !important;
            }
            
            .mobile-no-data small {
              font-size: 0.8rem !important;
            }
            
            /* Compact buttons */
            .btn-sm {
              padding: 4px 8px !important;
              font-size: 0.8rem !important;
              min-width: 32px !important;
              min-height: 32px !important;
            }
            
            /* Hide some columns on very small screens */
            @media (max-width: 576px) {
              .rdt_TableCol:nth-child(2),
              .rdt_TableCell:nth-child(2),
              .rdt_TableCol:nth-child(3),
              .rdt_TableCell:nth-child(3) {
                display: none !important;
              }
              
              .mobile-container {
                padding: 8px !important;
              }
              
              .mobile-upload-card {
                padding: 10px !important;
              }
            }
            
            /* Hide more columns on extra small */
            @media (max-width: 400px) {
              .rdt_TableCol:nth-child(4),
              .rdt_TableCell:nth-child(4) {
                display: none !important;
              }
              
              .rdt_Table {
                min-width: 300px !important;
              }
            }
          }
        `}
      </style>

      <div className="container-fluid p-3 p-lg-4">
        {/* Header - Different for mobile/desktop */}
        <div className="mb-3 mobile-header">
          <div className="d-flex flex-column">
            <h3 className="fw-bold desktop-title d-none d-lg-block mb-3">
              <i className="bi bi-folder2-open me-2"></i> Document Management
            </h3>
            <h3 className="fw-bold d-lg-none mb-2">
              <i className="bi bi-folder2 me-2"></i> Documents
            </h3>
            <nav aria-label="breadcrumb" className="mobile-breadcrumb">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to="/" className="text-decoration-none">
                    <i className="bi bi-house me-1"></i>
                    <span className="d-none d-sm-inline">Home</span>
                  </Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Documents
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Upload Card - Different styling for mobile/desktop */}
        <div className="card desktop-upload-section desktop-card d-none d-lg-block mb-4">
          <div className="card-body">
            <h5 className="card-title mb-4">
              <i className="bi bi-cloud-upload me-2"></i> Upload New Document
            </h5>
            <form onSubmit={handleFileUpload}>
              <div className="row g-3 align-items-center">
                <div className="col-md-8">
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    disabled={uploading}
                  />
                </div>
                <div className="col-md-4">
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={uploading || !selectedFile}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-upload me-2"></i>
                        Upload Document
                      </>
                    )}
                  </button>
                </div>
              </div>
              {selectedFile && (
                <div className="mt-3">
                  <span className="badge bg-info">
                    <i className="bi bi-file-earmark me-1"></i>
                    {selectedFile.name}
                  </span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Mobile Upload Card - COMPACT */}
        <div className="card mobile-upload-card d-lg-none mb-3">
          <div className="card-body p-2">
            <h6 className="card-title mb-2 d-flex align-items-center">
              <i className="bi bi-cloud-arrow-up me-2"></i>
              Upload File
            </h6>
            <form onSubmit={handleFileUpload}>
              <div className="d-flex gap-2">
                <input
                  type="file"
                  className="form-control form-control-sm"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  disabled={uploading}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <i className="bi bi-upload"></i>
                  )}
                </button>
              </div>
              {selectedFile && (
                <div className="mobile-file-info text-truncate">
                  <small className="text-muted">
                    <i className="bi bi-file me-1"></i>
                    {selectedFile.name}
                  </small>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="alert alert-danger d-flex align-items-center justify-content-between mb-3 p-2 p-lg-3">
            <div className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <small>{errorMessage}</small>
            </div>
            <button 
              className="btn btn-sm btn-outline-dark ms-2" 
              onClick={fetchDocuments}
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        )}

        {/* Documents Table Card */}
        <div className="card desktop-card d-none d-lg-block">
          <div className="card-body p-0">
            <DataTable
              columns={columns}
              data={documents}
              pagination
              paginationPerPage={10}
              progressPending={loading}
              highlightOnHover
              striped
              responsive
              noDataComponent={
                <div className="text-center py-5">
                  <i className="bi bi-inbox fs-1 text-muted mb-3"></i>
                  <h5 className="text-muted">No documents found</h5>
                  <p className="text-muted mb-0">Upload a document to get started</p>
                </div>
              }
            />
          </div>
        </div>

        {/* Mobile Table Card - COMPACT */}
        <div className="card mobile-table-card d-lg-none">
          <div className="card-body p-0">
            <div className="mobile-table-container">
              <DataTable
                columns={columns}
                data={documents}
                pagination
                paginationPerPage={5}
                progressPending={loading}
                highlightOnHover
                dense
                responsive={false}
                noDataComponent={
                  <div className="text-center mobile-no-data">
                    <i className="bi bi-folder-x text-muted mb-2"></i>
                    <h6>No documents</h6>
                    <small className="text-muted">Upload a file to begin</small>
                  </div>
                }
                customStyles={{
                  headCells: {
                    style: {
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      padding: '10px 12px',
                      backgroundColor: '#f8f9fa',
                    },
                  },
                  cells: {
                    style: {
                      fontSize: '0.85rem',
                      padding: '8px 12px',
                    },
                  },
                  rows: {
                    style: {
                      minHeight: '45px',
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}