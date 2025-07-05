const fs = require('fs');
const path = require('path');

// Test that the template file exists and has the right structure
async function testTemplate() {
    try {
        const templatePath = path.join(__dirname, 'templates', 'invoiceTemplate.html');

        if (!fs.existsSync(templatePath)) {
            console.error('❌ Template file not found');
            return;
        }

        const templateContent = fs.readFileSync(templatePath, 'utf-8');

        // Check for key template variables
        const requiredVariables = [
            '{{invoiceNumber}}',
            '{{companyName}}',
            '{{customerName}}',
            '{{itemsTable}}',
            '{{taxSummaryTable}}',
            '{{totalAmount}}',
            '{{bankName}}'
        ];

        let missingVariables = [];
        requiredVariables.forEach(variable => {
            if (!templateContent.includes(variable)) {
                missingVariables.push(variable);
            }
        });

        if (missingVariables.length > 0) {
            console.error('❌ Missing template variables:', missingVariables);
            return;
        }

        // Check that emojis have been removed
        const emojiPattern = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
        const hasEmojis = emojiPattern.test(templateContent);

        if (hasEmojis) {
            console.error('❌ Template still contains emojis');
            return;
        }

        // Check for classic professional styling (no gradients)
        const hasGradients = templateContent.includes('linear-gradient') || templateContent.includes('radial-gradient');

        if (hasGradients) {
            console.error('❌ Template still contains modern gradients');
            return;
        }

        // Check for professional Tally-style elements
        const hasTableStyling = templateContent.includes('border-collapse: collapse');
        const hasProfessionalColors = templateContent.includes('#34495e') || templateContent.includes('#2c3e50');

        if (!hasTableStyling || !hasProfessionalColors) {
            console.error('❌ Template missing professional Tally-style elements');
            return;
        }

        console.log('✅ Template validation passed!');
        console.log('✅ All required variables present');
        console.log('✅ Emojis removed');
        console.log('✅ Modern gradients removed');
        console.log('✅ Professional Tally-style theme applied');
        console.log('📄 Template is ready for production use');

    } catch (error) {
        console.error('❌ Template test failed:', error.message);
    }
}

testTemplate();
