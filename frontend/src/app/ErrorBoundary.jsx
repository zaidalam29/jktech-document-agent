import React from 'react';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error tracking service
    logger.error('React Error Boundary:', {
      error: error.toString(),
      stack: errorInfo.componentStack,
    });
    
    // Send to Sentry or other monitoring service
    // if (window.Sentry) {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null 
    });
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h1>⚠️ Something went wrong</h1>
            <p>We're sorry for the inconvenience. Please try the following:</p>
            
            <div className="error-actions">
              <button onClick={this.handleReload} className="btn-primary">
                Reload Page
              </button>
              <button onClick={this.handleReset} className="btn-secondary">
                Go to Home
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="error-details">
                <h3>Error Details (Development Only):</h3>
                <pre>{this.state.error && this.state.error.toString()}</pre>
                <details>
                  <summary>Stack Trace</summary>
                  <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;