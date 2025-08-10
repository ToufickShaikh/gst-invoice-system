const axios = require('axios');

const testLocalAPI = async () => {
  console.log('🧪 Testing Local API Connection...');
  
  try {
    // First, try to create a test user or login with existing credentials
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123'
    };
    
    console.log('1. Attempting to register/login test user...');
    
    let token;
    
    // Try to register first
    try {
      const registerResponse = await axios.post('http://localhost:3000/api/auth/register', testUser);
      console.log('✅ User registered successfully');
      token = registerResponse.data.token;
    } catch (registerError) {
      // If registration fails (user exists), try to login
      console.log('ℹ️ User might exist, trying login...');
      try {
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
          username: testUser.username,
          password: testUser.password
        });
        console.log('✅ User logged in successfully');
        token = loginResponse.data.token;
      } catch (loginError) {
        console.error('❌ Login failed:', loginError.response?.data || loginError.message);
        return;
      }
    }
    
    console.log('2. Testing authenticated API calls...');
    
    // Test items API with authentication
    const itemsResponse = await axios.get('http://localhost:3000/api/items', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Items API working!');
    console.log(`📊 Found ${itemsResponse.data.length} items`);
    
    // Test customers API
    try {
      const customersResponse = await axios.get('http://localhost:3000/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Customers API working!');
      console.log(`👥 Found ${customersResponse.data.length} customers`);
    } catch (error) {
      console.log('⚠️ Customers API not available or different endpoint');
    }
    
    console.log('🎉 Local API is working correctly!');
    console.log('💡 Token for frontend testing:', token);
    console.log('💡 You can save this token in localStorage as "token"');
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.response?.data || error.message);
  }
};

testLocalAPI();
