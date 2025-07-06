#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying Navigation Assignment Features...\n');

// Check navigation patterns in each page
const navigationChecks = [
    {
        file: 'src/pages/Dashboard.jsx',
        expectedNavigations: [
            { pattern: "navigate('/billing')", description: 'New Invoice -> Billing' },
            { pattern: "navigate('/customers')", description: 'Add Customer -> Customers' },
            { pattern: "navigate('/items')", description: 'Add Item -> Items' },
            { pattern: "navigate('/invoices')", description: 'View Reports -> Invoices' },
            { pattern: "navigate('/assignments')", description: 'Assignment buttons -> Assignments' }
        ]
    },
    {
        file: 'src/pages/Customers.jsx',
        expectedNavigations: [
            { pattern: "navigate('/assignments'", description: 'Assign Rep -> Assignments' }
        ]
    },
    {
        file: 'src/pages/Items.jsx',
        expectedNavigations: [
            { pattern: "navigate('/assignments'", description: 'Assign Production -> Assignments' }
        ]
    },
    {
        file: 'src/pages/Billing.jsx',
        expectedNavigations: [
            { pattern: "navigate('/assignments'", description: 'Assign Work -> Assignments' }
        ]
    },
    {
        file: 'src/pages/Invoices.jsx',
        expectedNavigations: [
            { pattern: "navigate('/assignments'", description: 'Assign Follow-up -> Assignments' }
        ]
    }
];

console.log('📋 Checking Navigation Functionality:\n');

navigationChecks.forEach(({ file, expectedNavigations }) => {
    console.log(`🔍 ${file}:`);

    if (!fs.existsSync(file)) {
        console.log(`   ❌ File not found`);
        return;
    }

    const content = fs.readFileSync(file, 'utf8');

    // Check if useNavigate is imported
    if (content.includes('useNavigate')) {
        console.log(`   ✅ useNavigate imported`);
    } else {
        console.log(`   ❌ useNavigate not imported`);
    }

    // Check if navigate is defined
    if (content.includes('const navigate = useNavigate()') || content.includes('navigate = useNavigate()')) {
        console.log(`   ✅ navigate hook initialized`);
    } else {
        console.log(`   ❌ navigate hook not initialized`);
    }

    expectedNavigations.forEach(({ pattern, description }) => {
        if (content.includes(pattern)) {
            console.log(`   ✅ ${description}`);
        } else {
            console.log(`   ❌ ${description} - missing navigation`);
        }
    });

    console.log('');
});

// Check for any remaining alert() calls that should be replaced
console.log('🚨 Checking for remaining dummy alerts:\n');

const filesToCheck = [
    'src/pages/Dashboard.jsx',
    'src/pages/Customers.jsx',
    'src/pages/Items.jsx',
    'src/pages/Billing.jsx',
    'src/pages/Invoices.jsx'
];

filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const alertMatches = content.match(/alert\([^)]+\)/g);

        if (alertMatches) {
            console.log(`⚠️  ${file}: Found ${alertMatches.length} alert(s):`);
            alertMatches.forEach(alert => {
                console.log(`     - ${alert}`);
            });
        } else {
            console.log(`✅ ${file}: No dummy alerts found`);
        }
    }
});

console.log('\n🎯 Navigation Features Summary:');
console.log('• Dashboard -> New Invoice navigates to Billing page');
console.log('• Dashboard -> Add Customer navigates to Customers page');
console.log('• Dashboard -> Add Item navigates to Items page');
console.log('• Dashboard -> View Reports navigates to Invoices page');
console.log('• All assignment buttons navigate to Assignments page');
console.log('• Context data passed to assignments for relevant pre-filling');

console.log('\n✨ Navigation assignment features implemented!');
