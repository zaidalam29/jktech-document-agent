import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const Unauthorized = () => {
  return (
    <div className="unauthorized-page">
      <div className="unauthorized-content">
        <div className="status-code">403</div>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <div className="actions">
          <Link to="/dashboard">
            <Button variant="primary">
              Go to Dashboard
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;