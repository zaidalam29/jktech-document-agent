// src/store/admin.context.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';
import adminService from '../services/admin.service';
import { useApp } from './app.context';
import logger from '../utils/logger';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const { addNotification } = useApp();

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 100,
    total: 0,
    hasMore: true
  });
  const [selectedUser, setSelectedUser] = useState(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get all users
  const fetchAllUsers = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching all users...');

      const data = await adminService.getAllUsers(params);
      console.log('Users data:', data);

      // Handle different response formats
      let usersList = [];
      let total = 0;

      if (Array.isArray(data)) {
        usersList = data;
        total = data.length;
      } else if (data?.users && Array.isArray(data.users)) {
        usersList = data.users;
        total = data.total || data.users.length;
      } else if (data?.items && Array.isArray(data.items)) {
        usersList = data.items;
        total = data.total || data.items.length;
      }

      setUsers(usersList);

      // Update pagination
      const skip = params.skip || 0;
      const limit = params.limit || 100;
      setPagination(prev => ({
        ...prev,
        skip,
        limit,
        total,
        hasMore: usersList.length === limit
      }));

      return usersList;
    } catch (error) {
      logger.error('Fetch all users error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to load users: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Update user roles
  const updateUserRoles = useCallback(async (userId, roles) => {
    try {
      setLoading(true);
      console.log(`🔄 Updating roles for user ${userId}`);

      const data = await adminService.updateUserRoles(userId, roles);
      console.log('Roles updated response:', data);

      // Update local state
      setUsers(prev => prev.map(user => {
        if (user.id === userId || user.user_id === userId) {
          return {
            ...user,
            roles: roles,
            updated_at: new Date().toISOString()
          };
        }
        return user;
      }));

      // Update selected user if it's the same
      if (selectedUser && (selectedUser.id === userId || selectedUser.user_id === userId)) {
        setSelectedUser(prev => ({
          ...prev,
          roles: roles,
          updated_at: new Date().toISOString()
        }));
      }

      addNotification({
        type: 'success',
        message: 'User roles updated successfully!'
      });

      return data;
    } catch (error) {
      logger.error('Update user roles error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to update user roles: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification, selectedUser]);

  // Toggle user active status
  const toggleUserActiveStatus = useCallback(async (userId) => {
    try {
      setLoading(true);
      console.log(`🔄 Toggling active status for user ${userId}`);

      const data = await adminService.toggleUserActiveStatus(userId);
      console.log('Toggle response:', data);

      // Find current user to get current status
      const currentUser = users.find(user => 
        user.id === userId || user.user_id === userId
      );

      if (!currentUser) {
        throw new Error('User not found in local state');
      }

      const newActiveStatus = !currentUser.is_active;

      // Update local state
      setUsers(prev => prev.map(user => {
        if (user.id === userId || user.user_id === userId) {
          return {
            ...user,
            is_active: newActiveStatus,
            updated_at: new Date().toISOString()
          };
        }
        return user;
      }));

      // Update selected user if it's the same
      if (selectedUser && (selectedUser.id === userId || selectedUser.user_id === userId)) {
        setSelectedUser(prev => ({
          ...prev,
          is_active: newActiveStatus,
          updated_at: new Date().toISOString()
        }));
      }

      addNotification({
        type: 'success',
        message: `User ${newActiveStatus ? 'activated' : 'deactivated'} successfully!`
      });

      return data;
    } catch (error) {
      logger.error('Toggle user active status error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to toggle user status: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification, users, selectedUser]);

  // Search users
  const searchUsers = useCallback(async (query) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔍 Searching users for: "${query}"`);

      const data = await adminService.searchUsers(query);
      console.log('Search results:', data);

      // Handle different response formats
      let usersList = [];
      if (Array.isArray(data)) {
        usersList = data;
      } else if (data?.users && Array.isArray(data.users)) {
        usersList = data.users;
      } else if (data?.items && Array.isArray(data.items)) {
        usersList = data.items;
      }

      setUsers(usersList);

      return usersList;
    } catch (error) {
      logger.error('Search users error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to search users: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Load more users
  const loadMoreUsers = useCallback(async () => {
    try {
      if (!pagination.hasMore) return;

      const newSkip = pagination.skip + pagination.limit;
      const data = await fetchAllUsers({
        skip: newSkip,
        limit: pagination.limit
      });

      setUsers(prev => [...prev, ...data]);
    } catch (error) {
      logger.error('Load more users error:', error);
      throw error;
    }
  }, [pagination, fetchAllUsers]);

  // Clear users list
  const clearUsers = useCallback(() => {
    setUsers([]);
    setPagination({
      skip: 0,
      limit: 100,
      total: 0,
      hasMore: true
    });
  }, []);

  // Context value
  const value = {
    // State
    users,
    loading,
    error,
    pagination,
    selectedUser,

    // Actions
    fetchAllUsers,
    updateUserRoles,
    toggleUserActiveStatus,
    searchUsers,
    loadMoreUsers,
    clearUsers,

    // Setters
    setSelectedUser,
    clearError,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};