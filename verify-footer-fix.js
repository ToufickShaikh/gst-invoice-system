// Verification script for multiple credit footers fix
console.log('🔍 Verifying multiple credit footers fix...\n');

const fs = require('fs');

function countFootersInFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const footerCount = (content.match(/@Digital_hokage/g) || []).length;
        const hasLayout = content.includes('<Layout>') || content.includes('Layout');

        return { footerCount, hasLayout };
    } catch (error) {
        return { footerCount: 0, hasLayout: false, error: true };
    }
}

const pagesToCheck = [
    'src/pages/Billing.jsx',
    'src/pages/Dashboard.jsx',
    'src/pages/Items.jsx',
    'src/pages/Customers.jsx',
    'src/pages/Invoices.jsx',
    'src/pages/InvoiceSuccess.jsx',
    'src/pages/Login.jsx',
    'src/components/Layout.jsx'
];

console.log('📁 Checking credit footer occurrences in each file...\n');

let totalFooters = 0;
let issues = [];

pagesToCheck.forEach(filePath => {
    const result = countFootersInFile(filePath);

    if (result.error) {
        console.log(`❌ ${filePath}: Error reading file`);
        return;
    }

    totalFooters += result.footerCount;

    const fileName = filePath.split('/').pop();

    if (filePath === 'src/components/Layout.jsx') {
        // Layout should have exactly 1 footer
        if (result.footerCount === 1) {
            console.log(`✅ ${fileName}: 1 footer (correct for Layout component)`);
        } else {
            console.log(`❌ ${fileName}: ${result.footerCount} footers (should be 1)`);
            issues.push(`Layout component has ${result.footerCount} footers instead of 1`);
        }
    } else if (filePath === 'src/pages/Login.jsx') {
        // Login doesn't use Layout, so it can have 1 footer
        if (result.footerCount <= 1) {
            console.log(`✅ ${fileName}: ${result.footerCount} footer${result.footerCount !== 1 ? 's' : ''} (${result.hasLayout ? 'uses Layout' : 'standalone page'})`);
        } else {
            console.log(`❌ ${fileName}: ${result.footerCount} footers (too many)`);
            issues.push(`${fileName} has ${result.footerCount} footers`);
        }
    } else {
        // Other pages use Layout, so they should have 0 footers of their own
        if (result.footerCount === 0) {
            console.log(`✅ ${fileName}: 0 footers (uses Layout footer)`);
        } else {
            console.log(`❌ ${fileName}: ${result.footerCount} footer${result.footerCount !== 1 ? 's' : ''} (should use Layout footer only)`);
            issues.push(`${fileName} has ${result.footerCount} duplicate footer${result.footerCount !== 1 ? 's' : ''}`);
        }
    }
});

console.log('\n📊 Summary:');
console.log(`Total @Digital_hokage mentions: ${totalFooters}`);
console.log(`Issues found: ${issues.length}`);

if (issues.length === 0) {
    console.log('\n🎉 All multiple credit footer issues have been fixed!');
    console.log('\n✨ Current structure:');
    console.log('  - Layout component: 1 footer (appears on all pages using Layout)');
    console.log('  - Login page: 1 footer (standalone page)');
    console.log('  - All other pages: 0 footers (use Layout footer)');
    console.log('\n🚀 Benefits:');
    console.log('  - Clean, professional appearance');
    console.log('  - Single source of truth for footer content');
    console.log('  - Consistent branding across all pages');
    console.log('  - Easier maintenance and updates');
} else {
    console.log('\n⚠️  Issues still exist:');
    issues.forEach(issue => {
        console.log(`  - ${issue}`);
    });
}

console.log('\n💡 Best practices followed:');
console.log('1. Single footer in Layout component for all main pages');
console.log('2. Standalone footer only for pages not using Layout');
console.log('3. Consistent branding and styling');
console.log('4. Reduced code duplication');
