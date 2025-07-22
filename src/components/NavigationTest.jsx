import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

// Simple test component to verify navigation is working
const NavigationTest = () => {
    const navigate = useNavigate();

    const testNavigation = (path) => {
        console.log(`Attempting to navigate to: ${path}`);
        try {
            navigate(path);
            console.log(`Navigation successful to: ${path}`);
        } catch (error) {
            console.error(`Navigation failed to ${path}:`, error);
        }
    };

    return (
        <div className="p-8 space-y-4">
            <h2 className="text-2xl font-bold">Navigation Test</h2>

            <div className="grid grid-cols-2 gap-4">
                <Button
                    onClick={() => testNavigation('/billing')}
                    variant="primary"
                >
                    Test: Go to Billing
                </Button>

                <Button
                    onClick={() => testNavigation('/customers')}
                    variant="secondary"
                >
                    Test: Go to Customers
                </Button>

                <Button
                    onClick={() => testNavigation('/items')}
                    variant="success"
                >
                    Test: Go to Items
                </Button>

                <Button
                    onClick={() => testNavigation('/invoices')}
                    variant="danger"
                >
                    Test: Go to Invoices
                </Button>

                <Button
                    onClick={() => testNavigation('/assignments')}
                    variant="primary"
                >
                    Test: Go to Assignments
                </Button>

                <Button
                    onClick={() => {
                        console.log('Simple alert test');
                        alert('This button works!');
                    }}
                    variant="outline"
                >
                    Test: Alert
                </Button>
            </div>

            <div className="mt-8">
                <p className="text-sm text-gray-600">
                    Check browser console for navigation logs.
                </p>
            </div>
        </div>
    );
};

export default NavigationTest;
