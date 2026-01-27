import React from 'react';
// import './Loader.css';

const Loader = ({ size = 'medium', color = 'primary', text, fullPage = false }) => {
  const sizeClasses = {
    small: 'loader-small',
    medium: 'loader-medium',
    large: 'loader-large',
  };

  const colorClasses = {
    primary: 'loader-primary',
    secondary: 'loader-secondary',
    white: 'loader-white',
    dark: 'loader-dark',
  };

  const loader = (
    <div className={`loader ${sizeClasses[size]} ${colorClasses[color]}`}>
      <div className="loader-spinner"></div>
      {text && <div className="loader-text">{text}</div>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="loader-fullpage">
        {loader}
      </div>
    );
  }

  return loader;
};

export default Loader;