// Test script to check if the application builds successfully
const { exec } = require('child_process');
const path = require('path');

console.log('Testing Frontend Build...');

// Test frontend build
exec('npm run build', { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Frontend Build Failed:');
        console.error(error.message);
        console.error('stderr:', stderr);
        return;
    }

    console.log('✅ Frontend Build Successful!');
    console.log(stdout);

    // Test backend
    console.log('\nTesting Backend...');
    exec('node server.js --test', {
        cwd: path.join(process.cwd(), 'backend'),
        timeout: 5000
    }, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Backend Test Issues:');
            console.error(error.message);
        } else {
            console.log('✅ Backend appears functional');
            console.log(stdout);
        }

        console.log('\n🎉 Build test completed!');
    });
});
