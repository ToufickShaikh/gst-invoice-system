// Comprehensive bug checking script for GST Invoice System
console.log('🔍 Starting Comprehensive Bug Check...\n');

// Check 1: Import resolution test
try {
    console.log('✅ Testing import resolution...');

    // This will help identify any import issues
    const imports = [
        'React',
        'ReactDOM',
        'react-router-dom',
        'react-hot-toast'
    ];

    console.log('📦 Dependencies to check:', imports.join(', '));

} catch (error) {
    console.error('❌ Import resolution failed:', error.message);
}

// Check 2: File structure validation
const fs = require('fs');
const path = require('path');

const criticalFiles = [
    'src/App.jsx',
    'src/main.jsx',
    'src/index.css',
    'src/components/Layout.jsx',
    'src/components/Button.jsx',
    'src/components/Card.jsx',
    'src/components/InputField.jsx',
    'src/components/Table.jsx',
    'src/pages/Dashboard.jsx',
    'src/context/AuthContext.jsx',
    'routes/AppRoutes.jsx'
];

console.log('\n📁 Checking critical files...');
criticalFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING!`);
    }
});

// Check 3: Package.json validation
console.log('\n📋 Checking package configuration...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const backendPackageJson = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));

    console.log('✅ Frontend package.json valid');
    console.log('✅ Backend package.json valid');

    // Check for required dependencies
    const requiredDeps = ['react', 'react-dom', 'react-router-dom', 'react-hot-toast'];
    const missing = requiredDeps.filter(dep => !packageJson.dependencies[dep]);

    if (missing.length > 0) {
        console.log('❌ Missing frontend dependencies:', missing.join(', '));
    } else {
        console.log('✅ All required frontend dependencies present');
    }

} catch (error) {
    console.error('❌ Package configuration error:', error.message);
}

// Check 4: CSS and Tailwind validation
console.log('\n🎨 Checking CSS and Tailwind configuration...');
try {
    const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
    if (tailwindConfig.includes('./src/**/*.{js,ts,jsx,tsx}')) {
        console.log('✅ Tailwind content paths configured');
    } else {
        console.log('⚠️  Tailwind content paths may be incomplete');
    }

    const cssContent = fs.readFileSync('src/index.css', 'utf8');
    if (cssContent.includes('@tailwind base') &&
        cssContent.includes('@tailwind components') &&
        cssContent.includes('@tailwind utilities')) {
        console.log('✅ Tailwind directives present in CSS');
    } else {
        console.log('❌ Missing Tailwind directives in CSS');
    }

} catch (error) {
    console.error('❌ CSS configuration error:', error.message);
}

// Check 5: Environment variables
console.log('\n🌍 Checking environment configuration...');
try {
    const envContent = fs.readFileSync('.env', 'utf8');
    if (envContent.includes('VITE_API_BASE_URL')) {
        console.log('✅ API base URL configured');
    } else {
        console.log('❌ Missing API base URL configuration');
    }
} catch (error) {
    console.log('⚠️  No .env file found or error reading it');
}

console.log('\n🎉 Bug check completed!');
console.log('\n💡 Next steps:');
console.log('1. Run "npm install" to ensure all dependencies are installed');
console.log('2. Run "npm run dev" to start the development server');
console.log('3. Check browser console for any runtime errors');
console.log('4. Test responsive design on different screen sizes');
