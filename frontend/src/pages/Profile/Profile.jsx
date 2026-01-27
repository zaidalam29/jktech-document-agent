// src/pages/profile/Profile.jsx - UPDATED VERSION
import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/app.context';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import authService from '../../services/auth.service'; // ✅ DIRECT IMPORT
import './Profile.css';

const Profile = () => {
  const { addNotification } = useApp();
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching profile data...');
        
        // ✅ DIRECT CALL TO authService.getUserDetails
        const details = await authService.getUserDetails();
        
        if (!details) {
          throw new Error('No user data received');
        }
        
        console.log('✅ Profile data loaded:', details);
        setUserDetails(details);
        
      } catch (error) {
        console.error('❌ Error loading profile:', error);
        setError(error.message);
        addNotification({
          type: 'error',
          message: `Failed to load profile: ${error.message}`
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [addNotification]);

  // ... rest of the component remains the same ...

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            <div className="avatar-large">
              {userDetails?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2>{userDetails?.username || 'User'}</h2>
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-section">
            <h3>Account Information</h3>
            
            <div className="detail-row">
              <span className="detail-label">User ID:</span>
              <span className="detail-value">{userDetails?.id || 'N/A'}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Account Status:</span>
              <span className={`detail-value status-${userDetails?.is_active ? 'active' : 'inactive'}`}>
                {userDetails?.is_active ? '🟢 Active' : '🔴 Inactive'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Member Since:</span>
              <span className="detail-value">
                {userDetails?.created_at ? 
                  new Date(userDetails.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 
                  'N/A'}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Roles & Permissions</h3>
            
            <div className="detail-row">
              <span className="detail-label">Roles:</span>
              <div className="roles-container">
                {Array.isArray(userDetails?.roles) && userDetails.roles.length > 0 ? (
                  userDetails.roles.map((role, index) => (
                    <span key={index} className={`role-badge role-${role}`}>
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="role-badge role-user">user</span>
                )}
              </div>
            </div>
          </div>

          {userDetails?.updated_at && (
            <div className="detail-section">
              <div className="detail-row">
                <span className="detail-label">Last Updated:</span>
                <span className="detail-value">
                  {new Date(userDetails.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <div className="action-buttons">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="back-button"
            >
              ← Back to Dashboard
            </Button>
            
            {/* <Button 
              variant="primary"
              onClick={() => {
                addNotification({
                  type: 'info',
                  message: 'Edit profile functionality coming soon!'
                });
              }}
              className="edit-button"
            >
              Edit Profile
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;