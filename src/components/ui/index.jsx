import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { components } from '../styles/designSystem';

/**
 * Advanced Button Component with animations and multiple variants
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  animate = true,
  className = '',
  ...props
}, ref) => {
  const baseClasses = components.button.base;
  const variantClasses = components.button.variants[variant];
  const sizeClasses = components.button.sizes[size];
  
  const buttonClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className} ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`;

  const ButtonComponent = animate ? motion.button : 'button';
  
  const motionProps = animate ? {
    whileHover: disabled ? {} : { scale: 1.02 },
    whileTap: disabled ? {} : { scale: 0.98 },
    transition: { duration: 0.15 }
  } : {};

  return (
    <ButtonComponent
      ref={ref}
      className={buttonClasses}
      disabled={disabled || loading}
      {...motionProps}
      {...props}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          Loading...
        </div>
      ) : (
        <div className="flex items-center">
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </div>
      )}
    </ButtonComponent>
  );
});

Button.displayName = 'Button';

/**
 * Advanced Input Component with validation states
 */
export const Input = forwardRef(({
  label,
  error,
  helperText,
  variant = 'default',
  size = 'md', 
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  const baseClasses = components.input.base;
  const variantClasses = components.input.variants[error ? 'error' : variant];
  const sizeClasses = components.input.sizes[size];
  
  const inputClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${
    leftIcon ? 'pl-10' : ''
  } ${rightIcon ? 'pr-10' : ''} ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{leftIcon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-gray-400">{rightIcon}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Advanced Card Component
 */
export const Card = ({ 
  children, 
  variant = 'default', 
  padding = true,
  animate = true,
  className = '',
  ...props 
}) => {
  const baseClasses = components.card.base;
  const variantClasses = components.card.variants[variant];
  
  const cardClasses = `${baseClasses} ${variantClasses} ${
    padding ? 'p-6' : ''
  } ${className}`;

  const CardComponent = animate ? motion.div : 'div';
  
  const motionProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  } : {};

  return (
    <CardComponent
      className={cardClasses}
      {...motionProps}
      {...props}
    >
      {children}
    </CardComponent>
  );
};

/**
 * Advanced Badge Component
 */
export const Badge = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = components.badge.base;
  const variantClasses = components.badge.variants[variant];
  
  const badgeClasses = `${baseClasses} ${variantClasses} ${className}`;

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

/**
 * Advanced Modal Component
 */
export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  animate = true 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const overlayVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 }
  };

  const modalVariants = {
    closed: { opacity: 0, scale: 0.95, y: -20 },
    open: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <motion.div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          variants={animate ? overlayVariants : {}}
          initial="closed"
          animate="open"
          exit="closed"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <motion.div
          className={`inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:p-6 ${sizeClasses[size]} w-full`}
          variants={animate ? modalVariants : {}}
          initial="closed"
          animate="open"
          exit="closed"
        >
          {title && (
            <div className="mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
            </div>
          )}
          
          {children}
        </motion.div>
      </div>
    </div>
  );
};

/**
 * Advanced Loading Spinner
 */
export const LoadingSpinner = ({ size = 'md', color = 'primary' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const colorClasses = {
    primary: 'border-primary-600',
    white: 'border-white',
    gray: 'border-gray-600'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`} />
  );
};

/**
 * Advanced Select Component
 */
export const Select = forwardRef(({
  label,
  options = [],
  error,
  helperText,
  placeholder = 'Select option...',
  className = '',
  ...props
}, ref) => {
  const baseClasses = components.input.base;
  const variantClasses = components.input.variants[error ? 'error' : 'default'];
  
  const selectClasses = `${baseClasses} ${variantClasses} ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <select
        ref={ref}
        className={selectClasses}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Button;
