import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import './Notification.css';

const Notification = ({ type = 'info', message, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    console.log('Notification mounted:', { type, message, isVisible });
    
    if (duration) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsHiding(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) {
    console.log('Notification not visible, returning null');
    return null;
  }

  const typeClasses = {
    success: 'notification-success',
    error: 'notification-error',
    warning: 'notification-warning',
    info: 'notification-info',
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  console.log('Rendering notification:', { type, message, isHiding });

  return (
    <div className={`notification ${typeClasses[type]} ${isHiding ? 'hiding' : ''}`}>
      <div className="notification-content">
        <span className="notification-icon">{icons[type]}</span>
        <span className="notification-message">{message}</span>
      </div>
      <button 
        className="notification-close" 
        onClick={handleClose}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Notification;