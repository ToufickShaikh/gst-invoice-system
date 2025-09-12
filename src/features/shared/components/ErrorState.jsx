import React from 'react';

const ErrorState = ({ 
  title = 'Something went wrong', 
  message, 
  onRetry, 
  className = '' 
}) => {
  return (
    <div className={`card-enhanced ${className}`}>
      <div className="empty-state-mobile">
        <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-4">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-enhanced btn-primary">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;