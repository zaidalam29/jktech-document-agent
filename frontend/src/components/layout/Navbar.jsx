import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';
import { Menu, Bell, Settings, User, LogOut } from 'lucide-react';
import Button from '../common/Button';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { toggleSidebar, addNotification } = useApp();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      addNotification({
        type: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Logout failed',
      });
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    navigate('/admin/settings');
    setShowUserMenu(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>
        
        <Link to="/dashboard" className="navbar-brand">
          <h1>Document QA</h1>
        </Link>
      </div>

      <div className="navbar-right">
        {user ? (
          <>
            <div className="navbar-notifications">
              <button className="icon-button" aria-label="Notifications">
                <Bell size={20} />
                <span className="notification-badge">3</span>
              </button>
            </div>

            <div className="navbar-user">
              <div
                className="user-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="avatar-placeholder">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <span className="username">{user.username}</span>
              </div>

              {showUserMenu && (
                <div className="user-menu">
                  <div className="user-info">
                    <div className="user-email">{user.username}</div>
                    <div className="user-role">{user.roles?.join(', ')}</div>
                  </div>
                  
                  <div className="user-menu-items">
                    <button onClick={handleProfileClick} className="menu-item">
                      <User size={16} />
                      <span>Profile</span>
                    </button>
                    
                    
                    <div className="menu-divider"></div>
                    
                    <button onClick={handleLogout} className="menu-item logout">
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="navbar-auth">
            <Button
              variant="outline"
              size="small"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={() => navigate('/register')}
            >
              Register
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; // ✅ Add this line