// Quick Authentication Helper for Browser Console
// Copy and paste this into your browser console when running the app locally

console.log('🔧 Setting up development authentication...');

// Set the token from your local API test
const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTg4NDRhY2Q2YWFiZWNiZjQ3ZjRkMCIsImlhdCI6MTc1NDgyNTgwMiwiZXhwIjoxNzU3NDE3ODAyfQ.pEbfrIUVL0Cggp6d9fjyDDKUPdfkG5i4-oU9Vx5uKW8';

// Set authentication data
localStorage.setItem('token', devToken);
localStorage.setItem('user', JSON.stringify({
  _id: '689884acd6aabecbf47f4d0',
  username: 'testuser',
  email: 'test@example.com'
}));

localStorage.setItem('userProfile', JSON.stringify({
  name: 'Test User',
  email: 'test@example.com',
  role: 'Administrator',
  joinDate: '2025-08-10',
  lastLogin: new Date().toISOString(),
  preferences: {
    theme: 'light',
    language: 'en',
    notifications: true
  }
}));

console.log('✅ Development authentication set!');
console.log('🔄 Refreshing page...');

// Refresh the page to apply changes
window.location.reload();
