import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import alerts from '../../utils/alerts';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addNotification } = useApp();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    const loadingAlert = alerts.loading('Logging in...');
    
    try {
      const result = await login(formData.username, formData.password);
      
      alerts.close();
      
      if (result.success) {
        // Show success alert
        await alerts.success('Login Successful', 'Redirecting to dashboard...');
        
        // Also show notification
        addNotification({
          type: 'success',
          message: 'Welcome back!',
        });
        
        navigate('/dashboard', { replace: true });
      } else {
        // Show error alert
        await alerts.error('Login Failed', result.error || 'Invalid credentials');
        
        addNotification({
          type: 'error',
          message: 'Login failed. Please try again.',
        });
        
        // Clear password field on error
        setFormData(prev => ({ ...prev, password: '' }));
      }
      
    } catch (error) {
      alerts.close();
      
      // Handle different types of errors
      let errorTitle = 'Login Error';
      let errorMessage = error.message;
      
      if (error.message.includes('CORS') || error.message.includes('Network')) {
        errorTitle = 'Connection Error';
        errorMessage = 'Cannot connect to server. Please check: 1) Backend is running, 2) CORS is enabled, 3) Try Chrome with --disable-web-security';
      } else if (error.message.includes('401') || error.message.includes('Invalid')) {
        errorTitle = 'Invalid Credentials';
        errorMessage = 'Please check your username and password';
      } else if (error.message.includes('500')) {
        errorTitle = 'Server Error';
        errorMessage = 'Server encountered an error. Please try again later.';
      }
      
      await alerts.error(errorTitle, errorMessage);
      
      addNotification({
        type: 'error',
        message: errorMessage,
      });
      
      // Clear password on any error
      setFormData(prev => ({ ...prev, password: '' }));
      
    } finally {
      setLoading(false);
    }
  };

  // Demo credentials for testing
  const fillDemoCredentials = () => {
    setFormData({
      username: 'demo_user',
      password: 'demo123',
    });
    
    alerts.info('Demo Credentials', 'Demo credentials filled. Click Login to test.');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Login</h1>
          <p>Sign in to your account to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <Input
              label="Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              placeholder="Enter your username"
              required
              autoFocus
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-options">
            <label className="checkbox">
              <input 
                type="checkbox" 
                disabled={loading}
              />
              Remember me
            </label>
           
          </div>
          
          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            disabled={loading}
            loading={loading}
            className="login-button"
          >
            Sign In
          </Button>
          
          {/* Demo button for testing */}
          {/* <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={fillDemoCredentials}
            className="demo-button"
            disabled={loading}
          >
            Fill Demo Credentials
          </Button> */}
          
          {/* <div className="divider">
            <span>OR</span>
          </div> */}
          
          <div className="register-link">
            <span>Don't have an account?</span>
            <Link to="/register" className="register-button">
              Create New Account
            </Link>
          </div>
        </form>
        
        
      </div>
    </div>
  );
};

export default Login;