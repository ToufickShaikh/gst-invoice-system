import React from 'react';

const LoadingSpinner = ({ message = 'Loading...', size = 'default' }) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    default: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className="loading-mobile">
      <div className={`loading-spinner-mobile ${sizeClasses[size]}`}></div>
      <p className="text-sm text-gray-600 mt-2">{message}</p>
    </div>
  );
};

export default LoadingSpinner;