import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Loader from '../common/Loader';
import Notification from '../common/Notification';
import './Layout.css';

const Layout = () => {
  const { loading: authLoading } = useAuth();
  const { notifications, removeNotification, sidebarOpen } = useApp();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="large" text="Loading application..." />
      </div>
    );
  }

  return (
    <div className="layout">
      {/* Notifications Container */}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            message={notification.message}
            onClose={() => removeNotification(notification.id)}
            duration={notification.duration}
          />
        ))}
      </div>
      
      <Navbar />
      
      <div className="layout-content">
        <Sidebar />
        
        {/* Fixed: Use dynamic class for sidebar state */}
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;