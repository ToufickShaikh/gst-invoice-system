// Simplified Button component for debugging
import React, { useMemo } from 'react'

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {

  // Enhanced click handler with debugging
  const handleClick = (e) => {
    console.log('Button clicked!', { disabled, loading, onClick: !!onClick });
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  // Memoize className computation for performance
  const computedClassName = useMemo(() => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded-lg sm:rounded-xl
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      transform hover:scale-[1.02] active:scale-[0.98]
      relative overflow-hidden touch-target
      ${fullWidth ? 'w-full' : ''}
    `.replace(/\s+/g, ' ').trim()

    const variants = {
      primary: `
        bg-gradient-to-r from-yellow-500 to-yellow-600 text-white 
        hover:from-yellow-600 hover:to-yellow-700 
        focus:ring-yellow-500 shadow-md sm:shadow-lg hover:shadow-xl
      `,
      secondary: `
        bg-white text-gray-700 border border-gray-200 sm:border-2
        hover:bg-gray-50 hover:border-gray-300
        focus:ring-gray-500 shadow-sm sm:shadow-md hover:shadow-lg
      `,
      danger: `
        bg-gradient-to-r from-red-500 to-red-600 text-white
        hover:from-red-600 hover:to-red-700
        focus:ring-red-500 shadow-md sm:shadow-lg hover:shadow-xl
      `,
      success: `
        bg-gradient-to-r from-green-500 to-green-600 text-white
        hover:from-green-600 hover:to-green-700
        focus:ring-green-500 shadow-md sm:shadow-lg hover:shadow-xl
      `,
      outline: `
        bg-transparent border border-yellow-500 sm:border-2 text-yellow-600
        hover:bg-yellow-500 hover:text-white
        focus:ring-yellow-500
      `,
      ghost: `
        bg-transparent text-gray-600 hover:bg-gray-100
        focus:ring-gray-500
      `,
      link: `
        bg-transparent text-yellow-600 hover:text-yellow-700
        underline-offset-4 hover:underline focus:ring-yellow-500
      `
    }

    const sizes = {
      xs: 'px-2 py-1.5 text-xs min-h-[36px] sm:px-2.5 sm:min-h-[32px]',
      sm: 'px-3 py-2 text-sm min-h-[40px] sm:min-h-[36px]',
      md: 'px-4 py-2.5 text-sm sm:text-base min-h-[44px]',
      lg: 'px-5 py-3 text-base sm:text-lg min-h-[48px] sm:px-6',
      xl: 'px-6 py-4 text-lg sm:text-xl min-h-[52px] sm:px-8 sm:min-h-[56px]'
    }

    return [
      baseStyles,
      variants[variant] || variants.primary,
      sizes[size] || sizes.md,
      className
    ].join(' ').replace(/\s+/g, ' ').trim()
  }, [variant, size, disabled, fullWidth, className])

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={computedClassName}
      style={{
        pointerEvents: 'auto',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        zIndex: 1
      }}
      {...props}
    >
      {/* Simplified content without overlapping spans */}
      <div className="flex items-center justify-center space-x-2">
        {loading && <LoadingSpinner />}
        {leftIcon && !loading && <span className="flex-shrink-0">{leftIcon}</span>}
        <span className={loading ? 'opacity-75' : ''}>{children}</span>
        {rightIcon && !loading && <span className="flex-shrink-0">{rightIcon}</span>}
      </div>
    </button>
  )
}

export default Button