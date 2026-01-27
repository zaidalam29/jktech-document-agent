import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Navigate imported
import { AuthProvider } from '../store/auth.context.jsx';
import { AppProvider } from '../store/app.context.jsx';
import ErrorBoundary from './ErrorBoundary';
import AppRouter from './Router';
import { BookProvider } from '../store/book.context.jsx';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>      {/* Global app state - notifications, theme, etc. */}
          <AuthProvider>   {/* Authentication state - user, token, etc. */}
            <BookProvider> {/* Books data state - allBooks, myBooks, etc. */}
              <AppRouter /> {/* Main router with all routes */}
            </BookProvider>
          </AuthProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;