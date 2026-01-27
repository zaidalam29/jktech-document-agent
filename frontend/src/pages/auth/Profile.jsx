import React, { useState } from 'react';
import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { addNotification } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateUser(formData);
      addNotification({
        type: 'success',
        message: 'Profile updated successfully!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Loader />;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account settings</p>
      </div>
      
      <div className="profile-content">
        <div className="profile-info">
          <div className="info-card">
            <h3>Account Information</h3>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Role:</strong> {user.role || 'User'}</p>
            <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <h3>Update Profile</h3>
          
          <div className="form-grid">
            <Input
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
            />
            
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
            />
            
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
            />
          </div>
          
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? <Loader size="small" /> : 'Save Changes'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;