import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';
import { 
  Home, 
  FileText, 
  Upload, 
  Database, 
  MessageSquare, 
  Users,
  Settings,
  BarChart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();
  const { sidebarOpen, toggleSidebar } = useApp();

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <Home size={20} />,
      roles: ['user', 'admin', 'viewer'],
    },
    {
      path: '/books',
      label: 'Books',
      icon: <FileText size={20} />,
      roles: ['user', 'admin', 'viewer'],
    },
    {
      path: '/documents',
      label: 'Documents',
      icon: <FileText size={20} />,
      roles: ['user', 'admin', 'viewer'],
    },
    {
      path: '/ingestion',
      label: 'Ingestion',
      icon: <Database size={20} />,
      roles: ['user', 'admin'],
    },
    {
      path: '/qa/ask',
      label: 'Ask Question',
      icon: <MessageSquare size={20} />,
      roles: ['user', 'admin', 'viewer'],
    },
 
  ];

  const adminItems = [
    {
      path: '/admin/users',
      label: 'Users',
      icon: <Users size={20} />,
      roles: ['admin'],
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.some(role => user?.roles?.includes(role))
  );

  const filteredAdminItems = adminItems.filter(item =>
    item.roles.some(role => user?.roles?.includes(role))
  );

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        {sidebarOpen && <h3>Navigation</h3>}
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `nav-item ${isActive ? 'active' : ''}`
              }
              end={item.path === '/dashboard'}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {filteredAdminItems.length > 0 && (
          <>
            <div className="nav-divider"></div>
            
            <div className="nav-section">
              <div className="nav-section-title">
                {sidebarOpen && <span>Admin</span>}
              </div>
              
              {filteredAdminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  {sidebarOpen && <span className="nav-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {sidebarOpen && user && (
          <div className="user-info">
            <div className="user-avatar-small">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{user.username}</div>
              <div className="user-role">{user.roles?.join(', ')}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;