#!/usr/bin/env node

import fs from 'fs';

console.log('🔍 Testing Dashboard Button Navigation Setup...\n');

const dashboardFile = 'src/pages/Dashboard.jsx';
const content = fs.readFileSync(dashboardFile, 'utf8');

// Check for essential patterns
const checks = [
    {
        pattern: "import { useNavigate }",
        description: "useNavigate import"
    },
    {
        pattern: "const navigate = useNavigate()",
        description: "navigate hook initialization"
    },
    {
        pattern: "onClick={() => navigate('/billing')}",
        description: "Create Invoice navigation"
    },
    {
        pattern: "onClick={() => navigate('/customers')}",
        description: "Add Customer navigation"
    },
    {
        pattern: "onClick={() => navigate('/items')}",
        description: "Add Item navigation"
    },
    {
        pattern: "onClick={() => navigate('/invoices')}",
        description: "View Reports navigation"
    },
    {
        pattern: "onClick={() => navigate('/assignments'",
        description: "Assignment buttons navigation"
    }
];

console.log('✅ Dashboard Navigation Check:');
checks.forEach(({ pattern, description }) => {
    if (content.includes(pattern)) {
        console.log(`   ✅ ${description}: Found`);
    } else {
        console.log(`   ❌ ${description}: MISSING`);
    }
});

// Count total button instances
const buttonMatches = content.match(/<Button[^>]*>/g);
const navMatches = content.match(/onClick=\{[^}]*navigate\([^}]*\}/g);

console.log(`\n📊 Statistics:`);
console.log(`   - Total Buttons: ${buttonMatches ? buttonMatches.length : 0}`);
console.log(`   - Buttons with Navigation: ${navMatches ? navMatches.length : 0}`);

// Check if there are buttons without navigation
if (navMatches && navMatches.length > 0) {
    console.log('\n🔗 Found Navigation Patterns:');
    navMatches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match}`);
    });
}

console.log('\n🎯 Quick Actions Section Check:');
const quickActionsSection = content.match(/Quick Actions[\s\S]*?Work Assignments/);
if (quickActionsSection) {
    const section = quickActionsSection[0];
    const quickNavMatches = section.match(/onClick=\{[^}]*navigate\([^}]*\}/g);
    console.log(`   Found ${quickNavMatches ? quickNavMatches.length : 0} navigation handlers in Quick Actions`);

    if (quickNavMatches) {
        quickNavMatches.forEach((match, index) => {
            console.log(`     ${index + 1}. ${match}`);
        });
    }
} else {
    console.log('   ❌ Quick Actions section not found');
}

console.log('\n🎯 Work Assignments Section Check:');
const workAssignSection = content.match(/Work Assignments[\s\S]*?<\/div>/);
if (workAssignSection) {
    const section = workAssignSection[0];
    const assignNavMatches = section.match(/onClick=\{[^}]*navigate\([^}]*\}/g);
    console.log(`   Found ${assignNavMatches ? assignNavMatches.length : 0} navigation handlers in Work Assignments`);

    if (assignNavMatches) {
        assignNavMatches.forEach((match, index) => {
            console.log(`     ${index + 1}. ${match}`);
        });
    }
} else {
    console.log('   ❌ Work Assignments section not found');
}
