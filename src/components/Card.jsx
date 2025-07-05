// Enhanced Card component with modern design and animations
import React, { memo } from 'react'

const Card = memo(({
  title,
  value,
  icon,
  color = 'blue',
  gradient = false,
  description,
  trend,
  onClick,
  className = '',
  children
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 hover:bg-blue-100',
      text: 'text-blue-700',
      icon: 'bg-blue-100 text-blue-600',
      gradient: 'from-blue-500 to-blue-600'
    },
    green: {
      bg: 'bg-green-50 hover:bg-green-100',
      text: 'text-green-700',
      icon: 'bg-green-100 text-green-600',
      gradient: 'from-green-500 to-green-600'
    },
    red: {
      bg: 'bg-red-50 hover:bg-red-100',
      text: 'text-red-700',
      icon: 'bg-red-100 text-red-600',
      gradient: 'from-red-500 to-red-600'
    },
    yellow: {
      bg: 'bg-yellow-50 hover:bg-yellow-100',
      text: 'text-yellow-700',
      icon: 'bg-yellow-100 text-yellow-600',
      gradient: 'from-yellow-500 to-yellow-600'
    },
    purple: {
      bg: 'bg-purple-50 hover:bg-purple-100',
      text: 'text-purple-700',
      icon: 'bg-purple-100 text-purple-600',
      gradient: 'from-purple-500 to-purple-600'
    },
    indigo: {
      bg: 'bg-indigo-50 hover:bg-indigo-100',
      text: 'text-indigo-700',
      icon: 'bg-indigo-100 text-indigo-600',
      gradient: 'from-indigo-500 to-indigo-600'
    }
  }

  const colors = colorClasses[color] || colorClasses.blue

  const baseClasses = `
    relative overflow-hidden rounded-xl shadow-md hover:shadow-xl
    transition-all duration-300 ease-in-out transform hover:scale-[1.02]
    ${onClick ? 'cursor-pointer' : ''}
    ${gradient ? `bg-gradient-to-br ${colors.gradient} text-white` : `bg-white ${colors.bg}`}
    ${className}
  `.replace(/\s+/g, ' ').trim()

  return (
    <div className={baseClasses} onClick={onClick}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${gradient ? 'text-white/80' : 'text-gray-600'
              } truncate`}>
              {title}
            </p>

            <div className="mt-2 flex items-baseline">
              <p className={`text-2xl lg:text-3xl font-bold ${gradient ? 'text-white' : colors.text
                } truncate`}>
                {value}
              </p>

              {trend && (
                <span className={`ml-2 flex items-center text-sm font-medium ${trend.direction === 'up'
                    ? gradient ? 'text-white/80' : 'text-green-600'
                    : gradient ? 'text-white/80' : 'text-red-600'
                  }`}>
                  {trend.direction === 'up' ? (
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {trend.value}
                </span>
              )}
            </div>

            {description && (
              <p className={`mt-2 text-sm ${gradient ? 'text-white/70' : 'text-gray-500'
                }`}>
                {description}
              </p>
            )}
          </div>

          {icon && (
            <div className={`flex-shrink-0 ml-4 ${gradient ? 'bg-white/20' : colors.icon
              } p-3 rounded-xl shadow-sm`}>
              <div className={`w-6 h-6 ${gradient ? 'text-white' : ''}`}>
                {icon}
              </div>
            </div>
          )}
        </div>

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-10 transition-opacity duration-300 transform -skew-x-12" />
    </div>
  )
})

Card.displayName = 'Card'

export default Card