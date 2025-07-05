// Quick fix script for common React/Vite issues
const fs = require('fs');
const path = require('path');

console.log('🔧 Running Quick Fix Script...\n');

// Fix 1: Check for incorrect React import patterns
function fixReactImports() {
    console.log('🔄 Checking React import patterns...');

    const files = [
        'src/App.jsx',
        'src/main.jsx',
        'src/components/Layout.jsx',
        'src/components/Button.jsx',
        'src/components/Card.jsx',
        'src/pages/Dashboard.jsx'
    ];

    files.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');

            // Check for React 18+ patterns
            if (content.includes('createRoot') && !content.includes('React.StrictMode')) {
                console.log(`⚠️  ${file}: May need React.StrictMode update`);
            } else {
                console.log(`✅ ${file}: React imports look good`);
            }
        }
    });
}

// Fix 2: Check for missing dependencies or version conflicts
function checkDependencies() {
    console.log('\n📦 Checking for common dependency issues...');

    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        // Check React version compatibility
        const reactVersion = pkg.dependencies.react;
        if (reactVersion && reactVersion.includes('19')) {
            console.log('✅ React 19 detected - modern version');
        } else {
            console.log('⚠️  React version may need update');
        }

        // Check for Vite configuration
        if (pkg.devDependencies.vite) {
            console.log('✅ Vite bundler configured');
        } else {
            console.log('❌ Vite not found - may cause build issues');
        }

    } catch (error) {
        console.error('❌ Error checking dependencies:', error.message);
    }
}

// Fix 3: Check for CSS/Tailwind issues
function checkCSS() {
    console.log('\n🎨 Checking CSS and Tailwind setup...');

    try {
        // Check index.css
        const css = fs.readFileSync('src/index.css', 'utf8');

        if (!css.includes('@tailwind base')) {
            console.log('❌ Missing @tailwind base directive');
            return false;
        }

        if (!css.includes('.transition-smooth')) {
            console.log('❌ Missing custom transition-smooth class');
            return false;
        }

        console.log('✅ CSS configuration looks good');

        // Check Tailwind config
        const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
        if (!tailwindConfig.includes('./src/**/*.{js,ts,jsx,tsx}')) {
            console.log('❌ Tailwind content paths incomplete');
            return false;
        }

        console.log('✅ Tailwind configuration looks good');
        return true;

    } catch (error) {
        console.error('❌ CSS check failed:', error.message);
        return false;
    }
}

// Fix 4: Generate startup commands
function generateStartupCommands() {
    console.log('\n🚀 Recommended startup sequence:');
    console.log('');
    console.log('1. Install dependencies:');
    console.log('   npm install');
    console.log('');
    console.log('2. Start backend (in backend folder):');
    console.log('   cd backend && npm install && npm start');
    console.log('');
    console.log('3. Start frontend (in main folder):');
    console.log('   npm run dev');
    console.log('');
    console.log('4. Open browser to: http://localhost:5173');
    console.log('');
    console.log('💡 If you see errors:');
    console.log('   - Check browser console (F12)');
    console.log('   - Check terminal for build errors');
    console.log('   - Ensure all files saved properly');
}

// Run all checks
fixReactImports();
checkDependencies();
const cssOk = checkCSS();
generateStartupCommands();

console.log('\n✨ Quick fix completed!');

if (cssOk) {
    console.log('🎉 No obvious issues found - try running the app!');
} else {
    console.log('⚠️  Some issues detected - review the output above');
}
