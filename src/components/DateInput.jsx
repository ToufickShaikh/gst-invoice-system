import React from 'react';

// Simple date input component specifically for date pickers
const DateInput = ({
    label,
    name,
    value,
    onChange,
    required = false,
    disabled = false,
    className = '',
    ...props
}) => {
    
    // Enhanced onChange handler
    const handleChange = (e) => {
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label
                    htmlFor={name}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <input
                type="date"
                id={name}
                name={name}
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className={`
          w-full px-4 py-3 text-base
          border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
          transition-all duration-200 ease-in-out
          min-h-[44px]
          ${className}
        `.replace(/\s+/g, ' ').trim()}
                style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    colorScheme: 'light' // Ensures proper calendar styling
                }}
                {...props}
            />
        </div>
    );
};

export default DateInput;
