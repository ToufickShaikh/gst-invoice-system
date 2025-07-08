const { execSync } = require('child_process');

try {
    console.log('Testing build...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build successful!');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
