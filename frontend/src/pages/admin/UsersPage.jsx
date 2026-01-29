// src/pages/admin/UsersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  RefreshCw,
  Filter,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
  AlertCircle,
  Key
} from 'lucide-react';
import { useAdmin } from '../../store/admin.context';
import Loader from '../../components/common/Loader';
import alerts from '../../utils/alerts';
import './UsersPage.css';

function UsersPage() {
  const {
    users,
    loading,
    error,
    pagination,
    fetchAllUsers,
    updateUserRoles,
    toggleUserActiveStatus,
    searchUsers,
    loadMoreUsers,
    clearError,
    setSelectedUser
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleInput, setRoleInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Available roles
  const availableRoles = ['admin', 'user'];

  // Fetch users on mount
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Handle search
  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      await fetchAllUsers();
      return;
    }

    setIsSearching(true);
    try {
      await searchUsers(searchQuery);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, fetchAllUsers, searchUsers]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await fetchAllUsers();
    setSearchQuery('');
  }, [fetchAllUsers]);

  // Handle role update
  const handleUpdateRoles = async (userId, currentRoles) => {
    try {
      setEditingUser(userId);
      
      const result = await alerts.prompt(
        'Update User Roles',
        'Enter roles (comma-separated):',
        currentRoles?.join(', ') || '',
        'Update',
        'Cancel'
      );

      if (result.isConfirmed && result.value !== undefined) {
        const newRoles = result.value
          .split(',')
          .map(role => role.trim())
          .filter(role => role.length > 0);

        await updateUserRoles(userId, newRoles);
      }
    } catch (error) {
      console.error('Update roles error:', error);
    } finally {
      setEditingUser(null);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const result = await alerts.confirm(
        currentStatus ? 'Deactivate User' : 'Activate User',
        currentStatus 
          ? 'Are you sure you want to deactivate this user? They will not be able to login.'
          : 'Are you sure you want to activate this user?',
        currentStatus ? 'Deactivate' : 'Activate',
        'Cancel'
      );

      if (result.isConfirmed) {
        await toggleUserActiveStatus(userId);
      }
    } catch (error) {
      console.error('Toggle active error:', error);
    }
  };

  // Filter users by roles
  const filteredUsers = selectedRoles.length > 0
    ? users.filter(user => {
        const userRoles = user.roles || [];
        return selectedRoles.some(role => userRoles.includes(role));
      })
    : users;

  // Format date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Get role badge color
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedRoles([]);
    setSearchQuery('');
    fetchAllUsers();
  };

  return (
    <div className="users-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">
            <Users className="title-icon" />
            User Management
          </h1>
          <p className="page-subtitle">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="header-right">
          <button
            onClick={handleRefresh}
            className="btn-refresh"
            disabled={loading}
          >
            <RefreshCw className={`refresh-icon ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-alert">
          <AlertCircle className="error-icon" />
          <span>{error}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filters-container">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="search-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchAllUsers();
                }}
                className="clear-search"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="btn-search"
          >
            {isSearching ? <Loader2 className="animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-filters"
        >
          <Filter className="filter-icon" />
          Filters {selectedRoles.length > 0 && `(${selectedRoles.length})`}
        </button>
      </div>

      {/* Filters Dropdown */}
      {showFilters && (
        <div className="filters-dropdown">
          <div className="filters-header">
            <h3>Filter by Role</h3>
            <button onClick={clearFilters} className="btn-clear-filters">
              Clear All
            </button>
          </div>
          <div className="roles-filter">
            {availableRoles.map(role => (
              <label key={role} className="role-checkbox">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoles([...selectedRoles, role]);
                    } else {
                      setSelectedRoles(selectedRoles.filter(r => r !== role));
                    }
                  }}
                />
                <span className={`role-badge ${getRoleColor(role)}`}>
                  {role}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon-wrapper bg-blue-50">
            <Users className="stat-icon text-blue-600" />
          </div>
          <div>
            <p className="stat-value">{users.length}</p>
            <p className="stat-label">Total Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper bg-green-50">
            <CheckCircle className="stat-icon text-green-600" />
          </div>
          <div>
            <p className="stat-value">
              {users.filter(u => u.is_active).length}
            </p>
            <p className="stat-label">Active Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper bg-red-50">
            <XCircle className="stat-icon text-red-600" />
          </div>
          <div>
            <p className="stat-value">
              {users.filter(u => !u.is_active).length}
            </p>
            <p className="stat-label">Inactive Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper bg-purple-50">
            <Shield className="stat-icon text-purple-600" />
          </div>
          <div>
            <p className="stat-value">
              {users.filter(u => u.roles?.includes('admin')).length}
            </p>
            <p className="stat-label">Admins</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        {loading && !users.length ? (
          <div className="loading-overlay">
            <Loader />
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-icon" />
            <h3>No Users Found</h3>
            <p>
              {searchQuery || selectedRoles.length > 0
                ? 'Try changing your search or filters'
                : 'No users have been added yet'}
            </p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th className="table-headers">
                  <div className="header-content">
                    <UserIcon className="header-icon" />
                    User
                  </div>
                </th>
                <th className="table-headers">
                  <div className="header-content">
                    <Shield className="header-icon" />
                    Roles
                  </div>
                </th>
                <th className="table-headers">
                  <div className="header-content">
                    <Calendar className="header-icon" />
                    Created
                  </div>
                </th>
                <th className="table-headers">
                  <div className="header-content">
                    <Key className="header-icon" />
                    Status
                  </div>
                </th>
                <th className="table-headers">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id || user.user_id} className="table-row">
                  <td className="user-info-cell">
                    <div className="user-avatar-table">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="user-details">
                      <p className="user-email">{user.email}</p>
                      {user.username && (
                        <p className="user-username">@{user.username}</p>
                      )}
                      {user.full_name && (
                        <p className="user-name">{user.full_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="roles-cell">
                    <div className="roles-container">
                      {Array.isArray(user.roles) && user.roles.length > 0 ? (
                        user.roles.map(role => (
                          <span
                            key={role}
                            className={`role-tag ${getRoleColor(role)}`}
                          >
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="role-tag no-role">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="date-cell">
                    <div className="date-content">
                      <Calendar className="date-icon" />
                      <span>{formatDate(user.created_at)}</span>
                    </div>
                  </td>
                  <td className="status-cell">
                    <div className="status-content">
                      <div className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? (
                          <>
                            <CheckCircle className="status-icon" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="status-icon" />
                            Inactive
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="actions-container">
                      {/* <button
                        onClick={() => handleUpdateRoles(user.id || user.user_id, user.roles)}
                        disabled={editingUser === (user.id || user.user_id)}
                        className="action-btn edit"
                        title="Edit Roles"
                      >
                        {editingUser === (user.id || user.user_id) ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Edit />
                        )}
                      </button> */}
                      <button
                        onClick={() => handleToggleActive(user.id || user.user_id, user.is_active)}
                        className={`action-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Load More */}
        {pagination.hasMore && filteredUsers.length > 0 && (
          <div className="load-more-container">
            <button
              onClick={loadMoreUsers}
              disabled={loading}
              className="btn-load-more"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Load More ({pagination.total - users.length} more)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile View (for small screens) */}
      <div className="mobile-users-list">
        {filteredUsers.map(user => (
          <div key={user.id || user.user_id} className="mobile-user-card">
            <div className="mobile-user-header">
              <div className="mobile-user-avatar-table">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="mobile-user-info">
                <h4 className="mobile-user-email">{user.email}</h4>
                {user.full_name && (
                  <p className="mobile-user-name">{user.full_name}</p>
                )}
              </div>
              <div className={`mobile-status ${user.is_active ? 'active' : 'inactive'}`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            <div className="mobile-user-details">
              <div className="mobile-roles">
                <span className="detail-label">Roles:</span>
                <div className="mobile-roles-list">
                  {Array.isArray(user.roles) && user.roles.length > 0 ? (
                    user.roles.map(role => (
                      <span key={role} className="mobile-role-tag">
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="mobile-role-tag none">None</span>
                  )}
                </div>
              </div>
              
              <div className="mobile-date">
                <Calendar className="mobile-date-icon" />
                <span>Joined {formatDate(user.created_at)}</span>
              </div>
            </div>
            
            <div className="mobile-actions">
              {/* <button
                onClick={() => handleUpdateRoles(user.id || user.user_id, user.roles)}
                disabled={editingUser === (user.id || user.user_id)}
                className="mobile-action-btn edit"
              >
                {editingUser === (user.id || user.user_id) ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Edit />
                    Edit Roles
                  </>
                )}
              </button> */}
              <button
                onClick={() => handleToggleActive(user.id || user.user_id, user.is_active)}
                className={`mobile-action-btn ${user.is_active ? 'deactivate' : 'activate'}`}
              >
                {user.is_active ? (
                  <>
                    <EyeOff />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Eye />
                    Activate
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UsersPage;