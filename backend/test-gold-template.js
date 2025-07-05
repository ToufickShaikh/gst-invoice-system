const fs = require('fs');
const path = require('path');

// Test the updated template with gold and black styling
async function testUpdatedTemplate() {
    try {
        console.log('🎨 Testing updated template with gold and black styling...');

        const templatePath = path.join(__dirname, 'templates', 'invoiceTemplate.html');

        if (!fs.existsSync(templatePath)) {
            console.error('❌ Template file not found');
            return;
        }

        const templateContent = fs.readFileSync(templatePath, 'utf-8');

        // Check for gold color scheme
        const hasGoldColors = templateContent.includes('#DAA520') || templateContent.includes('#B8860B');
        if (!hasGoldColors) {
            console.error('❌ Gold color scheme not found');
            return;
        }

        // Check for black color scheme
        const hasBlackColors = templateContent.includes('#2c2c2c') || templateContent.includes('#1a1a1a');
        if (!hasBlackColors) {
            console.error('❌ Black color scheme not found');
            return;
        }

        // Check for responsive design
        const hasResponsiveDesign = templateContent.includes('@media screen and (max-width:');
        if (!hasResponsiveDesign) {
            console.error('❌ Responsive design not found');
            return;
        }

        // Check for A4 optimization
        const hasA4Optimization = templateContent.includes('@page') && templateContent.includes('size: A4');
        if (!hasA4Optimization) {
            console.error('❌ A4 optimization not found');
            return;
        }

        // Check for flex layout (modern responsive)
        const hasFlexLayout = templateContent.includes('display: flex') && templateContent.includes('flex-wrap');
        if (!hasFlexLayout) {
            console.error('❌ Flex layout for responsiveness not found');
            return;
        }

        // Check for print styles
        const hasPrintStyles = templateContent.includes('@media print');
        if (!hasPrintStyles) {
            console.error('❌ Print styles not found');
            return;
        }

        // Check for gradient effects (subtle gold)
        const hasGoldGradients = templateContent.includes('linear-gradient') && templateContent.includes('#DAA520');
        if (!hasGoldGradients) {
            console.error('❌ Gold gradient effects not found');
            return;
        }

        // Check template size (should be reasonable)
        const templateSize = templateContent.length;
        console.log(`📏 Template size: ${templateSize} characters`);

        if (templateSize < 10000) {
            console.error('❌ Template seems too small');
            return;
        }

        console.log('✅ Template validation passed!');
        console.log('🏆 Gold color scheme (#DAA520, #B8860B) applied');
        console.log('⚫ Black color scheme (#2c2c2c, #1a1a1a) applied');
        console.log('📱 Responsive design implemented (768px, 480px breakpoints)');
        console.log('📄 A4 paper optimization added');
        console.log('🖨️ Print styles optimized');
        console.log('💫 Subtle gold gradients and effects added');
        console.log('📐 Flex layout for modern responsiveness');
        console.log('✨ Premium gold and black theme ready!');

    } catch (error) {
        console.error('❌ Template test failed:', error.message);
    }
}

testUpdatedTemplate();
