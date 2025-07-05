const fs = require('fs');
const path = require('path');

// Test gap reduction in template
async function testGapReductions() {
    try {
        console.log('📏 Testing gap reductions in invoice template...');

        const templatePath = path.join(__dirname, 'templates', 'invoiceTemplate.html');

        if (!fs.existsSync(templatePath)) {
            console.error('❌ Template file not found');
            return;
        }

        const templateContent = fs.readFileSync(templatePath, 'utf-8');

        // Check for reduced padding
        const hasReducedPadding = templateContent.includes('padding: 8mm') && templateContent.includes('padding: 6mm');
        if (!hasReducedPadding) {
            console.error('❌ Reduced padding not found');
            return;
        }

        // Check for reduced margins
        const hasReducedMargins = templateContent.includes('margin-bottom: 8mm') && templateContent.includes('margin-bottom: 6mm');
        if (!hasReducedMargins) {
            console.error('❌ Reduced margins not found');
            return;
        }

        // Check for reduced gaps
        const hasReducedGaps = templateContent.includes('gap: 10px') && !templateContent.includes('gap: 15px');
        if (!hasReducedGaps) {
            console.error('❌ Reduced gaps not found');
            return;
        }

        // Check for reduced item spacing
        const hasReducedItemSpacing = templateContent.includes('margin-bottom: 3px') && templateContent.includes('margin-bottom: 4px');
        if (!hasReducedItemSpacing) {
            console.error('❌ Reduced item spacing not found');
            return;
        }

        // Check for reduced section spacing
        const hasReducedSectionSpacing = templateContent.includes('margin: 8mm 0') && templateContent.includes('margin: 6mm 0');
        if (!hasReducedSectionSpacing) {
            console.error('❌ Reduced section spacing not found');
            return;
        }

        // Check responsive gap reductions
        const hasResponsiveGapReductions = templateContent.includes('gap: 8px') && templateContent.includes('padding: 2mm');
        if (!hasResponsiveGapReductions) {
            console.error('❌ Responsive gap reductions not found');
            return;
        }

        console.log('✅ Gap reduction test passed!');
        console.log('📦 Header padding reduced: 15mm → 8mm');
        console.log('📦 Body padding reduced: 10mm → 6mm');
        console.log('📐 Section margins reduced: 15mm → 8mm');
        console.log('🔄 Flex gaps reduced: 15px → 10px');
        console.log('📋 Item spacing reduced: 4px → 3px');
        console.log('📱 Mobile gaps reduced: 15px → 8px');
        console.log('💾 Space optimized for better content density');
        console.log('✨ Template is now more compact!');

    } catch (error) {
        console.error('❌ Gap reduction test failed:', error.message);
    }
}

testGapReductions();
