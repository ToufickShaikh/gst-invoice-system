// Enhanced InputField component with modern design and accessibility
import React, { memo, forwardRef, useState } from 'react'

const InputField = memo(forwardRef(({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  leftIcon,
  rightIcon,
  helpText,
  variant = 'default',
  size = 'md',
  onRightIconClick,
  autoComplete,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const variants = {
    default: 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-500',
    filled: 'bg-gray-50 border-gray-200 focus:bg-white focus:border-yellow-500 focus:ring-yellow-500',
    underlined: 'border-0 border-b-2 border-gray-300 rounded-none focus:border-yellow-500 focus:ring-0 bg-transparent'
  }

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-3 text-base min-h-[44px]',
    lg: 'px-5 py-4 text-lg min-h-[52px]'
  }

  const inputClasses = `
    w-full rounded-lg border transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
    ${variants[variant]}
    ${sizes[size]}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${leftIcon ? 'pl-11' : ''}
    ${rightIcon || type === 'password' ? 'pr-11' : ''}
    ${focused ? 'transform scale-[1.01]' : ''}
  `.replace(/\s+/g, ' ').trim()

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword)
  }

  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className="mb-4 group">
      {label && (
        <label
          htmlFor={name}
          className={`block text-sm font-medium mb-2 transition-colors duration-200 ${error ? 'text-red-700' : focused ? 'text-yellow-600' : 'text-gray-700'
            }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            <div className="w-5 h-5">
              {leftIcon}
            </div>
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          type={inputType}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={inputClasses}
          {...props}
        />

        {/* Right Icon or Password Toggle */}
        {(rightIcon || type === 'password') && (
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none"
            onClick={type === 'password' ? handlePasswordToggle : onRightIconClick}
            tabIndex={-1}
          >
            <div className="w-5 h-5">
              {type === 'password' ? (
                showPassword ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )
              ) : (
                rightIcon
              )}
            </div>
          </button>
        )}

        {/* Focus Ring Effect */}
        <div className={`absolute inset-0 rounded-lg pointer-events-none transition-all duration-200 ${focused && !error ? 'ring-2 ring-yellow-500/20 ring-offset-2' : ''
          }`} />
      </div>

      {/* Help Text */}
      {helpText && !error && (
        <p className="mt-2 text-sm text-gray-500">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}))

InputField.displayName = 'InputField'

export default InputField