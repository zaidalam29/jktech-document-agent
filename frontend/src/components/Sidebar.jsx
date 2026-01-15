import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { logout } from "../api/auth";
import "./Sidebar.css";

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/books", label: "Book List", icon: "bi-book-half" },
    { path: "/add-book", label: "Create Book", icon: "bi-plus-circle" },
    { path: "/documents", label: "Doc Files", icon: "bi-file-earmark-text" },
    { path: "/ingestion", label: "Data Ingestion", icon: "bi-cloud-upload" },
    { path: "/rag", label: "Smart RAG Search", icon: "bi-search" },
    { path: "/summary", label: "Overview", icon: "bi-pie-chart" },
    { path: "/admin/users", label: "User Management", icon: "bi-people" },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile Navbar - Only visible on mobile */}
      <nav className="mobile-navbar d-lg-none">
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-between">
            <button
              className="hamburger-btn"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open menu"
            >
              <i className="bi bi-list fs-4"></i>
            </button>
            
            <div className="d-flex align-items-center">
              <h5 className="mb-0 ms-3">
                <i className="bi bi-book-fill me-2" style={{ color: '#667eea' }}></i>
                Book Manager Pro
              </h5>
            </div>
            
            <div style={{ width: '40px' }}></div> {/* For balance */}
          </div>
        </div>
      </nav>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay d-lg-none"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-inner">
          {/* Header */}
          <div className="sidebar-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-white fw-bold">
                <i className="bi bi-book-fill me-2" style={{ color: '#667eea' }}></i>
                Book Manager Pro
              </h5>
              <button
                className="close-btn d-lg-none"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
              >
                <i className="bi bi-x-lg fs-4"></i>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`nav-link-custom ${
                  isActive(item.path) ? "active" : ""
                }`}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer / Logout */}
          <div className="sidebar-footer">
            <button
              className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right"></i>
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}