import React from 'react';
import { useNavigate } from 'react-router-dom';

// Simple test component with minimal styling to test click handlers
const SimpleButtonTest = () => {
    const navigate = useNavigate();

    const handleClick = (destination) => {
        console.log(`Button clicked! Navigating to: ${destination}`);
        alert(`Button clicked! Going to: ${destination}`);
        navigate(destination);
    };

    return (
        <div style={{ padding: '20px', backgroundColor: 'white', margin: '20px' }}>
            <h2>Simple Button Test</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>

                <button
                    onClick={() => handleClick('/billing')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Go to Billing
                </button>

                <button
                    onClick={() => handleClick('/customers')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Go to Customers
                </button>

                <button
                    onClick={() => handleClick('/items')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#F59E0B',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Go to Items
                </button>

                <button
                    onClick={() => handleClick('/assignments')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#EF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Go to Assignments
                </button>

                <button
                    onClick={() => {
                        console.log('Simple alert test');
                        alert('This simple button works!');
                    }}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6B7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Test Alert Only
                </button>

            </div>
        </div>
    );
};

export default SimpleButtonTest;
