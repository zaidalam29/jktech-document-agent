import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth.context';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import Layout from '../components/layout/Layout';
import Loader from '../components/common/Loader';
import ROUTES from '../config/routes';

// Lazy load ALL pages
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const Profile = lazy(() => import('../pages/Profile/Profile'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Unauthorized = lazy(() => import('../pages/Unauthorized'));

// ✅ BOOKS PAGES
const BooksList = lazy(() => import('../pages/books/BooksList'));
const MyBooks = lazy(() => import('../pages/books/MyBooks'));
const CreateBook = lazy(() => import('../pages/books/CreateBook'));
const BookDetails = lazy(() => import('../pages/books/BookDetails'));
const EditBook = lazy(() => import('../pages/books/EditBook'));

// ✅ DOCUMENTS PAGES - Add These
const DocumentsPage = lazy(() => import('../pages/documents/DocumentsPage'));

const IngestionPage = lazy(() => import('../pages/ingestion/IngestionPage'));
const QAPages = lazy(() => import('../pages/qa/QAPage'));
// Loader for suspense
const PageLoader = () => (
  <div className="page-loader">
    <Loader size="large" text="Loading page..." />
  </div>
);

const AppRouter = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="large" text="Checking authentication..." />
      </div>
    );
  }

  const AuthRedirect = ({ children }) => {
    if (isAuthenticated) {
      return <Navigate to={ROUTES.PRIVATE.DASHBOARD} replace />;
    }
    return children;
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path={ROUTES.PUBLIC.LOGIN}
          element={
            <AuthRedirect>
              <Login />
            </AuthRedirect>
          }
        />
        
        <Route
          path={ROUTES.PUBLIC.REGISTER}
          element={
            <AuthRedirect>
              <Register />
            </AuthRedirect>
          }
        />
        
        {/* Error Pages */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path={ROUTES.ERROR[404]} element={<NotFound />} />
        
        {/* Protected Routes with Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={ROUTES.PRIVATE.DASHBOARD} replace />} />
          <Route path={ROUTES.PRIVATE.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.PRIVATE.PROFILE} element={<Profile />} />
          
          {/* ✅ BOOKS ROUTES */}
          <Route path={ROUTES.PRIVATE.BOOKS.LIST} element={<BooksList />} />
          <Route path={ROUTES.PRIVATE.BOOKS.MY_BOOKS} element={<MyBooks />} />
          <Route path={ROUTES.PRIVATE.BOOKS.CREATE} element={<CreateBook />} />
          <Route path={ROUTES.PRIVATE.BOOKS.DETAILS} element={<BookDetails />} />
          <Route path={ROUTES.PRIVATE.BOOKS.EDIT} element={<EditBook />} />
          
          {/* ✅ DOCUMENTS ROUTES - NEWLY ADDED */}
         <Route path={ROUTES.PRIVATE.DOCUMENTS.LIST} element={<DocumentsPage />} />
         <Route path={ROUTES.PRIVATE.INGESTION} element={<IngestionPage />} />
         <Route path={ROUTES.PRIVATE.QA.ASK} element={<QAPages />} />
          
          {/* Other routes... */}
        </Route>
        
        {/* 404 - Catch all route */}
        <Route path="*" element={<Navigate to={ROUTES.PUBLIC.LOGIN} replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;