// Comprehensive Backend Status Check
const fs = require('fs');
const path = require('path');

console.log('🔍 GST Invoice System Backend Status Check');
console.log('=' * 50);

// Check 1: Environment Variables
console.log('\n1. Environment Variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('- PORT:', process.env.PORT || 'Not set (default: 3000)');
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'Set ✅' : 'Not set ❌');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set ✅' : 'Not set ❌');

// Check 2: Required Files
console.log('\n2. Required Files:');
const requiredFiles = [
    './server.js',
    './app.js',
    './package.json',
    './config/db.js',
    './models/Customer.js',
    './models/Invoice.js',
    './models/Item.js',
    './routes/authRoutes.js',
    './routes/billingRoutes.js',
    './routes/customerRoutes.js',
    './routes/itemRoutes.js',
    './routes/gstRoutes.js',
    './utils/pdfGenerator.js',
    './utils/taxHelpers.js',
    './utils/upiHelper.js',
    './templates/invoiceTemplate.html'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
    }
});

// Check 3: Package Dependencies
console.log('\n3. Package Dependencies:');
const packageJson = require('./package.json');
const requiredDeps = [
    'express',
    'cors',
    'body-parser',
    'mongoose',
    'dotenv',
    'puppeteer',
    'html-pdf-node',
    'qrcode',
    'uuid'
];

requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
        console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
        console.log(`❌ ${dep} - MISSING`);
    }
});

// Check 4: Directories
console.log('\n4. Required Directories:');
const requiredDirs = [
    './invoices',
    './templates',
    './config',
    './models',
    './routes',
    './utils',
    './controllers'
];

requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}`);
    } else {
        console.log(`❌ ${dir} - MISSING`);
        // Try to create missing directories
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   📁 Created directory: ${dir}`);
        } catch (error) {
            console.log(`   ❌ Failed to create directory: ${error.message}`);
        }
    }
});

// Check 5: Test basic imports
console.log('\n5. Testing Imports:');
try {
    require('express');
    console.log('✅ Express');
} catch (error) {
    console.log('❌ Express:', error.message);
}

try {
    require('cors');
    console.log('✅ CORS');
} catch (error) {
    console.log('❌ CORS:', error.message);
}

try {
    require('mongoose');
    console.log('✅ Mongoose');
} catch (error) {
    console.log('❌ Mongoose:', error.message);
}

try {
    require('puppeteer');
    console.log('✅ Puppeteer');
} catch (error) {
    console.log('❌ Puppeteer:', error.message);
}

// Check 6: Invoice directory contents
console.log('\n6. Invoice Directory:');
try {
    const invoiceFiles = fs.readdirSync('./invoices');
    console.log(`✅ Invoice directory contains ${invoiceFiles.length} files`);

    const pdfFiles = invoiceFiles.filter(f => f.endsWith('.pdf'));
    const htmlFiles = invoiceFiles.filter(f => f.endsWith('.html'));

    console.log(`   📄 PDF files: ${pdfFiles.length}`);
    console.log(`   📄 HTML files: ${htmlFiles.length}`);

    if (invoiceFiles.length > 0) {
        console.log(`   📋 Recent files: ${invoiceFiles.slice(-3).join(', ')}`);
    }
} catch (error) {
    console.log('❌ Invoice directory error:', error.message);
}

// Check 7: Template files
console.log('\n7. Template Files:');
try {
    const templateFiles = fs.readdirSync('./templates');
    console.log(`✅ Template directory contains ${templateFiles.length} files`);
    templateFiles.forEach(file => {
        console.log(`   📄 ${file}`);
    });
} catch (error) {
    console.log('❌ Template directory error:', error.message);
}

console.log('\n' + '=' * 50);
console.log('✅ Backend Status Check Complete');
console.log('📋 Review the results above to identify any issues.');

// Check 8: Try to start a minimal server
console.log('\n8. Testing Server Start:');
try {
    const app = require('./app');
    console.log('✅ App module loaded successfully');

    const server = app.listen(3001, () => {
        console.log('✅ Test server started on port 3001');
        console.log('🌐 Try accessing: http://localhost:3001/api/health');

        // Close server after 5 seconds
        setTimeout(() => {
            server.close(() => {
                console.log('✅ Test server stopped');
                process.exit(0);
            });
        }, 5000);
    });

    server.on('error', (error) => {
        console.log('❌ Server error:', error.message);
        process.exit(1);
    });

} catch (error) {
    console.log('❌ Failed to start server:', error.message);
    console.log('Stack trace:', error.stack);
    process.exit(1);
}
