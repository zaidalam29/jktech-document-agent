import React from 'react';
import { useAuth } from '../../store/auth.context';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.username}!</h1>
        <p>Here's what's happening with your documents today.</p>
      </div>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Documents</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Processed</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Questions Asked</h3>
          <p className="stat-number">0</p>
        </div>
      </div>
      
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-empty">
          <p>No recent activity</p>
          <p className="hint">Upload documents and ask questions to see activity here.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;