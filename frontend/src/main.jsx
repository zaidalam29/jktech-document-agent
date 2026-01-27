import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';

// Base CSS first
import './index.css';
import './app/App.css';

// Common Components CSS
import './components/common/Loader.css';
import './components/common/Button.css';
import './components/common/Input.css';
import './components/common/Notification.css'; // Notification styles

// Layout CSS
import './components/layout/Layout.css';
import './components/layout/Navbar.css';
import './components/layout/Sidebar.css';

// Pages CSS
import './pages/auth/Login.css';
import './pages/auth/Register.css';
import './pages/dashboard/Dashboard.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);