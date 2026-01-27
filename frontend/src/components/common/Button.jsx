import React from 'react';
// import './Button.css';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) => {
  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={`
        btn 
        btn-${variant} 
        btn-${size} 
        ${fullWidth ? 'btn-fullwidth' : ''} 
        ${disabled ? 'btn-disabled' : ''} 
        ${loading ? 'btn-loading' : ''} 
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="btn-loader">
          <div className="btn-spinner"></div>
        </span>
      )}
      <span className="btn-content">{children}</span>
    </button>
  );
};

export default Button;