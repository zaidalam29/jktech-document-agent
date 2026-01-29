import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import alerts from '../../utils/alerts';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addNotification } = useApp();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 20) {
      newErrors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 50) {
      newErrors.password = 'Password must be less than 50 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    const loadingAlert = alerts.loading('Creating your account...');

    try {
      const result = await register(formData.username, formData.password);

      alerts.close();

      if (result.success) {
        // Check for both result.user and result.success
        console.log('Registration result:', result);

        // Show success alert
        await alerts.success(
          'Registration Successful!',
          'Your account has been created. Welcome to Document QA System!'
        );

        addNotification({
          type: 'success',
          message: 'Welcome to Document QA!',
        });

        // Directly navigate to dashboard (result.user might be undefined)
        // Because we store user in localStorage anyway
        navigate('/dashboard', { replace: true });

      } else {
        await alerts.error('Registration Failed', result.error || 'Registration failed');

        addNotification({
          type: 'error',
          message: 'Registration failed. Please try again.',
        });
      }

    } catch (error) {
      alerts.close();

      let errorTitle = 'Registration Error';
      let errorMessage = error.message;

      if (error.message.includes('already exists')) {
        errorTitle = 'Username Taken';
        errorMessage = 'This username is already taken. Please choose another one.';
      } else if (error.message.includes('CORS') || error.message.includes('Network')) {
        errorTitle = 'Connection Error';
        errorMessage = 'Cannot connect to server. Please check backend is running.';
      } else if (error.message.includes('500')) {
        errorTitle = 'Server Error';
        errorMessage = 'Server encountered an error. Please try again later.';
      }

      await alerts.error(errorTitle, errorMessage);

      addNotification({
        type: 'error',
        message: errorMessage,
      });

      // Clear passwords on error
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));

    } finally {
      setLoading(false);
    }
  };

  const showTerms = () => {
    alerts.fire({
      title: 'Terms and Conditions',
      html: `
        <div style="text-align: left; max-height: 300px; overflow-y: auto; padding: 10px;">
          <h4>1. Acceptance of Terms</h4>
          <p>By using Document QA System, you agree to these terms.</p>
          
          <h4>2. User Account</h4>
          <p>You are responsible for maintaining the confidentiality of your account.</p>
          
          <h4>3. Acceptable Use</h4>
          <p>You agree not to use the service for any illegal purpose.</p>
          
          <h4>4. Privacy</h4>
          <p>We respect your privacy and protect your personal information.</p>
          
          <h4>5. Termination</h4>
          <p>We reserve the right to terminate accounts that violate these terms.</p>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'I Understand',
      confirmButtonColor: '#667eea',
    });
  };

  const showPrivacy = () => {
    alerts.fire({
      title: 'Privacy Policy',
      html: `
        <div style="text-align: left; max-height: 300px; overflow-y: auto; padding: 10px;">
          <h4>1. Information Collection</h4>
          <p>We collect only necessary information for account creation and service provision.</p>
          
          <h4>2. Data Usage</h4>
          <p>Your data is used solely to provide and improve our services.</p>
          
          <h4>3. Data Protection</h4>
          <p>We implement security measures to protect your information.</p>
          
          <h4>4. Cookies</h4>
          <p>We use cookies to enhance user experience.</p>
          
          <h4>5. Third Parties</h4>
          <p>We do not sell or share your personal information with third parties.</p>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'I Understand',
      confirmButtonColor: '#667eea',
    });
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join our platform to manage your documents</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <Input
              label="Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              placeholder="Choose a username"
              required
              autoFocus
              disabled={loading}
              helperText="3-20 characters, letters, numbers, and underscores only"
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
              placeholder="Create a strong password"
              required
              disabled={loading}
              helperText="Minimum 6 characters"
            />
          </div>

          <div className="form-group">
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="Re-enter your password"
              required
              disabled={loading}
            />
          </div>

          <div className="form-terms">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={loading}
              />
              <span>
                I agree...
                
                
              </span>
            </label>
            {errors.terms && (
              <div className="error-text">{errors.terms}</div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            disabled={loading || !termsAccepted}
            loading={loading}
            className="register-button"
          >
            Create Account
          </Button>

          <div className="login-link">
            <span>Already have an account?</span>
            <Link to="/login" className="login-button">
              Sign In
            </Link>
          </div>
        </form>


      </div>
    </div>
  );
};

export default Register;