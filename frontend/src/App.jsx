import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Books from "./pages/Books";
import AddBook from "./pages/AddBook";
import AdminUsers from "./pages/AdminUsers";
import Documents from "./pages/Documents";
import Ingestion from "./pages/Ingestion";
import RAGSearch from "./pages/RAGSearch";
import Summary from "./pages/Summary";
import ProtectedRoute from "./auth/ProtectedRoute";
import Sidebar from "./components/Sidebar";

/* ---------- Layout Wrapper ---------- */
function Layout({ children }) {
  return (
    <div className="d-flex position-relative">
      <Sidebar />
      <div className="main-content-wrapper flex-grow-1 bg-light min-vh-100">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages (No sidebar, no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected Pages (With sidebar and layout) */}
        <Route
          path="/books"
          element={
            <ProtectedRoute>
              <Layout>
                <Books />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-book"
          element={
            <ProtectedRoute>
              <Layout>
                <AddBook />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Layout>
                <Documents />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ingestion"
          element={
            <ProtectedRoute>
              <Layout>
                <Ingestion />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rag"
          element={
            <ProtectedRoute>
              <Layout>
                <RAGSearch />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/summary"
          element={
            <ProtectedRoute>
              <Layout>
                <Summary />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminUsers />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}