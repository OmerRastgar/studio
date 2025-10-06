const fetch = require('node-fetch');

async function testLogin() {
  console.log('Testing login API...');
  
  try {
    const response = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@auditace.com',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Login test PASSED');
    } else {
      console.log('❌ Login test FAILED');
    }
  } catch (error) {
    console.error('❌ Login test ERROR:', error.message);
    console.log('Make sure the application is running on http://localhost:9002');
  }
}

testLogin();