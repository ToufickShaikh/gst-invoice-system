import React from 'react'

const Loader = ({ size = 'md', color = 'blue' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const colors = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white'
  }

  return (
    <div className="flex justify-center">
      <div
        className={`animate-spin rounded-full border-b-2 ${sizes[size]} ${colors[color]}`}
      />
    </div>
  )
}

export default Loader