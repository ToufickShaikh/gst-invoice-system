// Optimized and reusable Button component with variants and sizes
import React, { memo, useMemo } from 'react'

const Button = memo(({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  // Memoize className computation for performance
  const computedClassName = useMemo(() => {
    const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    }
    return [
      baseStyles,
      variants[variant] || variants.primary,
      sizes[size] || sizes.md,
      disabled ? 'opacity-50 cursor-not-allowed' : '',
      className
    ].join(' ')
  }, [variant, size, disabled, className])

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={computedClassName}
    >
      {children}
    </button>
  )
})

export default Button