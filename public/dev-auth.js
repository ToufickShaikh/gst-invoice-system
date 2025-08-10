// Development Authentication Helper
// Run this in your browser console to set the auth token for local development

const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTg4NDRhY2Q2YWFiZWNiZjQ3ZjRkMCIsImlhdCI6MTc1NDgyNTgwMiwiZXhwIjoxNzU3NDE3ODAyfQ.pEbfrIUVL0Cggp6d9fjyDDKUPdfkG5i4-oU9Vx5uKW8';

// Set token in localStorage
localStorage.setItem('token', DEV_TOKEN);

// Verify token is set
console.log('✅ Development token set in localStorage');
console.log('🔑 Token:', localStorage.getItem('token'));
console.log('🔄 Please refresh the page to use the new token');

// Optional: Auto-refresh the page
// window.location.reload();
