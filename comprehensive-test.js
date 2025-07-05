#!/usr/bin/env node

// Final comprehensive test for GST Invoice System
console.log('🔍 Running Final Comprehensive Test...\n');

const fs = require('fs');
const path = require('path');

// Test results collector
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: []
};

function test(name, condition, level = 'error') {
    if (condition) {
        console.log(`✅ ${name}`);
        results.passed++;
    } else {
        const symbol = level === 'warning' ? '⚠️ ' : '❌';
        console.log(`${symbol} ${name}`);
        results.issues.push({ name, level });
        if (level === 'warning') {
            results.warnings++;
        } else {
            results.failed++;
        }
    }
}

// Test 1: Critical files exist
console.log('📁 Testing file structure...');
const criticalFiles = [
    'package.json',
    'vite.config.js',
    'tailwind.config.js',
    'src/App.jsx',
    'src/main.jsx',
    'src/index.css',
    'src/components/Layout.jsx',
    'src/components/Button.jsx',
    'src/components/Card.jsx',
    'src/components/InputField.jsx',
    'src/components/Table.jsx',
    'src/components/Modal.jsx',
    'src/pages/Dashboard.jsx',
    'src/pages/Login.jsx',
    'src/pages/Billing.jsx',
    'src/context/AuthContext.jsx',
    'routes/AppRoutes.jsx'
];

criticalFiles.forEach(file => {
    test(`File exists: ${file}`, fs.existsSync(path.join(process.cwd(), file)));
});

// Test 2: Package.json validation
console.log('\n📦 Testing package configuration...');
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    test('Package.json is valid JSON', true);
    test('React dependency exists', pkg.dependencies && pkg.dependencies.react);
    test('React-DOM dependency exists', pkg.dependencies && pkg.dependencies['react-dom']);
    test('React Router dependency exists', pkg.dependencies && pkg.dependencies['react-router-dom']);
    test('Vite dev dependency exists', pkg.devDependencies && pkg.devDependencies.vite);
    test('Tailwind CSS dev dependency exists', pkg.devDependencies && pkg.devDependencies.tailwindcss);
    test('Dev script configured', pkg.scripts && pkg.scripts.dev);
    test('Build script configured', pkg.scripts && pkg.scripts.build);

} catch (error) {
    test('Package.json validation', false);
}

// Test 3: CSS and Tailwind
console.log('\n🎨 Testing CSS and Tailwind...');
try {
    const css = fs.readFileSync('src/index.css', 'utf8');

    test('Tailwind base directive present', css.includes('@tailwind base'));
    test('Tailwind components directive present', css.includes('@tailwind components'));
    test('Tailwind utilities directive present', css.includes('@tailwind utilities'));
    test('Custom transition-smooth class defined', css.includes('.transition-smooth'));
    test('Enhanced button classes defined', css.includes('.btn-enhanced'));
    test('Card enhanced classes defined', css.includes('.card-enhanced'));

    const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
    test('Tailwind content paths include src', tailwindConfig.includes('./src/**/*.{js,ts,jsx,tsx}'));
    test('Tailwind content paths include routes', tailwindConfig.includes('./routes/**/*.{js,ts,jsx,tsx}'));

} catch (error) {
    test('CSS configuration validation', false);
}

// Test 4: Component imports and exports
console.log('\n⚛️  Testing component structure...');
const components = [
    'src/components/Layout.jsx',
    'src/components/Button.jsx',
    'src/components/Card.jsx',
    'src/components/InputField.jsx',
    'src/components/Table.jsx'
];

components.forEach(component => {
    try {
        const content = fs.readFileSync(component, 'utf8');
        const filename = path.basename(component, '.jsx');

        test(`${filename} has default export`, content.includes('export default'));
        test(`${filename} imports React`, content.includes("import React") || content.includes("from 'react'"));
        test(`${filename} has memo wrapper`, content.includes('memo(') || content.includes('React.memo'), 'warning');

    } catch (error) {
        test(`Component validation: ${component}`, false);
    }
});

// Test 5: App structure
console.log('\n🏗️  Testing app structure...');
try {
    const app = fs.readFileSync('src/App.jsx', 'utf8');
    const main = fs.readFileSync('src/main.jsx', 'utf8');
    const routes = fs.readFileSync('routes/AppRoutes.jsx', 'utf8');

    test('App imports BrowserRouter', app.includes('BrowserRouter'));
    test('App imports AuthProvider', app.includes('AuthProvider'));
    test('App imports Toaster', app.includes('Toaster'));
    test('Main.jsx imports ReactDOM', main.includes('ReactDOM'));
    test('Main.jsx creates root', main.includes('createRoot'));
    test('Routes file imports Routes', routes.includes('Routes'));
    test('Routes file imports Route', routes.includes('Route'));

} catch (error) {
    test('App structure validation', false);
}

// Test 6: Environment and build config
console.log('\n🌍 Testing environment and build config...');
try {
    const viteConfig = fs.readFileSync('vite.config.js', 'utf8');
    test('Vite config imports React plugin', viteConfig.includes('@vitejs/plugin-react'));
    test('Vite config uses React plugin', viteConfig.includes('react()'));

    if (fs.existsSync('.env')) {
        const env = fs.readFileSync('.env', 'utf8');
        test('Environment variables file exists', true);
        test('API base URL configured', env.includes('VITE_API_BASE_URL'));
    } else {
        test('Environment file exists', false, 'warning');
    }

} catch (error) {
    test('Build configuration validation', false);
}

// Summary
console.log('\n📊 Test Summary:');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);

if (results.failed === 0 && results.warnings === 0) {
    console.log('\n🎉 All tests passed! The application should run without issues.');
    console.log('\n🚀 Next steps:');
    console.log('1. Run: npm install');
    console.log('2. Run: npm run dev');
    console.log('3. Open browser to: http://localhost:5173');
} else if (results.failed === 0) {
    console.log('\n✨ No critical issues found! Some warnings present but app should work.');
    console.log('\n🚀 Try running: npm run dev');
} else {
    console.log('\n🚨 Critical issues found! Please fix the following:');
    results.issues.filter(i => i.level !== 'warning').forEach(issue => {
        console.log(`   - ${issue.name}`);
    });
}

console.log('\n💡 If you encounter runtime errors:');
console.log('   - Check browser console (F12 → Console tab)');
console.log('   - Check terminal for build errors');
console.log('   - Verify all npm dependencies are installed');

console.log('\n✨ Test completed!');
